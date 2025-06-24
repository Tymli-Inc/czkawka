export interface AppCategory {
  description: string;
  apps: string[];
}

export interface AppCategories {
  categories: {
    development: AppCategory;
    social: AppCategory;
    entertainment: AppCategory;
    productivity: AppCategory;
    browsers: AppCategory;
    system: AppCategory;
    utilities: AppCategory;
  };
}

export const appCategories: AppCategories = {
  categories: {
    development: {
      description: "Development tools, IDEs, and programming-related applications",
      apps: [
        "Visual Studio Code",
        "Electron",
        "OpenJDK Platform binary",
        "Java(TM) Platform SE binary",
        "SQLiteStudio.exe",
        "SQLiteStudio-3.4.17-windows-x64-installer.exe",
        "SQLITE~1.EXE",
        "pgAdmin 4"
      ]
    },
    social: {
      description: "Social media, communication, and messaging applications",
      apps: [
        "Discord",
        "WhatsApp.exe",

      ]
    },
    entertainment: {
      description: "Games, media players, and entertainment applications",
      apps: [
        "Teardown",
        "Minecraft.exe",
        "Plex.exe",
        "Spotify",
        "Windows Media Player",
        "Xbox App",
        "Hydra"
      ]
    },
    productivity: {
      description: "Time tracking, office applications, and productivity tools",
      apps: [
        "Hourglass",
        "Hourglass Time Tracking Application",
        "hourglass",
        "Microsoft OneDrive",
        "Google Drive",
        "Notepad.exe",
        "ShareX",
        "Task Manager"
      ]
    },
    browsers: {
      description: "Web browsers and browser-related applications",
      apps: [
        "Google Chrome",
        "Zen"
      ]
    },
    system: {
      description: "System utilities, Windows components, and OS-level applications",
      apps: [
        "Windows Explorer",
        "Windows Shell Experience Host",
        "Windows Start Experience Host",
        "WindowsTerminal.exe",
        "Application Frame Host",
        "SearchHost.exe",
        "Microsoft.CmdPal.UI",
        "Pick an app",
        "gamingservicesui.exe"
      ]
    },
    utilities: {
      description: "System utilities, tools, and hardware-related applications",
      apps: [
        "NVIDIA App",
        "VB-AUDIO Virtual Audio Device Mixing Console Application",
        "Remote Desktop Connection"
      ]
    }
  }
};

export default appCategories;
