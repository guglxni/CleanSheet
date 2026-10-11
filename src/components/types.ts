export type CleanMode = "all" | "duplicates" | "incomplete";

export type BarId = "upload" | "preview";

export type RowFilter = "all" | "issues";

export type LoadedSheet = {
  name: string;
  headers: string[];
  original: string[][];
  rows: string[][];
};
