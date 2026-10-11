import type { ReactNode, RefObject } from "react";

type BarSheetProps = {
  id: string;
  titleId: string;
  title: string;
  tone: "dark" | "paper";
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  bodyRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

export function BarSheet({
  id,
  titleId,
  title,
  tone,
  headingRef,
  onClose,
  toolbar,
  footer,
  bodyRef,
  children,
}: BarSheetProps) {
  return (
    <section
      id={id}
      className={tone === "paper" ? "sheet sheet-paper" : "sheet sheet-dark"}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <header className="sheet-head">
        <div className="sheet-titlebar">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="sheet-title">
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        {toolbar}
      </header>
      <div className="sheet-body" ref={bodyRef}>
        {children}
      </div>
      {footer ? <footer className="sheet-foot">{footer}</footer> : null}
    </section>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M4.5 4.5l9 9M13.5 4.5l-9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
