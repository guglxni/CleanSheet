export const PREVIEW_STEP = 250;
export const PREVIEW_LARGE = 2000;

export function cleanStatus(
  removedIncomplete: number,
  removedDuplicates: number,
  remaining: number,
): string {
  const parts: string[] = [];
  if (removedIncomplete > 0) {
    parts.push(countPhrase(removedIncomplete, "incomplete row", "incomplete rows"));
  }
  if (removedDuplicates > 0) {
    parts.push(countPhrase(removedDuplicates, "duplicate", "duplicates"));
  }
  const remain = remaining === 1 ? "1 row remains" : `${remaining.toLocaleString()} rows remain`;
  if (parts.length === 0) return `${remain}.`;
  return `Removed ${parts.join(" and ")}. ${remain}.`;
}

export function loadStatus(name: string, rows: number, columns: number): string {
  const rowLabel = rows === 1 ? "row" : "rows";
  const columnLabel = columns === 1 ? "column" : "columns";
  return `Loaded ${name}. ${rows.toLocaleString()} ${rowLabel}, ${columns.toLocaleString()} ${columnLabel}.`;
}

export function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return fallback;
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
