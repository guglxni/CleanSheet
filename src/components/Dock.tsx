import type { RefObject } from "react";
import type { BarId } from "./types";

type DockProps = {
  openBar: BarId | null;
  onToggle: (id: BarId) => void;
  uploadRef: RefObject<HTMLButtonElement | null>;
  previewRef: RefObject<HTMLButtonElement | null>;
};

export function Dock({ openBar, onToggle, uploadRef, previewRef }: DockProps) {
  return (
    <div className="dock" role="group" aria-label="Upload and preview">
      <button
        ref={uploadRef}
        type="button"
        className="dock-btn"
        aria-expanded={openBar === "upload"}
        aria-controls="upload-bar"
        onClick={() => onToggle("upload")}
      >
        Upload
      </button>
      <button
        ref={previewRef}
        type="button"
        className="dock-btn"
        aria-expanded={openBar === "preview"}
        aria-controls="preview-bar"
        onClick={() => onToggle("preview")}
      >
        Preview
      </button>
    </div>
  );
}
