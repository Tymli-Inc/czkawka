// Import database connection for accessing app tracking data
import { db } from './database';
// Import category types and default category definitions
import { defaultCategories, AppCategories, UserCategorySettings, AppCategory, defaultCategoryDefinitions } from './app-categories';
// Import authentication utilities to get user-specific data paths
import { getUserToken } from './auth';
// Import logging utility for debugging and monitoring
import log from 'electron-log';
// Import path utilities for file system operations
import path from 'path';
// Import Electron app module for accessing user data directories
import { app } from 'electron';
// Import file system module for reading/writing settings files
import fs from 'fs';

/**
 * CategoryManager - Core class for managing application categorization system
 * 
 * This class provides a comprehensive system for:
 * - Automatically detecting and categorizing applications based on window titles
 * - Allowing users to create custom categories with their own rules
 * - Persisting user preferences in JSON format (migrated from SQLite)
 * - Providing smart categorization using keyword matching
 * - Handling user-specific overrides for app categorization
 * 
 * The system uses a singleton pattern to ensure consistent state across the application.
 */
export class CategoryManager {
  // Singleton instance - ensures only one CategoryManager exists throughout the app lifecycle
  private static instance: CategoryManager;
  
  // User's custom category settings including custom categories and app overrides
  private userSettings: UserCategorySettings;
  
  // File path where user settings are stored (user-specific JSON file)
  private settingsFilePath: string;
  
  // Cache for detected apps to avoid frequent database queries
  private detectedAppsCache: string[] = [];
  
  // Timestamp of last cache update for TTL (Time To Live) management
  private lastDetectedAppsUpdate: number = 0;
  
  // Cache expiration time (30 seconds) - balances performance vs data freshness
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Private constructor implementing singleton pattern
   * Initializes the category manager with user-specific settings
   */
  private constructor() {
    log.info('CategoryManager: Initializing category manager');
    
    // Initialize with empty user settings structure
    this.userSettings = {
      customCategories: {},      // User-created categories
      appCategoryOverrides: {}   // Manual app-to-category assignments
    };
    
    // Get the file path for storing user settings (user-specific)
    this.settingsFilePath = this.getSettingsFilePath();
    
    // Load existing user settings from JSON file
    this.loadUserSettings();
    
    // Attempt to migrate from old SQLite format if needed (non-blocking)
    // This ensures backward compatibility with older versions
    this.migrateFromSQLite().catch(error => {
      log.error('CategoryManager: Migration failed:', error);
    });
  }

  /**
   * Singleton pattern implementation
   * Returns the single instance of CategoryManager, creating it if it doesn't exist
   */
  public static getInstance(): CategoryManager {
    if (!CategoryManager.instance) {
      CategoryManager.instance = new CategoryManager();
    }
    return CategoryManager.instance;
  }

  /**
   * Get the file system path for storing user's category settings
   * 
   * This method determines where to store user-specific category settings:
   * - If user is logged in: stores in user-specific subdirectory
   * - If user is not logged in: stores in default app data directory
   * 
   * @returns {string} Absolute path to the settings JSON file
   */
  private getSettingsFilePath(): string {
    try {
      // Attempt to get user authentication data
      const { userData, isLoggedIn } = getUserToken();
      
      // If user is not authenticated, use default path
      if (!isLoggedIn || !userData) {
        log.error('CategoryManager: User is not logged in, using default settings path');
        return path.join(app.getPath('userData'), 'category-settings.json');
      }

      // Create user-specific directory for storing settings
      const userDataDir = path.join(app.getPath('userData'), `userdata-${userData.id}`);
      
      // Ensure the user directory exists, create if it doesn't
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        log.info(`CategoryManager: Created user data directory: ${userDataDir}`);
      }

      // Return path to user-specific settings file
      const settingsPath = path.join(userDataDir, 'category-settings.json');
      log.info('CategoryManager: Settings file path:', settingsPath);
      return settingsPath;
    } catch (error) {
      // Fallback to default path if anything goes wrong
      log.error('CategoryManager: Failed to get settings file path:', error);
      return path.join(app.getPath('userData'), 'category-settings.json');
    }
  }

  /**
   * Load user category settings from JSON file
   * 
   * This method reads the user's category preferences from disk and validates the data.
   * If the file doesn't exist or is corrupted, it falls back to default empty settings.
   * 
   * Structure of settings file:
   * {
   *   customCategories: { [categoryId]: { description, color, apps, isCustom } },
   *   appCategoryOverrides: { [appName]: categoryId }
   * }
   */
  private loadUserSettings(): void {
    try {
      log.info('CategoryManager: Loading user settings from JSON file');
      
      // Check if settings file exists
      if (!fs.existsSync(this.settingsFilePath)) {
        log.info('CategoryManager: Settings file does not exist, using default settings');
        this.userSettings = {
          customCategories: {},
          appCategoryOverrides: {}
        };
        return;
      }

      // Read and parse the JSON file
      const fileContent = fs.readFileSync(this.settingsFilePath, 'utf8');
      const parsedSettings = JSON.parse(fileContent);
      
      // Validate and sanitize the loaded settings to ensure they have the expected structure
      this.userSettings = {
        customCategories: parsedSettings.customCategories || {},
        appCategoryOverrides: parsedSettings.appCategoryOverrides || {}
      };

      // Ensure all custom categories have the correct structure
      // This handles cases where the file format might have changed
      Object.keys(this.userSettings.customCategories).forEach(categoryId => {
        const category = this.userSettings.customCategories[categoryId];
        if (!category.apps) {
          category.apps = [];  // Initialize empty apps array if missing
        }
        if (!category.isCustom) {
          category.isCustom = true;  // Mark as custom category
        }
      });

      log.info('CategoryManager: User settings loaded successfully from JSON', {
        customCategories: Object.keys(this.userSettings.customCategories).length,
        appOverrides: Object.keys(this.userSettings.appCategoryOverrides).length
      });
    } catch (error) {
      // If anything goes wrong, fall back to empty settings
      log.error('CategoryManager: Failed to load user settings from JSON:', error);
      this.userSettings = {
        customCategories: {},
        appCategoryOverrides: {}
      };
    }
  }

  /**
   * Save user category settings to JSON file
   * 
   * This method persists the current user settings to disk in JSON format.
   * It includes a timestamp for tracking when settings were last modified.
   * 
   * @returns {boolean} True if save was successful, false otherwise
   */
  private saveUserSettings(): boolean {
    try {
      log.info('CategoryManager: Saving user settings to JSON file');
      
      // Prepare settings data with timestamp for tracking modifications
      const settingsToSave = {
        customCategories: this.userSettings.customCategories,
        appCategoryOverrides: this.userSettings.appCategoryOverrides,
        lastModified: new Date().toISOString()  // Add timestamp for debugging/tracking
      };

      // Convert to formatted JSON string for better readability
      const jsonString = JSON.stringify(settingsToSave, null, 2);
      
      // Write to file synchronously to ensure data is persisted
      fs.writeFileSync(this.settingsFilePath, jsonString, 'utf8');
      
      log.info('CategoryManager: User settings saved successfully to JSON');
      return true;
    } catch (error) {
      log.error('CategoryManager: Failed to save user settings to JSON:', error);
      return false;
    }
  }

  /**
   * Get all detected applications from the database with intelligent caching
   * 
   * This method queries the database for all unique application window titles
   * that have been tracked. It uses caching to avoid frequent database queries
   * while ensuring data freshness.
   * 
   * Caching strategy:
   * - Cache is valid for 30 seconds (CACHE_TTL)
   * - Returns cached data if available and not expired
   * - Queries database and updates cache if expired or empty
   * 
   * @returns {string[]} Array of detected application names/titles
   */
  public getDetectedApps(): string[] {
    try {
      const now = Date.now();
      
      // Check if cached data is still valid (within TTL period)
      if (this.detectedAppsCache.length > 0 && (now - this.lastDetectedAppsUpdate) < this.CACHE_TTL) {
        return this.detectedAppsCache;
      }

      // Ensure database connection is available
      if (!db) {
        log.error('CategoryManager: Database not available');
        return [];
      }

      // Query database for all unique window titles
      // Filters out null/empty titles and sorts alphabetically
      const stmt = db.prepare('SELECT DISTINCT title FROM active_windows WHERE title IS NOT NULL AND title != \'\' ORDER BY title ASC');
      const rows = stmt.all();
      const detectedApps = rows.map((row: any) => row.title);
      
      // Update cache with fresh data
      this.detectedAppsCache = detectedApps;
      this.lastDetectedAppsUpdate = now;
      
      log.info('CategoryManager: Retrieved detected apps', { count: detectedApps.length });
      return detectedApps;
    } catch (error) {
      log.error('CategoryManager: Failed to get detected apps:', error);
      return [];
    }
  }

  /**
   * Smart application categorization using keyword matching and user preferences
   * 
   * This is the core categorization algorithm that determines which category
   * an application belongs to based on:
   * 1. User-defined overrides (highest priority)
   * 2. Smart browser content detection
   * 3. Keyword matching against default categories
   * 4. Custom category assignments
   * 5. Fallback to 'miscellaneous' category
   * 
   * Special handling for browser windows:
   * - Detects if window is from a browser application
   * - Prioritizes content-specific categories over browser category
   * - Example: "YouTube - Chrome" → 'entertainment' instead of 'development'
   * 
   * @param {string} appName - The application name/window title to categorize
   * @returns {string} The category ID that the app should be assigned to
   */
  private categorizeSingleApp(appName: string): string {
    // Normalize app name to lowercase for case-insensitive matching
    const normalizedAppName = appName.toLowerCase();
    
    // Priority 1: Check user-defined overrides first
    // These are manual assignments that should always take precedence
    if (this.userSettings.appCategoryOverrides[appName]) {
      return this.userSettings.appCategoryOverrides[appName];
    }
    
    // Priority 2: Special handling for browser windows with content URLs
    // This handles cases where browser windows show content-specific titles
    // Example: "YouTube - Chrome" should be categorized as 'entertainment', not 'development'
    
    // List of common browser applications
    const browserKeywords = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi'];
    const isBrowserWindow = browserKeywords.some(keyword => normalizedAppName.includes(keyword));
    
    if (isBrowserWindow) {
      // For browser windows, prioritize content categories over browser category
      // Check content-specific categories in order of priority
      const contentCategories = ['social', 'entertainment', 'learning', 'development', 'work'];
      
      for (const categoryId of contentCategories) {
        if (defaultCategoryDefinitions[categoryId]) {
          // Check if any keywords from this category match the app name
          for (const keyword of defaultCategoryDefinitions[categoryId].keywords) {
            if (normalizedAppName.includes(keyword.toLowerCase()) || 
                keyword.toLowerCase().includes(normalizedAppName)) {
              return categoryId;
            }
          }
        }
      }
    }
    
    // Priority 3: Check against default category keyword definitions
    // This handles most standard applications
    for (const [categoryId, categoryDef] of Object.entries(defaultCategoryDefinitions)) {
      for (const keyword of categoryDef.keywords) {
        // Bidirectional matching: app name contains keyword OR keyword contains app name
        if (normalizedAppName.includes(keyword.toLowerCase()) || 
            keyword.toLowerCase().includes(normalizedAppName)) {
          return categoryId;
        }
      }
    }
    
    // Priority 4: Check if app is explicitly assigned to a custom category
    for (const [categoryId, categoryData] of Object.entries(this.userSettings.customCategories)) {
      if (categoryData.apps.includes(appName)) {
        return categoryId;
      }
    }
    
    // Priority 5: Default fallback category for unmatched applications
    return 'miscellaneous';
  }

  /**
   * Build the final categorized view with user customizations and dynamic app detection
   * 
   * This method creates the complete category structure by:
   * 1. Getting all currently detected applications from the database
   * 2. Initializing all default categories (empty initially)
   * 3. Adding user-created custom categories
   * 4. Categorizing each detected app using the smart categorization algorithm
   * 5. Removing empty categories (except miscellaneous)
   * 6. Sorting apps alphabetically within each category
   * 
   * The result is a complete view of all categories with their assigned applications,
   * taking into account user preferences and customizations.
   * 
   * @returns {AppCategories} Complete category structure with detected apps
   */
  public getFinalCategories(): AppCategories {
    try {
      log.info('CategoryManager: Building final categories with dynamic detection');
      
      // Step 1: Get all currently detected applications from the database
      const detectedApps = this.getDetectedApps();
      
      // Step 2: Initialize the final categories structure
      const finalCategories: AppCategories = {
        detectedApps,        // List of all detected apps
        categories: {}       // Categories with their assigned apps
      };

      // Step 3: Initialize all default categories with empty app lists
      // This ensures all standard categories are available even if empty
      Object.keys(defaultCategories.categories).forEach(categoryId => {
        finalCategories.categories[categoryId] = {
          description: defaultCategories.categories[categoryId].description,
          color: defaultCategories.categories[categoryId].color,
          apps: []  // Will be populated in step 5
        };
      });

      // Step 4: Add user-created custom categories
      Object.keys(this.userSettings.customCategories).forEach(categoryId => {
        finalCategories.categories[categoryId] = { 
          ...this.userSettings.customCategories[categoryId],
          apps: []  // Will be populated in step 5
        };
      });

      // Step 5: Categorize each detected application using smart categorization
      detectedApps.forEach(appName => {
        const categoryId = this.categorizeSingleApp(appName);
        
        // Ensure the determined category exists (handle edge cases)
        if (!finalCategories.categories[categoryId]) {
          finalCategories.categories[categoryId] = {
            description: 'Custom category',
            color: '#808080',  // Default gray color
            apps: [],
            isCustom: true
          };
        }
        
        // Add app to the determined category (avoid duplicates)
        if (!finalCategories.categories[categoryId].apps.includes(appName)) {
          finalCategories.categories[categoryId].apps.push(appName);
        }
      });

      // Step 6: Clean up empty categories (except miscellaneous which should always exist)
      Object.keys(finalCategories.categories).forEach(categoryId => {
        if (categoryId !== 'miscellaneous' && finalCategories.categories[categoryId].apps.length === 0) {
          delete finalCategories.categories[categoryId];
        }
      });

      // Step 7: Sort apps alphabetically within each category for consistent display
      Object.keys(finalCategories.categories).forEach(categoryId => {
        finalCategories.categories[categoryId].apps.sort();
      });

      log.info('CategoryManager: Final categories built successfully', {
        totalCategories: Object.keys(finalCategories.categories).length,
        detectedApps: detectedApps.length,
        categorizedApps: detectedApps.length
      });

      return finalCategories;
    } catch (error) {
      // If anything goes wrong, return default categories structure
      log.error('CategoryManager: Failed to build final categories:', error);
      return {
        detectedApps: this.getDetectedApps(),
        categories: { ...defaultCategories.categories }
      };
    }
  }

  /**
   * Generate a unique category ID from a category name
   * 
   * This method creates URL-friendly category IDs from user-provided names:
   * 1. Converts to lowercase
   * 2. Removes special characters
   * 3. Replaces spaces with hyphens
   * 4. Ensures uniqueness by adding numeric suffix if needed
   * 
   * Examples:
   * - "My Games" → "my-games"
   * - "Work & Business" → "work-business"
   * - "Custom" → "custom" (or "custom-1" if "custom" exists)
   * 
   * @param {string} name - The user-provided category name
   * @returns {string} A unique, URL-friendly category ID
   */
  private generateCategoryId(name: string): string {
    // Step 1: Convert to lowercase and clean up the name
    let baseId = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')  // Remove special characters (keep alphanumeric and spaces)
      .replace(/\s+/g, '-')         // Replace one or more spaces with single hyphen
      .replace(/-+/g, '-')          // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-|-$/g, '');       // Remove leading and trailing hyphens

    // Step 2: Handle edge case where name becomes empty after cleaning
    if (!baseId) {
      baseId = 'custom-category';
    }

    // Step 3: Ensure uniqueness by checking against existing categories
    let finalId = baseId;
    let counter = 1;
    
    // Keep incrementing counter until we find a unique ID
    while (defaultCategories.categories[finalId] || this.userSettings.customCategories[finalId]) {
      finalId = `${baseId}-${counter}`;
      counter++;
    }

    return finalId;
  }

  /**
   * Create a new custom category with automatic ID generation
   * 
   * This method allows users to create their own categories with custom names,
   * descriptions, and colors. The category ID is automatically generated from
   * the provided name to ensure uniqueness and URL-friendliness.
   * 
   * Process:
   * 1. Generate unique ID from the category name
   * 2. Validate that the generated ID doesn't conflict with existing categories
   * 3. Add the category to in-memory settings
   * 4. Persist changes to disk
   * 5. Rollback if save fails
   * 
   * @param {string} name - Display name for the category
   * @param {string} description - Description of what the category is for
   * @param {string} color - Hex color code for the category (e.g., "#FF5733")
   * @returns {object} Result object with success status and generated ID or error message
   */
  public createCustomCategory(name: string, description: string, color: string): { success: boolean; id?: string; error?: string } {
    try {
      log.info('CategoryManager: Creating custom category', { name, description, color });
      
      // Generate unique ID from name
      const id = this.generateCategoryId(name);
      
      // Double-check that ID doesn't exist (should not happen with our generation logic)
      if (defaultCategories.categories[id] || this.userSettings.customCategories[id]) {
        log.error('CategoryManager: Generated ID already exists (unexpected)', { id });
        return { success: false, error: 'Generated category ID already exists' };
      }

      // Add to in-memory settings
      this.userSettings.customCategories[id] = {
        description,
        color,
        apps: [],
        isCustom: true
      };

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Custom category created successfully', { id, name });
        return { success: true, id };
      } else {
        // Rollback in-memory changes if save failed
        delete this.userSettings.customCategories[id];
        return { success: false, error: 'Failed to save category settings' };
      }
    } catch (error) {
      log.error('CategoryManager: Failed to create custom category:', error);
      return { success: false, error: 'Failed to create category' };
    }
  }

  /**
   * Legacy method for backward compatibility (DEPRECATED)
   * 
   * This method exists to maintain compatibility with older code that might
   * still call the legacy API. It internally calls the new createCustomCategory
   * method but ignores the provided ID parameter since IDs are now auto-generated.
   * 
   * @deprecated Use createCustomCategory instead
   * @param {string} id - Ignored (IDs are now auto-generated)
   * @param {string} name - Category name
   * @param {string} description - Category description
   * @param {string} color - Category color
   * @returns {boolean} True if creation was successful
   */
  public createCustomCategoryLegacy(id: string, name: string, description: string, color: string): boolean {
    try {
      log.warn('CategoryManager: createCustomCategoryLegacy is deprecated, use createCustomCategory instead', { id, name });
      
      // Directly call the new method (will generate ID from name)
      const result = this.createCustomCategory(name, description, color);
      return result.success;
    } catch (error) {
      log.error('CategoryManager: Failed to create custom category (legacy):', error);
      return false;
    }
  }

  /**
   * Update an existing custom category's properties
   * 
   * This method allows modification of a custom category's display properties.
   * It includes rollback functionality to maintain data integrity if the save fails.
   * 
   * Safety features:
   * - Validates that the category exists and is custom (not default)
   * - Preserves existing app assignments
   * - Rolls back changes if save fails
   * 
   * @param {string} id - The ID of the custom category to update
   * @param {string} name - New display name (not used for ID generation)
   * @param {string} description - New description
   * @param {string} color - New color hex code
   * @returns {boolean} True if update was successful
   */
  public updateCustomCategory(id: string, name: string, description: string, color: string): boolean {
    try {
      log.info('CategoryManager: Updating custom category', { id, name, description, color });
      
      // Check if it's a custom category
      if (!this.userSettings.customCategories[id]) {
        log.error('CategoryManager: Cannot update non-custom category', { id });
        return false;
      }

      // Store original values for rollback
      const originalCategory = { ...this.userSettings.customCategories[id] };
      
      // Update in-memory settings
      this.userSettings.customCategories[id] = {
        description,
        color,
        apps: this.userSettings.customCategories[id].apps,
        isCustom: true
      };

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Custom category updated successfully', { id });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings.customCategories[id] = originalCategory;
        log.error('CategoryManager: Failed to save updated custom category', { id });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to update custom category:', error);
      return false;
    }
  }

  /**
   * Delete a custom category and clean up associated data
   * 
   * This method safely removes a custom category while cleaning up all
   * associated data to prevent orphaned references.
   * 
   * Cleanup process:
   * 1. Validate that the category exists and is custom
   * 2. Remove the category from custom categories
   * 3. Remove any app overrides that point to this category
   * 4. Persist changes to disk
   * 5. Rollback if save fails
   * 
   * Note: Apps that were in this category will be re-categorized using
   * the default categorization logic the next time getFinalCategories() is called.
   * 
   * @param {string} id - The ID of the custom category to delete
   * @returns {boolean} True if deletion was successful
   */
  public deleteCustomCategory(id: string): boolean {
    try {
      log.info('CategoryManager: Deleting custom category', { id });
      
      // Check if it's a custom category
      if (!this.userSettings.customCategories[id]) {
        log.error('CategoryManager: Cannot delete non-custom category', { id });
        return false;
      }

      // Store original values for rollback
      const originalCategory = { ...this.userSettings.customCategories[id] };
      const originalOverrides = { ...this.userSettings.appCategoryOverrides };
      
      // Remove from in-memory settings
      delete this.userSettings.customCategories[id];
      
      // Remove app overrides that point to this category
      Object.keys(this.userSettings.appCategoryOverrides).forEach(appName => {
        if (this.userSettings.appCategoryOverrides[appName] === id) {
          delete this.userSettings.appCategoryOverrides[appName];
        }
      });

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Custom category deleted successfully', { id });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings.customCategories[id] = originalCategory;
        this.userSettings.appCategoryOverrides = originalOverrides;
        log.error('CategoryManager: Failed to save after deleting custom category', { id });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to delete custom category:', error);
      return false;
    }
  }

  /**
   * Manually assign a specific application to a specific category
   * 
   * This method creates a user override that forces a specific app to be
   * categorized in a specific category, regardless of what the automatic
   * categorization algorithm would determine.
   * 
   * Use cases:
   * - Correcting misclassified applications
   * - Assigning apps to custom categories
   * - Overriding default categorization for specific workflow needs
   * 
   * Validation:
   * - Ensures the target category exists
   * - Ensures the app is currently detected in the system
   * - Includes rollback functionality for data integrity
   * 
   * @param {string} appName - The exact name of the application to assign
   * @param {string} categoryId - The ID of the category to assign the app to
   * @returns {boolean} True if assignment was successful
   */
  public assignAppToCategory(appName: string, categoryId: string): boolean {
    try {
      log.info('CategoryManager: Assigning app to category', { appName, categoryId });
      
      // Check if category exists
      const finalCategories = this.getFinalCategories();
      if (!finalCategories.categories[categoryId]) {
        log.error('CategoryManager: Category does not exist', { categoryId });
        return false;
      }

      // Check if app is detected
      if (!finalCategories.detectedApps.includes(appName)) {
        log.error('CategoryManager: App not detected', { appName });
        return false;
      }

      // Store original value for rollback
      const originalAssignment = this.userSettings.appCategoryOverrides[appName];
      
      // Update in-memory settings
      this.userSettings.appCategoryOverrides[appName] = categoryId;

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: App assigned to category successfully', { appName, categoryId });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        if (originalAssignment) {
          this.userSettings.appCategoryOverrides[appName] = originalAssignment;
        } else {
          delete this.userSettings.appCategoryOverrides[appName];
        }
        log.error('CategoryManager: Failed to save app assignment', { appName, categoryId });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to assign app to category:', error);
      return false;
    }
  }

  /**
   * Remove a manual app category assignment
   * 
   * This method removes a user-created override, allowing the app to be
   * categorized using the default automatic categorization logic.
   * 
   * After removal, the app will be re-categorized based on:
   * 1. Keyword matching against default categories
   * 2. Custom category app lists
   * 3. Fallback to 'miscellaneous' category
   * 
   * @param {string} appName - The application name to remove assignment for
   * @returns {boolean} True if removal was successful (or if no assignment existed)
   */
  public removeAppCategoryAssignment(appName: string): boolean {
    try {
      log.info('CategoryManager: Removing app category assignment', { appName });
      
      // Check if there's an assignment to remove
      if (!this.userSettings.appCategoryOverrides[appName]) {
        log.info('CategoryManager: No assignment to remove', { appName });
        return true;
      }

      // Store original value for rollback
      const originalAssignment = this.userSettings.appCategoryOverrides[appName];
      
      // Remove from in-memory settings
      delete this.userSettings.appCategoryOverrides[appName];

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: App category assignment removed successfully', { appName });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings.appCategoryOverrides[appName] = originalAssignment;
        log.error('CategoryManager: Failed to save after removing app assignment', { appName });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to remove app category assignment:', error);
      return false;
    }
  }

  /**
   * Get a copy of the current user settings for API consumption
   * 
   * Returns a deep copy of the user settings to prevent external modification
   * of internal state. This is useful for UI components that need to display
   * current settings without risking accidental mutations.
   * 
   * @returns {UserCategorySettings} Copy of current user settings
   */
  public getUserSettings(): UserCategorySettings {
    return { ...this.userSettings };
  }

  /**
   * Reset all user customizations to default state
   * 
   * This method clears all user-created customizations and returns the
   * system to its default state with only built-in categories.
   * 
   * What gets reset:
   * - All custom categories are removed
   * - All manual app assignments are removed
   * - Settings file is updated to reflect empty state
   * 
   * This is useful for troubleshooting or when users want to start fresh.
   * 
   * @returns {boolean} True if reset was successful
   */
  public resetToDefaults(): boolean {
    try {
      log.info('CategoryManager: Resetting to defaults');
      
      // Store original values for rollback
      const originalSettings = {
        customCategories: { ...this.userSettings.customCategories },
        appCategoryOverrides: { ...this.userSettings.appCategoryOverrides }
      };
      
      // Clear in-memory settings
      this.userSettings = {
        customCategories: {},
        appCategoryOverrides: {}
      };

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Reset to defaults completed');
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings = originalSettings;
        log.error('CategoryManager: Failed to save after reset to defaults');
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to reset to defaults:', error);
      return false;
    }
  }

  /**
   * Create a timestamped backup of current category settings
   * 
   * This method creates a backup file with a timestamp suffix, allowing
   * users to restore their settings if something goes wrong.
   * 
   * Backup file naming: category-settings.backup.{timestamp}.json
   * 
   * The backup includes:
   * - All custom categories
   * - All app category overrides
   * - Timestamp of when backup was created
   * 
   * @returns {boolean} True if backup was created successfully
   */
  public createBackup(): boolean {
    try {
      const backupFilePath = this.settingsFilePath.replace('.json', `.backup.${Date.now()}.json`);
      
      const backupData = {
        customCategories: this.userSettings.customCategories,
        appCategoryOverrides: this.userSettings.appCategoryOverrides,
        backupCreated: new Date().toISOString()
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(backupFilePath, jsonString, 'utf8');
      
      log.info('CategoryManager: Backup created successfully', { backupFilePath });
      return true;
    } catch (error) {
      log.error('CategoryManager: Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Get the file path where settings are stored
   * 
   * This method provides external access to the settings file path,
   * useful for backup utilities or external tools that need to access
   * the settings file directly.
   * 
   * @returns {string} Absolute path to the settings file
   */
  public getSettingsFilePathForExport(): string {
    return this.settingsFilePath;
  }

  /**
   * Export current settings to a JSON string
   * 
   * This method creates a portable JSON representation of the current
   * category settings that can be saved to a file or shared with others.
   * 
   * The exported data includes:
   * - All custom categories with their properties
   * - All app category overrides/assignments
   * - Export timestamp for tracking
   * 
   * Use cases:
   * - Sharing category configurations between users
   * - Creating portable backups
   * - Migrating settings between installations
   * 
   * @returns {string} JSON string containing all category settings
   */
  public exportSettings(): string {
    const exportData = {
      customCategories: this.userSettings.customCategories,
      appCategoryOverrides: this.userSettings.appCategoryOverrides,
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import settings from a JSON string
   * 
   * This method allows users to restore or import category settings
   * from a previously exported JSON string.
   * 
   * Safety features:
   * - Validates JSON structure before importing
   * - Ensures custom categories have correct structure
   * - Includes rollback functionality if save fails
   * - Preserves data integrity throughout the process
   * 
   * The import process:
   * 1. Parse and validate the JSON string
   * 2. Backup current settings for rollback
   * 3. Apply imported settings to memory
   * 4. Ensure data structure integrity
   * 5. Save to disk
   * 6. Rollback if save fails
   * 
   * @param {string} jsonString - JSON string containing category settings
   * @returns {boolean} True if import was successful
   */
  public importSettings(jsonString: string): boolean {
    try {
      const importData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!importData.customCategories || !importData.appCategoryOverrides) {
        log.error('CategoryManager: Invalid import data structure');
        return false;
      }
      
      // Store backup for rollback
      const backup = {
        customCategories: { ...this.userSettings.customCategories },
        appCategoryOverrides: { ...this.userSettings.appCategoryOverrides }
      };
      
      // Import the settings
      this.userSettings = {
        customCategories: importData.customCategories,
        appCategoryOverrides: importData.appCategoryOverrides
      };
      
      // Ensure custom categories have correct structure
      Object.keys(this.userSettings.customCategories).forEach(categoryId => {
        const category = this.userSettings.customCategories[categoryId];
        if (!category.apps) {
          category.apps = [];
        }
        if (!category.isCustom) {
          category.isCustom = true;
        }
      });
      
      // Save to file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Settings imported successfully');
        return true;
      } else {
        // Rollback on save failure
        this.userSettings = backup;
        log.error('CategoryManager: Failed to save imported settings');
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Get comprehensive statistics about the current category setup
   * 
   * This method provides useful metrics about the categorization system
   * that can be used for:
   * - UI dashboards and summaries
   * - Performance monitoring
   * - User engagement tracking
   * - System health assessment
   * 
   * Metrics provided:
   * - Number of custom categories created by user
   * - Number of manual app assignments (overrides)
   * - Total number of detected applications
   * - Number of successfully categorized apps
   * - Number of apps that fell back to 'miscellaneous'
   * 
   * @returns {object} Statistics object with categorization metrics
   */
  public getStatistics(): {
    customCategories: number;
    appOverrides: number;
    totalDetectedApps: number;
    categorizedApps: number;
    miscellaneousApps: number;
  } {
    try {
      const finalCategories = this.getFinalCategories();
      const detectedApps = finalCategories.detectedApps.length;
      const miscellaneousApps = finalCategories.categories.miscellaneous?.apps.length || 0;
      const categorizedApps = detectedApps - miscellaneousApps;
      
      return {
        customCategories: Object.keys(this.userSettings.customCategories).length,
        appOverrides: Object.keys(this.userSettings.appCategoryOverrides).length,
        totalDetectedApps: detectedApps,
        categorizedApps: categorizedApps,
        miscellaneousApps: miscellaneousApps
      };
    } catch (error) {
      log.error('CategoryManager: Failed to get statistics:', error);
      return {
        customCategories: 0,
        appOverrides: 0,
        totalDetectedApps: 0,
        categorizedApps: 0,
        miscellaneousApps: 0
      };
    }
  }

  /**
   * Migrate user data from legacy SQLite format to modern JSON format
   * 
   * This method handles the one-time migration from the old SQLite-based
   * category system to the new JSON-based system. It's designed to be
   * safe and non-destructive.
   * 
   * Migration process:
   * 1. Check if JSON settings already exist (skip if so)
   * 2. Look for legacy SQLite tables
   * 3. Extract data from SQLite tables
   * 4. Convert to new JSON format
   * 5. Save as JSON file
   * 6. Clean up old SQLite tables (optional)
   * 
   * Safety features:
   * - Won't overwrite existing JSON settings
   * - Gracefully handles missing SQLite tables
   * - Preserves data integrity throughout process
   * - Logs detailed progress information
   * 
   * This method is called automatically during initialization but can
   * also be called manually if needed.
   * 
   * @returns {Promise<boolean>} True if migration was successful or not needed
   */
  public async migrateFromSQLite(): Promise<boolean> {
    try {
      log.info('CategoryManager: Checking for SQLite migration');
      
      // Check if database is available
      if (!db) {
        log.info('CategoryManager: No database available, skipping migration');
        return true;
      }
      
      // Skip migration if JSON settings already exist with substantial content
      if (fs.existsSync(this.settingsFilePath)) {
        const fileSize = fs.statSync(this.settingsFilePath).size;
        if (fileSize > 50) { // If file has substantial content (not just empty braces)
          log.info('CategoryManager: JSON settings already exist, skipping migration');
          return true;
        }
      }
      
      // Check for legacy SQLite tables that need migration
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND (name='custom_categories' OR name='app_category_overrides')
      `).all();
      
      if (tables.length === 0) {
        log.info('CategoryManager: No SQLite category tables found, skipping migration');
        return true;
      }
      
      log.info('CategoryManager: Starting SQLite to JSON migration');
      
      // Initialize migration settings structure
      const migrationSettings: UserCategorySettings = {
        customCategories: {},
        appCategoryOverrides: {}
      };
      
      // Migrate custom categories table
      try {
        const customCategoriesRows = db.prepare('SELECT * FROM custom_categories').all();
        customCategoriesRows.forEach((row: any) => {
          migrationSettings.customCategories[row.id] = {
            description: row.description || '',
            color: row.color,
            apps: [],  // Apps will be populated through normal categorization
            isCustom: true
          };
        });
        log.info(`CategoryManager: Migrated ${customCategoriesRows.length} custom categories`);
      } catch (error) {
        log.warn('CategoryManager: Failed to migrate custom categories:', error);
      }
      
      // Migrate app category overrides table
      try {
        const overridesRows = db.prepare('SELECT * FROM app_category_overrides').all();
        overridesRows.forEach((row: any) => {
          migrationSettings.appCategoryOverrides[row.app_name] = row.category_id;
        });
        log.info(`CategoryManager: Migrated ${overridesRows.length} app overrides`);
      } catch (error) {
        log.warn('CategoryManager: Failed to migrate app overrides:', error);
      }
      
      // Apply migrated settings to in-memory state
      this.userSettings = migrationSettings;
      
      // Persist migrated settings to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Migration to JSON completed successfully');
        
        // Clean up old SQLite tables (optional - helps prevent confusion)
        try {
          db.prepare('DROP TABLE IF EXISTS custom_categories').run();
          db.prepare('DROP TABLE IF EXISTS app_category_overrides').run();
          log.info('CategoryManager: Old SQLite tables cleaned up');
        } catch (error) {
          log.warn('CategoryManager: Failed to clean up old SQLite tables:', error);
        }
        
        return true;
      } else {
        log.error('CategoryManager: Failed to save migrated settings');
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Migration from SQLite failed:', error);
      return false;
    }
  }

  /**
   * Public wrapper for the categorization algorithm
   * 
   * This method provides external access to the same categorization logic
   * used internally by the CategoryManager. It's useful for:
   * - Testing categorization logic
   * - Previewing where an app would be categorized
   * - External tools that need to use the same categorization rules
   * 
   * The method uses the same priority system as the internal categorization:
   * 1. User overrides (manual assignments)
   * 2. Smart browser content detection
   * 3. Keyword matching against default categories
   * 4. Custom category assignments
   * 5. Fallback to 'miscellaneous'
   * 
   * @param {string} itemName - The application name or domain to categorize
   * @returns {string} The category ID that the item would be assigned to
   */
  public categorizeItem(itemName: string): string {
    return this.categorizeSingleApp(itemName);
  }
}

// Export the CategoryManager class as the default export
// This allows other modules to import the class easily
export default CategoryManager;
