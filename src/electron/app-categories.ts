export interface AppCategory {
  description: string;
  apps: string[];
  color: string;
}

export interface AppCategories {
  categories: {
    [key: string]: AppCategory;
  };
}

export const appCategories: AppCategories = {
  categories: {
    development: {
      description: "Development tools, IDEs, and programming-related applications",
      color: "#A554E8",
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
      color: "#FF9CF5",
      apps: [
        "Discord",
        "WhatsApp.exe",

      ]
    },
    entertainment: {
      description: "Games, media players, and entertainment applications",
      color: "#7DD4FF",
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
      color: "#877DFF",
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
      color: "#D178F0",
      apps: [
        "Google Chrome",
        "Zen"
      ]
    },
    system: {
      description: "System utilities, Windows components, and OS-level applications",
      color: "#9BA8FF",
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
      color: "#B494E8",
      apps: [
        "NVIDIA App",
        "VB-AUDIO Virtual Audio Device Mixing Console Application",
        "Remote Desktop Connection"
      ]
    }
  }
};

export default appCategories;
