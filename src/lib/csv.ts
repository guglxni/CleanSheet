export type CsvSheet = { headers: string[]; rows: string[][] };

export type MissingCell = { row: number; col: number };

export type DuplicateGroup = {
  key: string;
  indexes: number[];
  label: string;
};

export type Analysis = {
  duplicateRowIndexes: number[];
  duplicateGroups: DuplicateGroup[];
  missingCells: MissingCell[];
  rowsWithMissing: number[];
  missingByColumn: { header: string; index: number; count: number }[];
};

const LABEL_LIMIT = 48;

export function parseCsv(text: string): CsvSheet {
  const source = stripBom(text);
  if (source.length === 0) {
    throw new Error("This file has no rows.");
  }

  const records = parseRecords(source);
  if (records.length === 0) {
    throw new Error("This file has no rows.");
  }

  const headers = records[0].map((cell) => cell.trim());
  if (headers.length === 0 || headers.every((cell) => cell === "")) {
    throw new Error("This file has no header row.");
  }

  const width = headers.length;
  const rows = records.slice(1).map((record) => fitWidth(record, width));
  return { headers, rows };
}

export function analyze(sheet: CsvSheet): Analysis {
  const width = sheet.headers.length;
  const groups = new Map<string, number[]>();

  sheet.rows.forEach((row, index) => {
    const key = trimmedKey(row, width);
    const indexes = groups.get(key);
    if (indexes) indexes.push(index);
    else groups.set(key, [index]);
  });

  const duplicateGroups: DuplicateGroup[] = [];
  const duplicateRowIndexes: number[] = [];

  for (const [key, indexes] of groups) {
    if (indexes.length < 2) continue;
    indexes.sort((a, b) => a - b);
    const keeper = sheet.rows[indexes[0]] ?? [];
    duplicateGroups.push({
      key,
      indexes,
      label: groupLabel(keeper, width),
    });
    for (let i = 1; i < indexes.length; i += 1) {
      duplicateRowIndexes.push(indexes[i]);
    }
  }

  duplicateRowIndexes.sort((a, b) => a - b);

  const missingCells: MissingCell[] = [];
  const missingCounts = Array.from({ length: width }, () => 0);
  const rowsWithMissingSet = new Set<number>();

  sheet.rows.forEach((row, rowIndex) => {
    for (let col = 0; col < width; col += 1) {
      if (!isMissing(row[col])) continue;
      missingCells.push({ row: rowIndex, col });
      missingCounts[col] += 1;
      rowsWithMissingSet.add(rowIndex);
    }
  });

  const rowsWithMissing = [...rowsWithMissingSet].sort((a, b) => a - b);
  const missingByColumn = sheet.headers.map((header, index) => ({
    header,
    index,
    count: missingCounts[index] ?? 0,
  }));

  return {
    duplicateRowIndexes,
    duplicateGroups,
    missingCells,
    rowsWithMissing,
    missingByColumn,
  };
}

export function removeDuplicateRows(rows: string[][]): string[][] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return withoutDuplicateRows(rows, width);
}

export function removeIncompleteRows(rows: string[][], width: number): string[][] {
  const kept: string[][] = [];
  for (const row of rows) {
    let complete = true;
    for (let col = 0; col < width; col += 1) {
      if (isMissing(row[col])) {
        complete = false;
        break;
      }
    }
    if (complete) kept.push(row.slice());
  }
  return kept;
}

export function applyClean(
  rows: string[][],
  width: number,
  mode: "all" | "duplicates" | "incomplete",
): { rows: string[][]; removedDuplicates: number; removedIncomplete: number } {
  let current = rows;
  let removedDuplicates = 0;
  let removedIncomplete = 0;

  if (mode === "all" || mode === "incomplete") {
    const next = removeIncompleteRows(current, width);
    removedIncomplete = current.length - next.length;
    current = next;
  }

  if (mode === "all" || mode === "duplicates") {
    const next = withoutDuplicateRows(current, width);
    removedDuplicates = current.length - next.length;
    current = next;
  }

  return { rows: current, removedDuplicates, removedIncomplete };
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map((cell) => quoteField(cell ?? "")).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

export function cleanDownloadName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name}-clean.csv`;
  return `${name.slice(0, dot)}-clean.csv`;
}

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let closedByBreak = false;
  let i = 0;

  const endRecord = () => {
    row.push(field);
    records.push(row);
    row = [];
    field = "";
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      closedByBreak = false;
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true;
      closedByBreak = false;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      closedByBreak = false;
      i += 1;
      continue;
    }

    if (char === "\n" || char === "\r") {
      endRecord();
      closedByBreak = true;
      i += 1;
      if (char === "\r" && text[i] === "\n") i += 1;
      continue;
    }

    field += char;
    closedByBreak = false;
    i += 1;
  }

  if (!closedByBreak) endRecord();
  return records;
}

function fitWidth(record: string[], width: number): string[] {
  const sized = record.slice(0, width);
  while (sized.length < width) sized.push("");
  return sized;
}

function isMissing(value: string | undefined): boolean {
  return (value ?? "").trim() === "";
}

function trimmedCells(row: string[], width: number): string[] {
  const cells: string[] = [];
  for (let col = 0; col < width; col += 1) {
    cells.push((row[col] ?? "").trim());
  }
  return cells;
}

function trimmedKey(row: string[], width: number): string {
  return JSON.stringify(trimmedCells(row, width));
}

function groupLabel(row: string[], width: number): string {
  const parts: string[] = [];
  for (let col = 0; col < width && parts.length < 2; col += 1) {
    const value = (row[col] ?? "").trim();
    if (value !== "") parts.push(value);
  }
  if (parts.length === 0) return "Empty row";
  const label = parts.join(" · ");
  if (label.length <= LABEL_LIMIT) return label;
  return label.slice(0, LABEL_LIMIT).trimEnd();
}

function withoutDuplicateRows(rows: string[][], width: number): string[][] {
  const seen = new Set<string>();
  const kept: string[][] = [];
  for (const row of rows) {
    const key = trimmedKey(row, width);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row.slice());
  }
  return kept;
}

function quoteField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
