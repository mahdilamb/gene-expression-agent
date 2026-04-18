import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSessionId } from "../../hooks/useSessionId";
import { useShowThreads } from "../../hooks/useShowThreads";
import { useThreads } from "../../hooks/useThreads";
import { AskPopup } from "./AskPopup";

interface SelectionState {
  text: string;
  threadId: string;
  x: number;
  y: number;
}

/**
 * Wraps children and shows an "Ask about" popup when the user selects text.
 * On hover, underlines text that has existing selection-based threads.
 */
export function SelectionAsk({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionId = useSessionId();
  const { threadMeta } = useThreads();
  const { showThreads } = useShowThreads();
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [popup, setPopup] = useState<SelectionState | null>(null);
  const [hovered, setHovered] = useState(false);

  // Map highlight text -> thread metadata for selection-based threads
  const highlightMap = useMemo(() => {
    if (!showThreads) return new Map<string, { threadId: string; text: string }>();
    const map = new Map<string, { threadId: string; text: string }>();
    for (const meta of threadMeta.values()) {
      if (meta.highlight_text) {
        map.set(meta.highlight_text, { threadId: meta.thread_id, text: meta.highlight_text });
      }
    }
    return map;
  }, [threadMeta, showThreads]);

  const highlightTexts = useMemo(() => Array.from(highlightMap.keys()), [highlightMap]);

  // Apply/remove underline marks on hover
  useEffect(() => {
    const el = containerRef.current;
    if (!el || highlightTexts.length === 0) return;

    if (!hovered && !popup) {
      // Remove all marks when not hovered and no popup open
      el.querySelectorAll("mark.thread-highlight").forEach((mark) => {
        const parent = mark.parentNode!;
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
      });
      return;
    }

    // Update active state on existing marks
    el.querySelectorAll("mark.thread-highlight").forEach((mark) => {
      const isActive = popup && mark.textContent === popup.text;
      mark.classList.toggle("thread-highlight--active", !!isActive);
    });

    // Walk text nodes and wrap matches
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      // Skip nodes inside popups or already-marked nodes
      if (node.parentElement?.closest(".ask-popup, mark.thread-highlight")) continue;
      textNodes.push(node);
    }

    for (const node of textNodes) {
      let text = node.textContent ?? "";
      const fragments: Array<string | { highlight: string }> = [];
      let modified = false;

      for (const highlight of highlightTexts) {
        const parts: typeof fragments = [];
        for (const frag of fragments.length ? fragments : [text]) {
          if (typeof frag !== "string") {
            parts.push(frag);
            continue;
          }
          let remaining = frag;
          let idx: number;
          while ((idx = remaining.indexOf(highlight)) !== -1) {
            if (idx > 0) parts.push(remaining.slice(0, idx));
            parts.push({ highlight });
            remaining = remaining.slice(idx + highlight.length);
            modified = true;
          }
          if (remaining) parts.push(remaining);
        }
        fragments.length = 0;
        fragments.push(...parts);
      }

      if (!modified) continue;

      const parent = node.parentNode!;
      for (const frag of fragments) {
        if (typeof frag === "string") {
          parent.insertBefore(document.createTextNode(frag), node);
        } else {
          const mark = document.createElement("mark");
          mark.className = "thread-highlight";
          mark.textContent = frag.highlight;
          const entry = highlightMap.get(frag.highlight);
          if (entry) {
            mark.addEventListener("click", (e) => {
              e.stopPropagation();
              const containerRect = containerRef.current!.getBoundingClientRect();
              const markRect = mark.getBoundingClientRect();
              setPopup({
                text: entry.text,
                threadId: entry.threadId,
                x: markRect.left - containerRect.left + markRect.width / 2,
                y: markRect.top - containerRect.top - 4,
              });
            });
          }
          parent.insertBefore(mark, node);
        }
      }
      parent.removeChild(node);
    }
  }, [hovered, highlightTexts, popup, highlightMap]);

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
          highlightText={popup.text}
          sessionId={sessionId}
          threadId={popup.threadId}
          position={{ x: popup.x, y: popup.y }}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
