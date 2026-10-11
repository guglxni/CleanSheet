import {
  analyze,
  applyClean,
  cleanDownloadName,
  downloadCsv,
  parseCsv,
  removeDuplicateRows,
  removeIncompleteRows,
  toCsv,
} from "./csv.ts";
import { SAMPLE_CSV, SAMPLE_NAME } from "./sample.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function errorMessage(text: string): string | undefined {
  try {
    parseCsv(text);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "unknown";
  }
}

assert(errorMessage("") === "This file has no rows.", "empty file");
assert(errorMessage("\uFEFF") === "This file has no rows.", "bom only");
assert(errorMessage(" , \n1,2\n") === "This file has no header row.", "blank header");
assert(errorMessage("   ,   ,   ") === "This file has no header row.", "whitespace header");
assert(errorMessage("\n") === "This file has no header row.", "newline only");

const bom = parseCsv("\uFEFForder_id,customer\nHO-1,Mara\n");
assert(bom.headers[0] === "order_id" && bom.rows.length === 1, "bom header");

const withBreak = parseCsv("order_id,customer\nHO-1,Mara\n");
const withoutBreak = parseCsv("order_id,customer\nHO-1,Mara");
const crlf = parseCsv("order_id,customer\r\nHO-1,Mara\r\n");
assert(withBreak.rows.length === 1 && withoutBreak.rows.length === 1, "trailing newline");
assert(crlf.rows.length === 1 && crlf.rows[0][1] === "Mara", "crlf");

const quotedNewline = parseCsv('order_id,customer\nHO-1,"Hale,\nJonah"\n');
assert(quotedNewline.rows.length === 1, "quoted newline is one row");
assert(quotedNewline.rows[0][1] === "Hale,\nJonah", "quoted newline value");

const spaced = parseCsv(" order_id , customer \n  HO-1  ,  Mara  \n");
assert(spaced.headers[0] === "order_id" && spaced.headers[1] === "customer", "headers trimmed");
assert(spaced.rows[0][0] === "  HO-1  " && spaced.rows[0][1] === "  Mara  ", "values kept raw");

const sized = parseCsv("a,b,c\n1,2\n3,4,5,6\n");
assert(sized.rows[0].join("|") === "1|2|", "pads short rows");
assert(sized.rows[1].join("|") === "3|4|5", "clips long rows");

const blankLine = parseCsv("a,b\n\n1,2\n");
assert(blankLine.rows.length === 2, "keeps a blank data row");
assert(blankLine.rows[0][0] === "" && blankLine.rows[0][1] === "", "blank row padded");
assert(analyze(blankLine).missingCells.length === 2, "blank row is missing");

const trimDup = parseCsv("item,qty\nMug, 2 \nMug,2\n");
assert(analyze(trimDup).duplicateRowIndexes.length === 1, "trim-equal duplicate");
const keptTrim = removeDuplicateRows(trimDup.rows);
assert(keptTrim.length === 1 && keptTrim[0][1] === " 2 ", "keeps the first raw row");

const blanks = parseCsv("h1,h2\n,\n,\n");
const blankGroups = analyze(blanks).duplicateGroups;
assert(blanks.rows.length === 2, "blank records kept");
assert(blankGroups.length === 1 && blankGroups[0].label === "Empty row", "empty label");

const left = "N".repeat(40);
const right = "M".repeat(40);
const longLabel = analyze(parseCsv(`h1,h2\n${left},${right}\n${left},${right}\n`)).duplicateGroups[0]?.label ?? "";
assert(longLabel.length <= 48 && longLabel.startsWith("N"), "label cap");

const mixed = parseCsv("h1,h2\r\na,b\r\na,\r\na,\r\n");
const mixedAll = applyClean(mixed.rows, mixed.headers.length, "all");
assert(mixedAll.removedIncomplete === 2 && mixedAll.removedDuplicates === 0, "incomplete rows drop first");
assert(mixedAll.rows.length === 1 && mixedAll.rows[0][1] === "b", "complete row remains");
const mixedDup = applyClean(mixed.rows, mixed.headers.length, "duplicates");
assert(mixedDup.removedDuplicates === 1 && mixedDup.removedIncomplete === 0, "duplicates-only counts");
assert(mixedDup.rows.length === 2 && mixedDup.rows.some((row) => row[1].trim() === ""), "duplicates-only keeps incomplete");

const sheet = parseCsv(SAMPLE_CSV);
assert(sheet.headers.join("|") === "order_id|customer|city|item|qty|total", "sample headers");
assert(sheet.rows.length === 18, "sample row count");
assert(sheet.rows.length > 10, "sample has more than 10 rows");
assert(sheet.rows.every((row) => row.length === 6), "sample width");
assert(sheet.rows.some((row) => row[1] === "Hale, Jonah"), "quoted comma survives");
assert(sheet.rows.some((row) => row[1] === 'Okafor "Nia" Blake'), "escaped quote survives");
assert(sheet.rows.some((row) => row[1] === "Mina Cho"), "plain quoted field survives");

const whitespaceRow = sheet.rows.findIndex((row) => row[1] === "   ");
assert(whitespaceRow === 11, "whitespace fixture");

const analysis = analyze(sheet);
assert(analysis.duplicateRowIndexes.length >= 3, "duplicate extras");
assert(JSON.stringify(analysis.duplicateRowIndexes) === JSON.stringify([10, 14, 16]), "duplicate indexes");
assert(analysis.duplicateGroups.length === 3, "duplicate groups");
assert(
  JSON.stringify(analysis.duplicateGroups.map((group) => group.indexes)) === JSON.stringify([[0, 10], [2, 14], [4, 16]]),
  "group indexes",
);
assert(analysis.duplicateGroups[0]?.label === "HO-1042 · Mara Ellison", "keeper label");
assert(analysis.duplicateGroups[2]?.label === 'HO-1046 · Okafor "Nia" Blake', "quoted label");
assert(
  analysis.duplicateGroups.every((group) => group.indexes.length >= 2 && !analysis.duplicateRowIndexes.includes(group.indexes[0])),
  "keepers stay out of the extra list",
);
assert(analysis.missingCells.length >= 4, "missing cells");
assert(
  analysis.missingCells.map((cell) => `${cell.row}:${cell.col}`).join(",") === "6:2,7:3,8:4,9:5,11:1",
  "missing coordinates",
);
assert(
  analysis.missingCells.some((cell) => cell.row === whitespaceRow && cell.col === 1),
  "whitespace-only cell counts as missing",
);
assert(JSON.stringify(analysis.rowsWithMissing) === JSON.stringify([6, 7, 8, 9, 11]), "rows with missing");
assert(analysis.missingByColumn.length === sheet.headers.length, "every column reported");
assert(analysis.missingByColumn.every((column) => column.header === sheet.headers[column.index]), "column identity");
const missingCounts = Object.fromEntries(analysis.missingByColumn.map((column) => [column.header, column.count]));
assert(missingCounts.order_id === 0, "zero counts included");
assert(
  missingCounts.customer === 1 &&
    missingCounts.city === 1 &&
    missingCounts.item === 1 &&
    missingCounts.qty === 1 &&
    missingCounts.total === 1,
  "missing spread",
);

const before = JSON.stringify(sheet.rows);
const cleaned = applyClean(sheet.rows, sheet.headers.length, "all");
assert(JSON.stringify(sheet.rows) === before, "applyClean does not mutate");
const cleanedAnalysis = analyze({ headers: sheet.headers, rows: cleaned.rows });
assert(cleanedAnalysis.duplicateRowIndexes.length === 0, "all mode clears duplicate extras");
assert(cleanedAnalysis.missingCells.length === 0, "all mode clears missing cells");
assert(
  cleaned.removedDuplicates + cleaned.removedIncomplete === sheet.rows.length - cleaned.rows.length,
  "removal counts match the drop in length",
);
assert(cleaned.removedIncomplete === 5 && cleaned.removedDuplicates === 3, "all mode step counts");

const dupOnly = applyClean(sheet.rows, sheet.headers.length, "duplicates");
const dupAnalysis = analyze({ headers: sheet.headers, rows: dupOnly.rows });
assert(dupOnly.removedIncomplete === 0, "duplicates mode does not drop incomplete rows");
assert(dupOnly.removedDuplicates === analysis.duplicateRowIndexes.length, "duplicates mode removes extras");
assert(dupAnalysis.duplicateRowIndexes.length === 0, "duplicates mode leaves no extras");
assert(dupAnalysis.missingCells.length >= 4, "duplicates mode keeps incomplete rows");

const incOnly = applyClean(sheet.rows, sheet.headers.length, "incomplete");
const incAnalysis = analyze({ headers: sheet.headers, rows: incOnly.rows });
assert(incOnly.removedDuplicates === 0, "incomplete mode does not drop duplicates");
assert(incAnalysis.missingCells.length === 0, "incomplete mode clears missing cells");
assert(incAnalysis.duplicateRowIndexes.length >= 3, "incomplete mode keeps duplicate copies");
assert(removeIncompleteRows(sheet.rows, sheet.headers.length).length === sheet.rows.length - 5, "removeIncompleteRows");

const raw = 'customer,note\r\n"Hale, Jonah","She said ""hi"""\r\n';
const parsed = parseCsv(raw);
assert(parsed.rows[0][0] === "Hale, Jonah", "round-trip comma value");
assert(parsed.rows[0][1] === 'She said "hi"', "round-trip quote value");
const encoded = toCsv(parsed.headers, parsed.rows);
const again = parseCsv(encoded);
assert(again.rows[0][0] === parsed.rows[0][0] && again.rows[0][1] === parsed.rows[0][1], "toCsv round-trips comma and quote");
assert(encoded.endsWith("\r\n") && encoded.includes("\r\n"), "crlf joined and terminated");
assert(encoded.includes('"Hale, Jonah"') && encoded.includes('"She said ""hi"""'), "quoted serialization");
assert(toCsv(["city"], [["Austin"]]) === "city\r\nAustin\r\n", "plain fields stay unquoted");

const special = parseCsv(toCsv(["n"], [["a,b"], ['c"d'], ["e\nf"], ["g\rh"]]));
assert(
  special.rows.map((row) => row[0]).join("|") === 'a,b|c"d|e\nf|g\rh',
  "comma, quote, and line breaks round-trip",
);
assert(JSON.stringify(parseCsv(toCsv(sheet.headers, sheet.rows))) === JSON.stringify(sheet), "sample round-trip");

assert(cleanDownloadName("harbor-orders.csv") === "harbor-orders-clean.csv", "csv extension");
assert(cleanDownloadName("harbor-orders") === "harbor-orders-clean.csv", "no extension");
assert(cleanDownloadName("orders.backup.csv") === "orders.backup-clean.csv", "last extension only");
assert(cleanDownloadName(SAMPLE_NAME) === "harbor-orders-clean.csv", "sample download name");

downloadCsv(cleanDownloadName(SAMPLE_NAME), toCsv(sheet.headers, sheet.rows));

console.log("csv.check ok");
