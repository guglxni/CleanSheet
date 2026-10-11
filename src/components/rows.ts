export function cloneRows(rows: string[][]): string[][] {
  return rows.map((row) => row.slice());
}

export function sameRows(left: string[][], right: string[][]): boolean {
  if (left.length !== right.length) return false;
  for (let rowIndex = 0; rowIndex < left.length; rowIndex += 1) {
    const a = left[rowIndex] ?? [];
    const b = right[rowIndex] ?? [];
    if (a.length !== b.length) return false;
    for (let col = 0; col < a.length; col += 1) {
      if (a[col] !== b[col]) return false;
    }
  }
  return true;
}

export function isBlank(value: string | undefined): boolean {
  return (value ?? "").trim() === "";
}

export function columnTitle(header: string, index: number): string {
  return header.trim() === "" ? `Column ${index + 1}` : header;
}
