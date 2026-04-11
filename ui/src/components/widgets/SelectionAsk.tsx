import { useCallback, useEffect, useRef, useState } from "react";

import { useSessionId } from "../../hooks/useSessionId";
import { AskPopup } from "./AskPopup";

interface SelectionState {
  text: string;
  threadId: string;
  x: number;
  y: number;
}

/**
 * Wraps children and shows an "Ask about" popup when the user selects text.
 * The popup appears near the selection; clicking it opens a threaded side-chat.
 */
export function SelectionAsk({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionId = useSessionId();
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [popup, setPopup] = useState<SelectionState | null>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length < 2 || text.length > 200) {
      setSelection(null);
      return;
    }

    const anchor = sel?.anchorNode;
    if (!anchor || !containerRef.current?.contains(anchor)) {
      setSelection(null);
      return;
    }

    // Don't trigger on selections inside popups
    const anchorEl = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
    if (anchorEl?.closest(".ask-popup")) {
      setSelection(null);
      return;
    }

    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();

    const threadId = `${sessionId}__sel__${text}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);

    setSelection({
      text,
      threadId,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 4,
    });
  }, [sessionId]);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const handleAskClick = useCallback(() => {
    if (!selection) return;
    setPopup(selection);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [selection]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onUp = () => handleMouseUp();
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [handleMouseUp]);

  const truncated = selection ? (selection.text.length > 30 ? selection.text.slice(0, 30) + "..." : selection.text) : "";

  return (
    <div
      ref={containerRef}
      className="selection-ask-wrapper"
    >
      {children}
      {selection && !popup && (
        <button
          className="selection-ask-btn"
          style={{ left: selection.x, top: selection.y }}
          onClick={handleAskClick}
          aria-label={`Ask about "${truncated}"`}
        >
          Ask about &ldquo;{truncated}&rdquo;
        </button>
      )}
      {popup && (
        <AskPopup
          subject={popup.text.length > 40 ? popup.text.slice(0, 40) + "..." : popup.text}
          context={`The user highlighted this text: "${popup.text}"`}
          sessionId={sessionId}
          threadId={popup.threadId}
          position={{ x: popup.x, y: popup.y }}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
