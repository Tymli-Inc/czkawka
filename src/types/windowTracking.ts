export interface AppData {
  title: string;
  session_length: number;
}

export interface CategoryData {
  title: string;
  session_length: number;
  appData: AppData[];
}

export interface CompileDataResponse {
  success: boolean;
  data: CategoryData[];
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
