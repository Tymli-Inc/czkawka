export interface AppData {
  title: string;
  session_length: number;
  category?: string;
}

export interface CategoryData {
  title: string;
  session_length: number;
  appData: AppData[];
}

export interface GroupedCategoryData {
  categories: string[];
  appData: AppData[];
  session_length: number;
  session_start: number;
  session_end: number;
}

export interface CompileDataResponse {
  success: boolean;
  data: CategoryData[];
}

export interface GroupedCategoryDataResponse {
  success: boolean;
  data: GroupedCategoryData[];
}

export interface ActiveWindow {
  id: number;
  title: string;
  error?: string;
}

export interface WindowHistoryEntry {
  id: number;
  title: string;
  unique_id: number;
  timestamp: number;
  session_length: number;
}

// WindowRecord is identical to WindowHistoryEntry, so we use an alias
export type WindowRecord = WindowHistoryEntry;

export interface TrackingSession {
  id: number;
  session_start: number;
  session_end: number;
}

export interface DailyCategoryBreakdown {
  category: string;
  time: number;
  color: string;
}

export interface DailyCategoryBreakdownResponse {
  success: boolean;
  data: DailyCategoryBreakdown[];
  error?: string;
}

export interface TopAppForDate {
  title: string;
  time: number;
  category: string;
  categoryColor: string;
}

export interface TopAppsForDateResponse {
  success: boolean;
  data: TopAppForDate[];
  error?: string;
}
