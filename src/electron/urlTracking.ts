import log from 'electron-log';
import http from 'http';
import { URL } from 'url';
import { CategoryManager } from './categoryManager';

export interface UrlData {
  url: string;
  eventType: string;
  timestamp: string;
  domain?: string;
  isValidUrl?: boolean;
}

export interface BrowserUrlInfo {
  domain: string;
  fullUrl: string;
  isValidUrl: boolean;
  timestamp: string;
  eventType: string;
}

class UrlTrackingService {
  private static instance: UrlTrackingService;
  private latestUrlData: UrlData | null = null;
  private readonly API_URL = 'http://localhost:8887/latest-url';
  private readonly POLLING_INTERVAL = 2000; // 2 seconds
  private pollingTimer: NodeJS.Timeout | null = null;
  private isPolling = false;

  private constructor() {
    log.info('UrlTrackingService: Initializing URL tracking service');
  }

  public static getInstance(): UrlTrackingService {
    if (!UrlTrackingService.instance) {
      UrlTrackingService.instance = new UrlTrackingService();
    }
    return UrlTrackingService.instance;
  }

  /**
   * Start polling the browser extension API for URL updates
   */
  public startPolling(): void {
    if (this.isPolling) {
      log.info('UrlTrackingService: Already polling, skipping...');
      return;
    }

    log.info('UrlTrackingService: Starting URL polling');
    this.isPolling = true;
    this.pollForUrls();
  }

  /**
   * Stop polling the browser extension API
   */
  public stopPolling(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
    log.info('UrlTrackingService: Stopped URL polling');
  }

  /**
   * Get the latest URL data from the browser extension
   */
  private async pollForUrls(): Promise<void> {
    if (!this.isPolling) return;

    try {
      const urlData = await this.fetchLatestUrl();
      if (urlData) {
        this.latestUrlData = urlData;
        log.info('UrlTrackingService: Updated latest URL data:', {
          domain: urlData.domain,
          eventType: urlData.eventType
        });
      }
    } catch (error) {
      log.error('UrlTrackingService: Error fetching URL data:', error);
    }

    // Schedule next poll
    this.pollingTimer = setTimeout(() => {
      this.pollForUrls();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Fetch the latest URL from the browser extension API
   */
  private async fetchLatestUrl(): Promise<UrlData | null> {
    return new Promise((resolve, reject) => {
      const request = http.get(this.API_URL, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              log.warn(`UrlTrackingService: API returned status ${response.statusCode}`);
              resolve(null);
              return;
            }

            const urlData = JSON.parse(data) as UrlData;
            const processedData = this.processUrlData(urlData);
            resolve(processedData);
          } catch (error) {
            log.error('UrlTrackingService: Error parsing URL data:', error);
            resolve(null);
          }
        });
      });

      request.on('error', (error) => {
        // Don't log as error since the extension might not be running
        log.debug('UrlTrackingService: Failed to connect to browser extension:', error.message);
        resolve(null);
      });

      request.setTimeout(5000, () => {
        request.destroy();
        log.debug('UrlTrackingService: Request timeout');
        resolve(null);
      });
    });
  }

  /**
   * Process and enhance URL data with domain extraction
   */
  private processUrlData(urlData: UrlData): UrlData {
    try {
      const domain = this.extractDomain(urlData.url);
      const isValidUrl = this.isValidUrl(urlData.url);

      return {
        ...urlData,
        domain,
        isValidUrl
      };
    } catch (error) {
      log.error('UrlTrackingService: Error processing URL data:', error);
      return {
        ...urlData,
        domain: 'unknown',
        isValidUrl: false
      };
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    if (!url || url.trim() === '') {
      return 'no-url';
    }

    try {
      // Handle common URL formats
      let processedUrl = url.trim();
      
      // If it doesn't start with http/https, try to add it
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl;
      }

      const parsedUrl = new URL(processedUrl);
      let domain = parsedUrl.hostname.toLowerCase();

      // Remove www. prefix
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }

      return domain;
    } catch (error) {
      log.debug('UrlTrackingService: Failed to parse URL:', url, error);
      return 'invalid-url';
    }
  }

  /**
   * Check if a URL is valid and should be tracked
   */
  private isValidUrl(url: string): boolean {
    if (!url || url.trim() === '') {
      return false;
    }

    try {
      const domain = this.extractDomain(url);
      
      // Filter out internal browser pages and extensions
      const excludedDomains = [
        'chrome-extension',
        'chrome-search',
        'chrome-error',
        'chrome-devtools',
        'edge-extension',
        'firefox-extension',
        'about:',
        'chrome:',
        'edge:',
        'firefox:',
        'moz-extension',
        'safari-extension',
        'invalid-url',
        'no-url'
      ];

      return !excludedDomains.some(excluded => domain.includes(excluded));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current URL information for a browser window
   */
  public getBrowserUrlInfo(browserName: string): BrowserUrlInfo | null {
    if (!this.latestUrlData) {
      log.debug('UrlTrackingService: No latest URL data available');
      return null;
    }

    const domain = this.latestUrlData.domain;
    const isValidUrl = this.latestUrlData.isValidUrl;

    log.debug('UrlTrackingService: URL info for browser:', {
      browserName,
      domain,
      isValidUrl,
      fullUrl: this.latestUrlData.url
    });

    // If no valid URL or domain, treat as general browsing
    if (!isValidUrl || !domain || domain === 'no-url' || domain === 'invalid-url') {
      return {
        domain: 'browsing',
        fullUrl: this.latestUrlData.url || '',
        isValidUrl: false,
        timestamp: this.latestUrlData.timestamp,
        eventType: this.latestUrlData.eventType
      };
    }

    return {
      domain,
      fullUrl: this.latestUrlData.url,
      isValidUrl: true,
      timestamp: this.latestUrlData.timestamp,
      eventType: this.latestUrlData.eventType
    };
  }

  /**
   * Get enhanced window title for browser applications
   */
  public getEnhancedWindowTitle(originalTitle: string): string {
    const urlInfo = this.getBrowserUrlInfo(originalTitle);
    
    if (!urlInfo) {
      log.debug('UrlTrackingService: No URL info available for:', originalTitle);
      return originalTitle;
    }

    // If it's a valid URL with a domain, append domain to the browser name
    if (urlInfo.isValidUrl && urlInfo.domain && urlInfo.domain !== 'browsing') {
      const enhanced = `${originalTitle} - ${urlInfo.domain}`;
      log.info('UrlTrackingService: Enhanced title:', { original: originalTitle, enhanced, domain: urlInfo.domain });
      return enhanced;
    }

    // If it's general browsing, keep original title
    log.info('UrlTrackingService: Keeping original title for general browsing:', originalTitle);
    return originalTitle;
  }

  /**
   * Check if a window title represents a browser
   */
  public isBrowserWindow(windowTitle: string): boolean {
    const browserNames = [
      'chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi',
      'tor', 'zen', 'waterfox', 'pale moon', 'seamonkey', 'internet explorer',
      'google chrome', 'mozilla firefox', 'microsoft edge'
    ];

    // Extract the base browser name if it's an enhanced title (e.g., "Chrome - youtube.com" -> "Chrome")
    let baseBrowserName = windowTitle;
    const browserDomainMatch = windowTitle.match(/^(.+?)\s*-\s*(.+)$/);
    if (browserDomainMatch) {
      baseBrowserName = browserDomainMatch[1].trim();
    }

    const title = baseBrowserName.toLowerCase();
    const isBrowser = browserNames.some(browser => title.includes(browser));
    
    log.debug('UrlTrackingService: Browser detection for "' + windowTitle + '" (base: "' + baseBrowserName + '"):', isBrowser);
    return isBrowser;
  }

  /**
   * Get category suggestions based on domain using CategoryManager
   */
  public getCategorySuggestionForDomain(domain: string): string | null {
    if (!domain || domain === 'browsing') {
      return 'browsers';
    }

    try {
      const categoryManager = CategoryManager.getInstance();
      
      // Use the domain as the app name for categorization
      // This allows the CategoryManager to match domains against keywords
      const categoryId = categoryManager.categorizeItem(domain);
      
      // If CategoryManager returned 'miscellaneous', check if it's a browser-related domain
      if (categoryId === 'miscellaneous') {
        // For unknown domains, return 'miscellaneous' as requested
        return 'miscellaneous';
      }
      
      return categoryId;
    } catch (error) {
      log.error('UrlTrackingService: Error getting category suggestion for domain:', error);
      return 'miscellaneous';
    }
  }
}

export default UrlTrackingService;
