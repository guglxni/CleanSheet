import { useRef, useState, type DragEvent, type RefObject } from "react";
import { BarSheet } from "./BarSheet";

type UploadBarProps = {
  error: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  onFile: (file: File) => void;
  onSample: () => void;
};

export function UploadBar({ error, headingRef, onClose, onFile, onSample }: UploadBarProps) {
  const [hot, setHot] = useState(false);
  const depth = useRef(0);

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current += 1;
    setHot(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setHot(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setHot(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <BarSheet
      id="upload-bar"
      titleId="upload-title"
      title="Upload"
      tone="dark"
      headingRef={headingRef}
      onClose={onClose}
    >
      <div
        className={hot ? "drop is-hot" : "drop"}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <p>{hot ? "Drop to load." : "Drop a CSV here, or choose a file."}</p>
        <div className="drop-actions">
          <label className="btn file-btn">
            Choose CSV
            <input
              className="visually-hidden"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) onFile(file);
              }}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={onSample}>
            Load sample
          </button>
        </div>
      </div>
      {error ? (
        <p className="upload-error" role="alert">
          {error}
        </p>
      ) : null}
    </BarSheet>
  );
}
