import { useEffect, useId, useRef, useState } from "react";

type SortDir = "asc" | "desc" | null;

export function Table({ raw }: { raw: string }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [filterInputs, setFilterInputs] = useState<Record<string, string>>({});
  const popoverRef = useRef<HTMLDivElement>(null);
  const filterBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tableId = useId();

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

  function formatCell(value: unknown): string {
    if (typeof value === "number") return value.toFixed(4);
    return String(value ?? "");
  }

  const hasActiveState = sortKey !== null || Object.values(filterInputs).some((v) => v.trim());

  function handleReset() {
    setSortKey(null);
    setSortDir(null);
    setFilterInputs({});
    setOpenFilterCol(null);
  }

  return (
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
          {sorted.map((row) => (
            <tr key={columns.map((col) => String(row[col] ?? "")).join("||")}>
              {columns.map((col) => (
                <td key={col}>{formatCell(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
