import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Analysis } from "../lib/csv";
import { BarSheet } from "./BarSheet";
import { PREVIEW_LARGE, PREVIEW_STEP } from "./format";
import { columnTitle, isBlank } from "./rows";
import type { LoadedSheet, RowFilter } from "./types";

type PreviewBarProps = {
  sheet: LoadedSheet | null;
  analysis: Analysis | null;
  filter: RowFilter;
  cap: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  onFilter: (filter: RowFilter) => void;
  onShowMore: () => void;
  onClean: () => void;
  onDownload: () => void;
};

export function PreviewBar({
  sheet,
  analysis,
  filter,
  cap,
  headingRef,
  onClose,
  onFilter,
  onShowMore,
  onClean,
  onDownload,
}: PreviewBarProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const view = useMemo(() => buildView(sheet, analysis, filter), [sheet, analysis, filter]);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
  }, [filter, sheet]);

  const loaded = sheet !== null && analysis !== null;
  const large = (sheet?.rows.length ?? 0) >= PREVIEW_LARGE;
  const activeCap = large ? Math.min(cap, PREVIEW_STEP) : cap;
  const shown = view.indexes.slice(0, activeCap);
  const truncated = view.indexes.length > shown.length;
  const canShowMore = loaded && !large && truncated;
  const cleanDisabled =
    !analysis ||
    (analysis.duplicateRowIndexes.length === 0 && analysis.rowsWithMissing.length === 0);

  const toolbar = sheet && analysis ? (
    <div className="sheet-toolbar">
      <div className="preview-id">
        <p className="preview-name">{sheet.name}</p>
        <p className="preview-counts">
          {countLabel(sheet.rows.length, "row", "rows")}
          <span aria-hidden="true"> · </span>
          {countLabel(sheet.headers.length, "column", "columns")}
        </p>
      </div>
      <div className="filters" role="group" aria-label="Filter rows">
        <button
          type="button"
          className="chip"
          aria-pressed={filter === "all"}
          onClick={() => onFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={filter === "issues"}
          onClick={() => onFilter("issues")}
        >
          Issues
        </button>
      </div>
    </div>
  ) : null;

  const footer = (
    <>
      {sheet && analysis && truncated ? (
        <p className="limit-note">{limitNote(shown.length, view.indexes.length, large)}</p>
      ) : null}
      {canShowMore ? (
        <button type="button" className="btn" onClick={onShowMore}>
          Show more
        </button>
      ) : null}
      {sheet && analysis ? (
        <p className="scope-note">
          Cleaning uses the full working sheet, not the filtered preview.
        </p>
      ) : null}
      <div className="foot-actions">
        <button type="button" className="btn btn-primary" disabled={cleanDisabled} onClick={onClean}>
          Clean sheet
        </button>
        <button type="button" className="btn" disabled={!sheet} onClick={onDownload}>
          Download CSV
        </button>
      </div>
    </>
  );

  return (
    <BarSheet
      id="preview-bar"
      titleId="preview-title"
      title="Preview"
      tone="paper"
      headingRef={headingRef}
      onClose={onClose}
      toolbar={toolbar}
      footer={footer}
      bodyRef={bodyRef}
    >
      {sheet && analysis ? (
        <table className="preview-table">
          <caption>Working rows in {sheet.name}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky-col">
                Row
              </th>
              {sheet.headers.map((header, index) => {
                const title = columnTitle(header, index);
                return (
                  <th scope="col" key={index}>
                    <span className="col-head" title={title}>
                      {title}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td className="table-message" colSpan={sheet.headers.length + 1}>
                  {sheet.rows.length === 0
                    ? "This sheet has no data rows."
                    : "No rows match this filter."}
                </td>
              </tr>
            ) : (
              shown.map((rowIndex) => {
                const row = sheet.rows[rowIndex] ?? [];
                const duplicate = view.duplicateRows.has(rowIndex);
                return (
                  <tr key={rowIndex} className={duplicate ? "is-dup" : undefined}>
                    <th scope="row" className="sticky-col">
                      <span className="row-id">
                        <span className="row-num">{rowIndex + 1}</span>
                        {duplicate ? <span className="dup-flag">Duplicate</span> : null}
                      </span>
                    </th>
                    {sheet.headers.map((_, col) => {
                      const value = row[col] ?? "";
                      const missing = view.missingKeys.has(`${rowIndex}:${col}`);
                      return (
                        <td key={col} className={missing ? "is-missing" : undefined} title={isBlank(value) ? undefined : value}>
                          {isBlank(value) ? (
                            <span className="blank-word">blank</span>
                          ) : (
                            <span className="cell-text">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      ) : (
        <p className="preview-empty">Load a CSV to preview it.</p>
      )}
    </BarSheet>
  );
}

function buildView(sheet: LoadedSheet | null, analysis: Analysis | null, filter: RowFilter) {
  const duplicateRows = new Set(analysis?.duplicateRowIndexes ?? []);
  const missingRows = new Set(analysis?.rowsWithMissing ?? []);
  const missingKeys = new Set((analysis?.missingCells ?? []).map((cell) => `${cell.row}:${cell.col}`));
  const indexes: number[] = [];
  const total = sheet?.rows.length ?? 0;
  for (let index = 0; index < total; index += 1) {
    if (filter === "all" || duplicateRows.has(index) || missingRows.has(index)) indexes.push(index);
  }
  return { indexes, duplicateRows, missingKeys };
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function limitNote(shown: number, inView: number, large: boolean): string {
  const lead = `Showing ${shown.toLocaleString()} of ${inView.toLocaleString()} rows.`;
  if (large) {
    return `${lead} This preview stays at ${PREVIEW_STEP.toLocaleString()} rows because the sheet has ${PREVIEW_LARGE.toLocaleString()} or more. Download still includes every row.`;
  }
  return `${lead} This preview is truncated. Download still includes every row.`;
}
