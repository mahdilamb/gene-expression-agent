import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useSessionId } from "../../hooks/useSessionId";
import { useShowThreads } from "../../hooks/useShowThreads";
import { useThreads } from "../../hooks/useThreads";
import { AskPopup } from "./AskPopup";

type SortDir = "asc" | "desc" | null;

/** Deterministic thread id for a table row. */
function threadIdFor(sessionId: string, row: Record<string, unknown>): string {
  const key = Object.values(row).map((v) => String(v ?? "")).join("_");
  return `${sessionId}__row__${key}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Strip HTML tags from a string. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** Short human-readable summary of a row for the popup header. */
function rowSubject(row: Record<string, unknown>, columns: string[]): string {
  // Use the first non-numeric column value, or fall back to first column
  for (const col of columns) {
    const v = row[col];
    if (typeof v === "string" && v.trim()) return stripHtml(v);
  }
  const first = row[columns[0]!];
  return stripHtml(String(first ?? "row"));
}

/** Full row description sent as context to the agent. */
function rowContext(row: Record<string, unknown>, columns: string[]): string {
  const pairs = columns.map((col) => `${col}: ${stripHtml(formatCell(row[col]))}`);
  return `Table row — ${pairs.join(", ")}`;
}

function formatCell(value: unknown): string {
  if (typeof value === "number") return value.toFixed(4);
  return String(value ?? "");
}

/** Returns true if a string value contains HTML tags (from inline markdown rendering). */
function hasHtml(value: unknown): boolean {
  return typeof value === "string" && /<[a-z][\s\S]*>/i.test(value);
}

interface PopupState {
  subject: string;
  context: string;
  threadId: string;
  x: number;
  y: number;
}

export function Table({ raw }: { raw: string }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [filterInputs, setFilterInputs] = useState<Record<string, string>>({});
  const [popup, setPopup] = useState<PopupState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const filterBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tableId = useId();
  const sessionId = useSessionId();
  const { threadIds } = useThreads();
  const { showThreads } = useShowThreads();

  const handleClosePopup = useCallback(() => setPopup(null), []);

  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];
  let parseError = false;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      columns = Object.keys(parsed[0]!);
      rows = parsed as Record<string, unknown>[];
    } else if (typeof parsed === "object" && parsed !== null) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length > 0) {
        columns = ["key", "value"];
        rows = entries.map(([k, v]) => ({ key: k, value: v }));
      }
    } else {
      parseError = true;
    }
  } catch {
    parseError = true;
  }

  // Close popover on outside pointer-down (filter stays applied via filterInputs)
  useEffect(() => {
    if (!openFilterCol) return;
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.closest("th")?.contains(e.target as Node)) {
        setOpenFilterCol(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openFilterCol]);

  if (parseError || columns.length === 0) return <p>Invalid table data</p>;

  function handleSort(col: string) {
    if (sortKey !== col) {
      setSortKey(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  }

  function closeFilter(col: string) {
    setOpenFilterCol(null);
    filterBtnRefs.current[col]?.focus();
  }

  function toggleFilter(col: string) {
    setOpenFilterCol((prev) => (prev === col ? null : col));
    if (openFilterCol === col) filterBtnRefs.current[col]?.focus();
  }

  function handleClear(col: string) {
    setFilterInputs((prev) => ({ ...prev, [col]: "" }));
    closeFilter(col);
  }

  function handleRowClick(row: Record<string, unknown>, e: React.MouseEvent<HTMLTableRowElement>) {
    const tableEl = e.currentTarget.closest(".table-wrapper");
    const rect = tableEl?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPopup({
      subject: rowSubject(row, columns),
      context: rowContext(row, columns),
      threadId: threadIdFor(sessionId, row),
      x,
      y,
    });
  }

  // Filter live from filterInputs
  let filtered = rows;
  for (const [col, val] of Object.entries(filterInputs)) {
    if (!val.trim()) continue;
    filtered = filtered.filter((r) =>
      String(r[col] ?? "").toLowerCase().includes(val.toLowerCase())
    );
  }

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = av != null && bv != null && av < bv ? -1 : av != null && bv != null && av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  function sortIndicator(col: string) {
    if (sortKey !== col) return "⇅";
    return sortDir === "asc" ? "↑" : "↓";
  }

  const hasActiveState = sortKey !== null || Object.values(filterInputs).some((v) => v.trim());

  function handleReset() {
    setSortKey(null);
    setSortDir(null);
    setFilterInputs({});
    setOpenFilterCol(null);
  }

  return (
    <div className="table-wrapper">
      <div className="table-container">
        {hasActiveState && (
          <div className="table-toolbar">
            <button type="button" className="table-reset-btn" onClick={handleReset}>
              Reset view
            </button>
          </div>
        )}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {sorted.length} of {rows.length} rows
        </div>
        <table aria-label="Data table">
          <thead>
            <tr>
              {columns.map((col) => {
                const isFilterOpen = openFilterCol === col;
                const hasFilter = !!(filterInputs[col]?.trim());
                const popoverId = `${tableId}-filter-${col}`;
                return (
                  <th key={col} className="table-th" aria-sort={sortKey === col ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                    <div className="table-th-inner">
                      <span className="table-th-label">{col}</span>
                      <button
                        type="button"
                        ref={(el) => { filterBtnRefs.current[col] = el; }}
                        className={`table-th-icon${hasFilter ? " table-th-icon--active" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleFilter(col); }}
                        aria-label={`Filter by ${col}${hasFilter ? " (active)" : ""}`}
                        aria-expanded={isFilterOpen}
                        aria-controls={isFilterOpen ? popoverId : undefined}
                        aria-pressed={hasFilter}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="table-th-icon"
                        onClick={(e) => { e.stopPropagation(); handleSort(col); }}
                        aria-label={`Sort by ${col}`}
                      >
                        {sortIndicator(col)}
                      </button>
                    </div>
                    {isFilterOpen && (
                      <div
                        id={popoverId}
                        role="group"
                        aria-label={`Filter ${col}`}
                        className="table-filter-popover"
                        ref={popoverRef}
                      >
                        <input
                          className="table-filter-input"
                          type="search"
                          placeholder={`Filter ${col}…`}
                          value={filterInputs[col] ?? ""}
                          onChange={(e) => setFilterInputs((prev) => ({ ...prev, [col]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => closeFilter(col)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" || e.key === "Escape") {
                              if (e.key === "Escape") handleClear(col);
                              else closeFilter(col);
                              e.preventDefault();
                            }
                          }}
                          ref={(el) => { if (el) el.focus(); }}
                          aria-label={`Filter ${col} value`}
                        />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const hasThread = showThreads && threadIds.has(threadIdFor(sessionId, row));
              return (
                <tr
                  key={columns.map((col) => String(row[col] ?? "")).join("||")}
                  className={`table-row--clickable${hasThread ? " table-row--has-thread" : ""}`}
                  onClick={(e) => handleRowClick(row, e)}
                  title="Click to ask about this row"
                >
                  {columns.map((col, ci) => (
                    <td key={col}>
                      {ci === 0 && hasThread && (
                        <span className="table-thread-indicator" aria-label="Has thread">💬</span>
                      )}
                      {hasHtml(row[col])
                        ? <span dangerouslySetInnerHTML={{ __html: formatCell(row[col]) }} />
                        : formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {popup && (
        <AskPopup
          subject={popup.subject}
          context={popup.context}
          sessionId={sessionId}
          threadId={popup.threadId}
          position={{ x: popup.x, y: popup.y }}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}
