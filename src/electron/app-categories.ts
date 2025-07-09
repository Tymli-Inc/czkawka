import log from 'electron-log';
import defaultCategoriesData from './default-categories.json';

export interface CategoryDefinition {
  description: string;
  color: string;
  keywords: string[];
}

export interface AppCategory {
  description: string;
  apps: string[];
  color: string;
  isCustom?: boolean; // Flag to indicate if it's a user-created category
}

export interface AppCategories {
  categories: {
    [key: string]: AppCategory;
  };
  detectedApps: string[]; // List of all detected apps
}

export interface UserCategorySettings {
  customCategories: {
    [key: string]: AppCategory;
  };
  appCategoryOverrides: {
    [appName: string]: string; // app name -> category id
  };
}

let defaultCategoryDefinitions: { [key: string]: CategoryDefinition } = {};

try {
  defaultCategoryDefinitions = defaultCategoriesData;
  log.info('Default categories loaded from imported JSON');
} catch (error) {
  log.error('Failed to load default categories from JSON:', error);
  defaultCategoryDefinitions = {
    miscellaneous: {
      description: "Uncategorized applications",
      color: "#808080",
      keywords: []
    }
  };
}

// Dynamic categories structure (empty by default, populated by CategoryManager)
export const defaultCategories: AppCategories = {
  detectedApps: [], // This will be populated dynamically from tracked data
  categories: {
    development: {
      description: defaultCategoryDefinitions.development?.description || "Development tools, IDEs, and programming-related applications",
      color: defaultCategoryDefinitions.development?.color || "#A554E8",
      apps: []
    },
    work: {
      description: defaultCategoryDefinitions.work?.description || "Office suites, task managers, and productivity tools for work",
      color: defaultCategoryDefinitions.work?.color || "#877DFF",
      apps: []
    },
    communication: {
      description: defaultCategoryDefinitions.communication?.description || "Professional communication tools like Slack, Zoom, and Teams",
      color: defaultCategoryDefinitions.communication?.color || "#FFCB6B",
      apps: []
    },
    social: {
      description: defaultCategoryDefinitions.social?.description || "Social media and messaging applications for casual communication",
      color: defaultCategoryDefinitions.social?.color || "#FF9CF5",
      apps: []
    },
    entertainment: {
      description: defaultCategoryDefinitions.entertainment?.description || "Games, streaming platforms, and media consumption tools",
      color: defaultCategoryDefinitions.entertainment?.color || "#7DD4FF",
      apps: []
    },
    creative: {
      description: defaultCategoryDefinitions.creative?.description || "Tools for design, editing, streaming, and content creation",
      color: defaultCategoryDefinitions.creative?.color || "#FFD166",
      apps: []
    },
    learning: {
      description: defaultCategoryDefinitions.learning?.description || "Apps and websites for online learning and self-improvement",
      color: defaultCategoryDefinitions.learning?.color || "#06D6A0",
      apps: []
    },
    browsers: {
      description: defaultCategoryDefinitions.browsers?.description || "Web browsers and related apps",
      color: defaultCategoryDefinitions.browsers?.color || "#D178F0",
      apps: []
    },
    utilities: {
      description: defaultCategoryDefinitions.utilities?.description || "System and hardware-related tools, file transfer utilities",
      color: defaultCategoryDefinitions.utilities?.color || "#B494E8",
      apps: []
    },
    system: {
      description: defaultCategoryDefinitions.system?.description || "Operating system and native Windows components",
      color: defaultCategoryDefinitions.system?.color || "#9BA8FF",
      apps: []
    },
    miscellaneous: {
      description: defaultCategoryDefinitions.miscellaneous?.description || "Uncategorized or unknown applications",
      color: defaultCategoryDefinitions.miscellaneous?.color || "#808080",
      apps: []
    }
  }
};

export { defaultCategoryDefinitions };
export default defaultCategories;
