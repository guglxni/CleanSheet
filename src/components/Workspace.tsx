import { useMemo } from "react";
import type { Analysis } from "../lib/csv";
import { columnTitle, sameRows } from "./rows";
import type { CleanMode, LoadedSheet } from "./types";

type WorkspaceProps = {
  sheet: LoadedSheet | null;
  analysis: Analysis | null;
  afterClean: number;
  onLoadSample: () => void;
  onOpenUpload: () => void;
  onClean: (mode: CleanMode) => void;
  onRestore: () => void;
  onDownload: () => void;
};

export function Workspace({
  sheet,
  analysis,
  afterClean,
  onLoadSample,
  onOpenUpload,
  onClean,
  onRestore,
  onDownload,
}: WorkspaceProps) {
  return (
    <div className="workspace">
      <div className="intro">
        <header className="mast">
          <div>
            <p className="eyebrow">CSV desk</p>
            <h1 className="wordmark">
              Clean <em>sheet</em>
            </h1>
          </div>
          {sheet ? (
            <p className="current-file">
              <span className="visually-hidden">Loaded file </span>
              {sheet.name}
            </p>
          ) : null}
        </header>
        <p className="lede">
          Upload a spreadsheet, see duplicate rows and blank cells, then download a version with
          those rows removed.
        </p>
      </div>
      {sheet && analysis ? (
        <LoadedDesk
          sheet={sheet}
          analysis={analysis}
          afterClean={afterClean}
          onClean={onClean}
          onRestore={onRestore}
          onDownload={onDownload}
        />
      ) : (
        <EmptyState onLoadSample={onLoadSample} onOpenUpload={onOpenUpload} />
      )}
    </div>
  );
}

function EmptyState({
  onLoadSample,
  onOpenUpload,
}: {
  onLoadSample: () => void;
  onOpenUpload: () => void;
}) {
  return (
    <div className="empty">
      <div className="scrap" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <h2>Nothing loaded yet</h2>
        <p>Load the sample, or open Upload and choose a CSV.</p>
        <div className="empty-actions">
          <button type="button" className="btn btn-primary" onClick={onLoadSample}>
            Load sample
          </button>
          <button type="button" className="btn" onClick={onOpenUpload}>
            Open upload
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadedDesk({
  sheet,
  analysis,
  afterClean,
  onClean,
  onRestore,
  onDownload,
}: {
  sheet: LoadedSheet;
  analysis: Analysis;
  afterClean: number;
  onClean: (mode: CleanMode) => void;
  onRestore: () => void;
  onDownload: () => void;
}) {
  const unchanged = useMemo(() => sameRows(sheet.rows, sheet.original), [sheet]);
  const blankColumns = analysis.missingByColumn.filter((column) => column.count > 0);
  const groups = analysis.duplicateGroups.slice(0, 5);
  const extraGroups = analysis.duplicateGroups.length - groups.length;
  const noDuplicates = analysis.duplicateRowIndexes.length === 0;
  const noIncomplete = analysis.rowsWithMissing.length === 0;

  return (
    <>
      <div className="summary">
        <dl className="stats">
          <div className="stat">
            <dt>Rows (current)</dt>
            <dd>{sheet.rows.length.toLocaleString()}</dd>
          </div>
          <div className="stat">
            <dt>Duplicate rows</dt>
            <dd>{analysis.duplicateRowIndexes.length.toLocaleString()}</dd>
          </div>
          <div className="stat">
            <dt>Blank cells</dt>
            <dd>{analysis.missingCells.length.toLocaleString()}</dd>
          </div>
          <div className="stat">
            <dt>After clean</dt>
            <dd>
              {afterClean.toLocaleString()}
              <span className="visually-hidden"> rows</span>
            </dd>
          </div>
        </dl>
        <p className="definition">
          A duplicate matches another row in every column. A blank cell is empty.
        </p>
      </div>
      <div className="insights">
        <section className="panel" aria-labelledby="blank-columns">
          <h2 id="blank-columns">Blank cells by column</h2>
          {blankColumns.length === 0 ? (
            <p className="quiet">No blank cells.</p>
          ) : (
            <ul className="columns">
              {blankColumns.map((column) => (
                <li key={column.index}>
                  <div className="col-line">
                    <span className="col-name" title={columnTitle(column.header, column.index)}>
                      {columnTitle(column.header, column.index)}
                    </span>
                    <span className="col-count">
                      {column.count.toLocaleString()}
                      <span className="visually-hidden">
                        {column.count === 1 ? " blank cell" : " blank cells"}
                      </span>
                    </span>
                  </div>
                  <div className="meter" aria-hidden="true">
                    <span className="meter-fill" style={{ width: blankBar(column.count, sheet.rows.length) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="duplicate-groups">
          <h2 id="duplicate-groups">Duplicate groups</h2>
          {groups.length === 0 ? (
            <p className="quiet">No duplicate rows.</p>
          ) : (
            <>
              <ul className="groups">
                {groups.map((group) => (
                  <li key={group.indexes[0] ?? group.key}>
                    <div className="group-line">
                      <span className="group-label" title={group.label}>
                        {group.label}
                      </span>
                      <span className="group-count">
                        {group.indexes.length.toLocaleString()}{" "}
                        {group.indexes.length === 1 ? "copy" : "copies"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {extraGroups > 0 ? <p className="and-more">and {extraGroups.toLocaleString()} more</p> : null}
            </>
          )}
        </section>
      </div>
      <div className="actions">
        <button type="button" className="btn" disabled={noDuplicates} onClick={() => onClean("duplicates")}>
          Remove duplicates
        </button>
        <button type="button" className="btn" disabled={noIncomplete} onClick={() => onClean("incomplete")}>
          Remove incomplete rows
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={noDuplicates && noIncomplete}
          onClick={() => onClean("all")}
        >
          Clean sheet
        </button>
        <button type="button" className="btn" disabled={unchanged} onClick={onRestore}>
          Restore original
        </button>
        <button type="button" className="btn" onClick={onDownload}>
          Download CSV
        </button>
      </div>
    </>
  );
}

function blankBar(count: number, rowCount: number): string {
  if (count <= 0 || rowCount <= 0) return "0%";
  const percent = (count / rowCount) * 100;
  return `${Math.min(100, Math.max(percent, 3))}%`;
}
