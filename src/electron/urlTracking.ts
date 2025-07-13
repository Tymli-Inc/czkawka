// Import logging utility for debugging and monitoring
import log from 'electron-log';
// Import HTTP module for making requests to browser extension API
import http from 'http';
// Import URL parsing utilities for domain extraction
import { URL } from 'url';
// Import CategoryManager for intelligent domain categorization
import { CategoryManager } from './categoryManager';

/**
 * Interface defining the structure of URL data received from browser extension
 */
export interface UrlData {
  url: string;         // The full URL being tracked
  eventType: string;   // Type of event (e.g., 'navigation', 'focus')
  timestamp: string;   // When the event occurred
  domain?: string;     // Extracted domain name (added during processing)
  isValidUrl?: boolean; // Whether the URL is valid for tracking (added during processing)
}

/**
 * Interface for browser URL information with enhanced metadata
 */
export interface BrowserUrlInfo {
  domain: string;      // Extracted domain name
  fullUrl: string;     // Complete URL string
  isValidUrl: boolean; // Whether URL is valid for tracking
  timestamp: string;   // When the URL was captured
  eventType: string;   // Type of browser event
}

/**
 * UrlTrackingService - Service for tracking and managing browser URL data
 * 
 * This service provides comprehensive URL tracking capabilities by:
 * - Communicating with a browser extension API to get real-time URL data
 * - Processing and enhancing URL data with domain extraction and validation
 * - Providing intelligent categorization of domains using CategoryManager
 * - Enhancing window titles with domain information for better app tracking
 * - Filtering out internal browser pages and invalid URLs
 * 
 * Architecture:
 * - Singleton pattern ensures consistent state across the application
 * - Polling mechanism for real-time URL updates
 * - Robust error handling and timeout management
 * - Integration with CategoryManager for smart domain categorization
 */
class UrlTrackingService {
  // Singleton instance
  private static instance: UrlTrackingService;
  
  // Latest URL data received from the browser extension
  private latestUrlData: UrlData | null = null;
  
  // API endpoint for the browser extension
  private readonly API_URL = 'http://localhost:8887/latest-url';
  
  // How often to poll for URL updates (2 seconds)
  private readonly POLLING_INTERVAL = 2000;
  
  // Timer for polling mechanism
  private pollingTimer: NodeJS.Timeout | null = null;
  
  // Flag to track if polling is currently active
  private isPolling = false;

  /**
   * Private constructor implementing singleton pattern
   */
  private constructor() {
    log.info('UrlTrackingService: Initializing URL tracking service');
  }

  /**
   * Singleton pattern implementation
   * Returns the single instance of UrlTrackingService, creating it if needed
   */
  public static getInstance(): UrlTrackingService {
    if (!UrlTrackingService.instance) {
      UrlTrackingService.instance = new UrlTrackingService();
    }
    return UrlTrackingService.instance;
  }

  /**
   * Start the URL polling mechanism
   * 
   * This method begins continuous polling of the browser extension API
   * to get real-time URL updates. The polling runs at regular intervals
   * defined by POLLING_INTERVAL.
   * 
   * Safety features:
   * - Prevents multiple polling instances from running simultaneously
   * - Logs the start of polling for debugging
   * - Immediately begins the first poll
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
   * Stop the URL polling mechanism
   * 
   * This method cleanly stops the polling process by:
   * - Clearing any pending timeout
   * - Setting the polling flag to false
   * - Logging the stop action for debugging
   * 
   * Safe to call multiple times - won't cause errors if already stopped
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
   * Core polling logic for fetching URL updates
   * 
   * This method handles the continuous polling cycle:
   * 1. Checks if polling should continue (early exit if stopped)
   * 2. Fetches the latest URL data from the browser extension
   * 3. Updates internal state if new data is available
   * 4. Schedules the next poll after the specified interval
   * 
   * Error handling:
   * - Catches and logs errors without stopping the polling cycle
   * - Continues polling even if individual requests fail
   * - Uses debug-level logging for connection failures (extension might not be running)
   */
  private async pollForUrls(): Promise<void> {
    if (!this.isPolling) return;

    try {
      // Attempt to fetch the latest URL data
      const urlData = await this.fetchLatestUrl();
      if (urlData) {
        // Update our internal state with the new data
        this.latestUrlData = urlData;
        log.info('UrlTrackingService: Updated latest URL data:', {
          domain: urlData.domain,
          eventType: urlData.eventType
        });
      }
    } catch (error) {
      log.error('UrlTrackingService: Error fetching URL data:', error);
    }

    // Schedule the next poll (continues the polling cycle)
    this.pollingTimer = setTimeout(() => {
      this.pollForUrls();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Fetch the latest URL data from the browser extension API
   * 
   * This method makes an HTTP GET request to the browser extension's local API
   * to retrieve the most recent URL data. It includes comprehensive error handling
   * and timeout management.
   * 
   * Features:
   * - 5-second timeout to prevent hanging requests
   * - Graceful handling of connection failures (extension might not be running)
   * - JSON parsing with error handling
   * - Status code validation
   * - Processes raw URL data through processUrlData() for enhancement
   * 
   * @returns {Promise<UrlData | null>} Processed URL data or null if unavailable
   */
  private async fetchLatestUrl(): Promise<UrlData | null> {
    return new Promise((resolve, reject) => {
      // Create HTTP GET request to the browser extension API
      const request = http.get(this.API_URL, (response) => {
        let data = '';

        // Collect response data chunks
        response.on('data', (chunk) => {
          data += chunk;
        });

        // Process complete response
        response.on('end', () => {
          try {
            // Validate HTTP status code
            if (response.statusCode !== 200) {
              log.warn(`UrlTrackingService: API returned status ${response.statusCode}`);
              resolve(null);
              return;
            }

            // Parse JSON response and enhance with domain/validation data
            const urlData = JSON.parse(data) as UrlData;
            const processedData = this.processUrlData(urlData);
            resolve(processedData);
          } catch (error) {
            log.error('UrlTrackingService: Error parsing URL data:', error);
            resolve(null);
          }
        });
      });

      // Handle connection errors (extension might not be running)
      request.on('error', (error) => {
        // Use debug level since this is expected when extension isn't running
        log.debug('UrlTrackingService: Failed to connect to browser extension:', error.message);
        resolve(null);
      });

      // Set timeout to prevent hanging requests
      request.setTimeout(5000, () => {
        request.destroy();
        log.debug('UrlTrackingService: Request timeout');
        resolve(null);
      });
    });
  }

  /**
   * Process and enhance raw URL data with domain extraction and validation
   * 
   * This method takes raw URL data from the browser extension and enhances it with:
   * 1. Domain extraction using extractDomain()
   * 2. URL validation using isValidUrl()
   * 3. Error handling for malformed data
   * 
   * The enhanced data is more useful for categorization and tracking purposes.
   * 
   * @param {UrlData} urlData - Raw URL data from browser extension
   * @returns {UrlData} Enhanced URL data with domain and validation info
   */
  private processUrlData(urlData: UrlData): UrlData {
    try {
      // Extract clean domain name from the URL
      const domain = this.extractDomain(urlData.url);
      
      // Determine if this URL should be tracked
      const isValidUrl = this.isValidUrl(urlData.url);

      // Return enhanced data with original data preserved
      return {
        ...urlData,
        domain,
        isValidUrl
      };
    } catch (error) {
      // If processing fails, return safe defaults
      log.error('UrlTrackingService: Error processing URL data:', error);
      return {
        ...urlData,
        domain: 'unknown',
        isValidUrl: false
      };
    }
  }

  /**
   * Extract clean domain name from a URL string
   * 
   * This method performs robust domain extraction with multiple fallback strategies:
   * 1. Handles missing protocols by adding https://
   * 2. Uses URL constructor for proper parsing
   * 3. Removes 'www.' prefix for consistency
   * 4. Converts to lowercase for standardization
   * 5. Handles edge cases like empty/invalid URLs
   * 
   * Return values:
   * - 'no-url': when URL is empty or null
   * - 'invalid-url': when URL cannot be parsed
   * - Clean domain name: for valid URLs
   * 
   * Examples:
   * - "https://www.google.com/search" → "google.com"
   * - "youtube.com" → "youtube.com"
   * - "" → "no-url"
   * - "invalid" → "invalid-url"
   * 
   * @param {string} url - The URL to extract domain from
   * @returns {string} Extracted domain name or error indicator
   */
  private extractDomain(url: string): string {
    // Handle empty or null URLs
    if (!url || url.trim() === '') {
      return 'no-url';
    }

    try {
      // Prepare URL for parsing
      let processedUrl = url.trim();
      
      // Add protocol if missing (required for URL constructor)
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl;
      }

      // Parse URL using built-in URL constructor
      const parsedUrl = new URL(processedUrl);
      let domain = parsedUrl.hostname.toLowerCase();

      // Remove common 'www.' prefix for consistency
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }

      return domain;
    } catch (error) {
      // Log at debug level since this is expected for malformed URLs
      log.debug('UrlTrackingService: Failed to parse URL:', url, error);
      return 'invalid-url';
    }
  }

  /**
   * Determine if a URL is valid and should be tracked
   * 
   * This method filters out URLs that shouldn't be tracked, such as:
   * - Browser internal pages (chrome://, about:, etc.)
   * - Extension pages (chrome-extension://, etc.)
   * - Error pages and developer tools
   * - Empty or malformed URLs
   * 
   * The filtering helps ensure that only meaningful web browsing activity
   * is tracked and categorized.
   * 
   * @param {string} url - The URL to validate
   * @returns {boolean} True if URL should be tracked, false otherwise
   */
  private isValidUrl(url: string): boolean {
    // Reject empty or null URLs
    if (!url || url.trim() === '') {
      return false;
    }

    try {
      // Extract domain for filtering
      const domain = this.extractDomain(url);
      
      // List of domain patterns that should be excluded from tracking
      const excludedDomains = [
        'chrome-extension',    // Chrome extensions
        'chrome-search',       // Chrome search pages
        'chrome-error',        // Chrome error pages
        'chrome-devtools',     // Chrome developer tools
        'edge-extension',      // Edge extensions
        'firefox-extension',   // Firefox extensions
        'about:',              // Browser about pages
        'chrome:',             // Chrome internal pages
        'edge:',               // Edge internal pages
        'firefox:',            // Firefox internal pages
        'moz-extension',       // Mozilla extensions
        'safari-extension',    // Safari extensions
        'invalid-url',         // Our marker for unparseable URLs
        'no-url'               // Our marker for empty URLs
      ];

      // Check if domain contains any excluded patterns
      return !excludedDomains.some(excluded => domain.includes(excluded));
    } catch (error) {
      // If anything goes wrong, assume invalid
      return false;
    }
  }

  /**
   * Get current URL information for a browser window
   * 
   * This method provides structured information about the current URL
   * being displayed in a browser window. It handles various edge cases
   * and provides consistent data structure.
   * 
   * Behavior:
   * - Returns null if no URL data is available
   * - Returns 'browsing' domain for invalid/empty URLs
   * - Returns structured data for valid URLs
   * - Includes metadata like timestamp and event type
   * 
   * This is useful for:
   * - Determining what content the user is viewing
   * - Categorizing browser activity
   * - Enhancing window titles with domain information
   * 
   * @param {string} browserName - Name of the browser (for logging)
   * @returns {BrowserUrlInfo | null} URL information or null if unavailable
   */
  public getBrowserUrlInfo(browserName: string): BrowserUrlInfo | null {
    // Return null if no URL data has been received yet
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

    // Handle invalid URLs or missing domains - treat as general browsing
    if (!isValidUrl || !domain || domain === 'no-url' || domain === 'invalid-url') {
      return {
        domain: 'browsing',           // Generic browsing indicator
        fullUrl: this.latestUrlData.url || '',
        isValidUrl: false,
        timestamp: this.latestUrlData.timestamp,
        eventType: this.latestUrlData.eventType
      };
    }

    // Return structured data for valid URLs
    return {
      domain,
      fullUrl: this.latestUrlData.url,
      isValidUrl: true,
      timestamp: this.latestUrlData.timestamp,
      eventType: this.latestUrlData.eventType
    };
  }

  /**
   * Enhance browser window titles with domain information
   * 
   * This method creates more descriptive window titles by appending
   * the current domain to the browser name. This provides better
   * context for activity tracking and categorization.
   * 
   * Enhancement logic:
   * - For valid URLs: "Chrome" becomes "Chrome - youtube.com"
   * - For general browsing: keeps original title
   * - For no URL data: keeps original title
   * 
   * Benefits:
   * - Provides more context in activity logs
   * - Enables better categorization of browser activity
   * - Helps users understand what content they were viewing
   * 
   * @param {string} originalTitle - Original browser window title
   * @returns {string} Enhanced title with domain or original title
   */
  public getEnhancedWindowTitle(originalTitle: string): string {
    // Get URL information for this browser
    const urlInfo = this.getBrowserUrlInfo(originalTitle);
    
    // If no URL information is available, keep original title
    if (!urlInfo) {
      log.debug('UrlTrackingService: No URL info available for:', originalTitle);
      return originalTitle;
    }

    // For valid URLs with domains, create enhanced title
    if (urlInfo.isValidUrl && urlInfo.domain && urlInfo.domain !== 'browsing') {
      const enhanced = `${originalTitle} - ${urlInfo.domain}`;
      log.info('UrlTrackingService: Enhanced title:', { 
        original: originalTitle, 
        enhanced, 
        domain: urlInfo.domain 
      });
      return enhanced;
    }

    // For general browsing or invalid URLs, keep original title
    log.info('UrlTrackingService: Keeping original title for general browsing:', originalTitle);
    return originalTitle;
  }

  /**
   * Detect if a window title represents a browser application
   * 
   * This method identifies browser applications by matching window titles
   * against a comprehensive list of known browser names. It supports both
   * original titles and enhanced titles (with domain information).
   * 
   * Supported browsers:
   * - Chrome, Firefox, Safari, Edge, Brave, Opera, Vivaldi
   * - Tor Browser, Zen Browser, Waterfox, Pale Moon, SeaMonkey
   * - Internet Explorer
   * - Full names like "Google Chrome", "Mozilla Firefox", etc.
   * 
   * Enhanced title handling:
   * - "Chrome - youtube.com" → detects "Chrome" as browser
   * - "Mozilla Firefox - reddit.com" → detects "Mozilla Firefox" as browser
   * 
   * @param {string} windowTitle - Window title to check
   * @returns {boolean} True if the window belongs to a browser application
   */
  public isBrowserWindow(windowTitle: string): boolean {
    // Comprehensive list of browser names to match against
    const browserNames = [
      'chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi',
      'tor', 'zen', 'waterfox', 'pale moon', 'seamonkey', 'internet explorer',
      'google chrome', 'mozilla firefox', 'microsoft edge',"google chrome"
    ];

    // Extract base browser name if it's an enhanced title
    // Example: "Chrome - youtube.com" → "Chrome"
    let baseBrowserName = windowTitle;
    const browserDomainMatch = windowTitle.match(/^(.+?)\s*-\s*(.+)$/);
    if (browserDomainMatch) {
      baseBrowserName = browserDomainMatch[1].trim();
    }

    // Check if the base name matches any known browser
    const title = baseBrowserName.toLowerCase();
    const isBrowser = browserNames.some(browser => title.includes(browser));
    
    log.debug('UrlTrackingService: Browser detection for "' + windowTitle + '" (base: "' + baseBrowserName + '"):', isBrowser);
    return isBrowser;
  }

  /**
   * Get intelligent category suggestions for domains using CategoryManager
   * 
   * This method provides smart categorization suggestions for domains by
   * leveraging the CategoryManager's categorization algorithm. It serves
   * as a bridge between URL tracking and the broader categorization system.
   * 
   * Categorization process:
   * 1. Handles special cases (empty domains, 'browsing' → 'browsers')
   * 2. Uses CategoryManager to apply the full categorization algorithm
   * 3. Applies the same priority system as app categorization:
   *    - User overrides
   *    - Keyword matching
   *    - Custom categories
   *    - Fallback to 'miscellaneous'
   * 
   * This enables consistent categorization between applications and web domains.
   * 
   * @param {string} domain - Domain name to categorize
   * @returns {string | null} Suggested category ID or null if error
   */
  public getCategorySuggestionForDomain(domain: string, windowTitle?: string): string | null {
    // Handle empty domains or general browsing
    if ((!domain || domain === 'browsing') && !windowTitle) {
      return 'browsers';
    }

    try {
      const categoryManager = CategoryManager.getInstance();
      
      // 1. Try domain base (e.g., 'youtube' from 'youtube.com') - prioritize this
      if (domain && domain !== 'browsing') {
        const base = domain.split('.')[0];
        let categoryId = categoryManager.categorizeItem(base, base, true);
        if (categoryId !== 'miscellaneous') {
          log.debug(`UrlTrackingService: Domain base "${base}" categorized as "${categoryId}"`);
          return categoryId;
        }
        categoryId = categoryManager.categorizeItem(domain, domain, true);
        if (categoryId !== 'miscellaneous') {
          log.debug(`UrlTrackingService: Full domain "${domain}" categorized as "${categoryId}"`);
          return categoryId;
        }
      }
      
      // 2. Fallback: Try extracting a keyword from the window title (after the dash)
      if (windowTitle) {
        // Extract the part after the dash (e.g., 'youtube.com' from 'Google Chrome - youtube.com')
        let extracted = windowTitle;
        const dashIdx = windowTitle.indexOf(' - ');
        if (dashIdx > 0 && dashIdx + 3 < windowTitle.length) {
          extracted = windowTitle.substring(dashIdx + 3).trim();
        } else if (dashIdx > 0) {
          extracted = windowTitle.substring(0, dashIdx).trim();
        }
        
        // Try the extracted part as a domain
        const extractedBase = extracted.split('.')[0];
        let categoryId = categoryManager.categorizeItem(extractedBase, extractedBase, true);
        if (categoryId !== 'miscellaneous') {
          log.debug(`UrlTrackingService: Window title extracted base "${extractedBase}" categorized as "${categoryId}"`);
          return categoryId;
        }
        
        categoryId = categoryManager.categorizeItem(extracted, extracted, true);
        if (categoryId !== 'miscellaneous') {
          log.debug(`UrlTrackingService: Window title extracted "${extracted}" categorized as "${categoryId}"`);
          return categoryId;
        }
      }
      
      log.debug(`UrlTrackingService: No category found for domain "${domain}" and window title "${windowTitle}"`);
      return 'miscellaneous';
    } catch (error) {
      log.error('UrlTrackingService: Error getting category suggestion for domain:', error);
      return 'miscellaneous';
    }
  }
}

// Export the UrlTrackingService class as the default export
// This allows other modules to import and use the service easily
export default UrlTrackingService;
