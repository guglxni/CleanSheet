import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  analyze,
  applyClean,
  cleanDownloadName,
  downloadCsv,
  parseCsv,
  toCsv,
} from "./lib/csv";
import { SAMPLE_CSV, SAMPLE_NAME } from "./lib/sample";
import { Dock } from "./components/Dock";
import { cleanStatus, errorText, loadStatus, PREVIEW_LARGE, PREVIEW_STEP } from "./components/format";
import { PreviewBar } from "./components/PreviewBar";
import { cloneRows } from "./components/rows";
import type { BarId, CleanMode, LoadedSheet, RowFilter } from "./components/types";
import { UploadBar } from "./components/UploadBar";
import { Workspace } from "./components/Workspace";

export default function App() {
  const [sheet, setSheet] = useState<LoadedSheet | null>(null);
  const [openBar, setOpenBar] = useState<BarId | null>("upload");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState<RowFilter>("all");
  const [previewCap, setPreviewCap] = useState(PREVIEW_STEP);

  const uploadHeadingRef = useRef<HTMLHeadingElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const uploadToggleRef = useRef<HTMLButtonElement>(null);
  const previewToggleRef = useRef<HTMLButtonElement>(null);
  const previousBar = useRef<BarId | null>(openBar);

  useLayoutEffect(() => {
    const previous = previousBar.current;
    previousBar.current = openBar;
    if (openBar === "upload") {
      uploadHeadingRef.current?.focus({ preventScroll: true });
      return;
    }
    if (openBar === "preview") {
      previewHeadingRef.current?.focus({ preventScroll: true });
      return;
    }
    const toggle = previous === "preview" ? previewToggleRef.current : uploadToggleRef.current;
    toggle?.focus({ preventScroll: true });
  }, [openBar]);

  useEffect(() => {
    if (!openBar) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenBar(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openBar]);

  useEffect(() => {
    const blockNavigation = (event: DragEvent) => {
      event.preventDefault();
    };
    window.addEventListener("dragover", blockNavigation);
    window.addEventListener("drop", blockNavigation);
    return () => {
      window.removeEventListener("dragover", blockNavigation);
      window.removeEventListener("drop", blockNavigation);
    };
  }, []);

  const analysis = useMemo(
    () => (sheet ? analyze({ headers: sheet.headers, rows: sheet.rows }) : null),
    [sheet],
  );

  const afterClean = useMemo(() => {
    if (!sheet) return 0;
    return applyClean(sheet.rows, sheet.headers.length, "all").rows.length;
  }, [sheet]);

  function commitSheet(name: string, parsed: { headers: string[]; rows: string[][] }) {
    setSheet({
      name,
      headers: parsed.headers.slice(),
      original: cloneRows(parsed.rows),
      rows: cloneRows(parsed.rows),
    });
    setError(null);
    setFilter("all");
    setPreviewCap(PREVIEW_STEP);
    setStatus(loadStatus(name, parsed.rows.length, parsed.headers.length));
    setOpenBar("preview");
  }

  function openFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        commitSheet(file.name || "upload.csv", parseCsv(text));
      } catch (caught) {
        setError(errorText(caught, "Could not parse that CSV."));
      }
    };
    reader.onerror = () => {
      setError("Could not read that file.");
    };
    reader.readAsText(file);
  }

  function loadSample() {
    try {
      commitSheet(SAMPLE_NAME, parseCsv(SAMPLE_CSV));
    } catch (caught) {
      setError(errorText(caught, "Could not parse the sample."));
      setOpenBar("upload");
    }
  }

  function openUpload() {
    if (openBar === "upload") {
      uploadHeadingRef.current?.focus({ preventScroll: true });
      return;
    }
    setOpenBar("upload");
  }

  function toggleBar(id: BarId) {
    setOpenBar((current) => (current === id ? null : id));
  }

  function clean(mode: CleanMode) {
    if (!sheet) return;
    const result = applyClean(sheet.rows, sheet.headers.length, mode);
    setSheet({ ...sheet, rows: cloneRows(result.rows) });
    setStatus(
      cleanStatus(result.removedIncomplete, result.removedDuplicates, result.rows.length),
    );
  }

  function restore() {
    if (!sheet) return;
    setSheet({ ...sheet, rows: cloneRows(sheet.original) });
    setStatus("Restored the original sheet.");
  }

  function download() {
    if (!sheet) return;
    const filename = cleanDownloadName(sheet.name);
    try {
      downloadCsv(filename, toCsv(sheet.headers, sheet.rows));
      setStatus(`Downloaded ${filename}.`);
    } catch (caught) {
      setStatus(errorText(caught, "Could not download that CSV."));
    }
  }

  function showMore() {
    if (!sheet || sheet.rows.length >= PREVIEW_LARGE) return;
    setPreviewCap((current) => current + PREVIEW_STEP);
  }

  return (
    <div className="app">
      <div className="lamp" aria-hidden="true" />
      <main className="page" inert={openBar !== null}>
        <div className="page-inner">
          <Workspace
            sheet={sheet}
            analysis={analysis}
            afterClean={afterClean}
            onLoadSample={loadSample}
            onOpenUpload={openUpload}
            onClean={clean}
            onRestore={restore}
            onDownload={download}
          />
        </div>
      </main>
      {openBar !== null ? (
        <div
          className="backdrop"
          aria-hidden="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenBar(null)}
        />
      ) : null}
      <div className="stage">
        {openBar === "upload" ? (
          <UploadBar
            error={error}
            headingRef={uploadHeadingRef}
            onClose={() => setOpenBar(null)}
            onFile={openFile}
            onSample={loadSample}
          />
        ) : null}
        {openBar === "preview" ? (
          <PreviewBar
            sheet={sheet}
            analysis={analysis}
            filter={filter}
            cap={previewCap}
            headingRef={previewHeadingRef}
            onClose={() => setOpenBar(null)}
            onFilter={setFilter}
            onShowMore={showMore}
            onClean={() => clean("all")}
            onDownload={download}
          />
        ) : null}
        <p
          className={status ? "status" : "status status-blank"}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {status}
        </p>
        <Dock
          openBar={openBar}
          onToggle={toggleBar}
          uploadRef={uploadToggleRef}
          previewRef={previewToggleRef}
        />
      </div>
    </div>
  );
}
