import Plotly from "plotly.js-basic-dist-min";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSessionId } from "../../hooks/useSessionId";
import { useShowThreads } from "../../hooks/useShowThreads";
import { useThreads } from "../../hooks/useThreads";
import { useTheme } from "../../hooks/useTheme";
import { AskPopup } from "./AskPopup";

/** Deterministic thread id so reopening the same bar resumes the conversation. */
function threadIdFor(sessionId: string, chartTitle: string, label: string): string {
  return `${sessionId}__chart__${chartTitle}__${label}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

interface ChartData {
  labels: string[];
  values: number[];
  title: string;
  x_label: string;
  y_label: string;
  hover_template?: string | null;
  ask_message?: string | null;
}

interface PopupState {
  subject: string;
  context: string;
  threadId: string;
  x: number;
  y: number;
}

interface IndicatorPos {
  label: string;
  value: number;
  threadId: string;
  left: number;
  top: number;
}

export function Chart({ raw }: { raw: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const sessionId = useSessionId();
  const { threadIds } = useThreads();
  const { showThreads } = useShowThreads();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [indicators, setIndicators] = useState<IndicatorPos[]>([]);

  const parsed = useMemo<ChartData | null>(() => {
    try {
      return JSON.parse(raw) as ChartData;
    } catch {
      return null;
    }
  }, [raw]);

  const handleClose = useCallback(() => setPopup(null), []);

  const openPopupForLabel = useCallback(
    (label: string, value: number, x: number, y: number) => {
      const tid = threadIdFor(sessionId, parsed?.title ?? "", label);
      setPopup({
        subject: label,
        context: `Chart: "${parsed?.title}", Bar: "${label}", Value: ${value}`,
        threadId: tid,
        x,
        y,
      });
    },
    [sessionId, parsed],
  );

  // Compute indicator positions after Plotly renders or threadIds change
  const updateIndicators = useCallback(() => {
    const el = containerRef.current;
    if (!el || !parsed) return;

    const bars = el.querySelectorAll<SVGRectElement>(".plot-container .trace.bars .point");
    const plotArea = el.querySelector(".plot-container .draglayer");
    if (!plotArea) return;

    const containerRect = el.getBoundingClientRect();
    const positions: IndicatorPos[] = [];

    parsed.labels.forEach((label, i) => {
      const tid = threadIdFor(sessionId, parsed.title, label);
      if (!threadIds.has(tid)) return;

      const bar = bars[i];
      if (!bar) return;

      const barRect = bar.getBoundingClientRect();
      positions.push({
        label,
        value: parsed.values[i]!,
        threadId: tid,
        left: barRect.left - containerRect.left + barRect.width / 2,
        top: barRect.top - containerRect.top - 8,
      });
    });

    setIndicators(positions);
  }, [parsed, sessionId, threadIds]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !parsed) return;

    const isDark = theme === "dark";
    const fontColor = isDark ? "#e8e8e8" : "#222222";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    Plotly.newPlot(
      el,
      [
        {
          type: "bar",
          x: parsed.labels,
          y: parsed.values,
          marker: { color: isDark ? "#7c8ffc" : "#4a54d4" },
          hovertemplate: parsed.hover_template ?? undefined,
        },
      ],
      {
        title: { text: parsed.title, font: { color: fontColor } },
        xaxis: { title: { text: parsed.x_label }, color: fontColor, gridcolor: gridColor },
        yaxis: { title: { text: parsed.y_label }, color: fontColor, gridcolor: gridColor },
        font: { family: "Inter, system-ui, sans-serif", color: fontColor },
        height: 400,
        margin: { l: 40, r: 20, t: 40, b: 40 },
        plot_bgcolor: "rgba(0,0,0,0)",
        paper_bgcolor: "rgba(0,0,0,0)",
        autosize: true,
      },
      { responsive: true, displaylogo: false },
    ).then(() => updateIndicators());

    if (parsed.ask_message) {
      const onClick = (data: Plotly.PlotMouseEvent) => {
        const point = data.points[0];
        if (!point) return;
        const label = String(point.x);
        const value = Number(point.y);

        const rect = el.getBoundingClientRect();
        const evt = data.event as unknown as MouseEvent;
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        openPopupForLabel(label, value, x, y);
      };

      (el as unknown as Plotly.PlotlyHTMLElement).on("plotly_click", onClick);
    }

    // Reposition thread indicators when the window resizes
    const onResize = () => {
      Plotly.Plots.resize(el);
      updateIndicators();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      (el as unknown as Plotly.PlotlyHTMLElement).removeAllListeners?.("plotly_click");
      Plotly.purge(el);
    };
  }, [parsed, theme]);

  // Re-compute indicator positions when threadIds change
  useEffect(() => {
    updateIndicators();
  }, [updateIndicators]);

  if (!parsed) return <p>Invalid chart data</p>;

  return (
    <div className="chart-wrapper">
      <div ref={containerRef} className="chart-container" />
      {parsed.ask_message &&
        showThreads &&
        indicators.map((ind) => (
          <button
            key={ind.threadId}
            className="thread-indicator"
            style={{ left: ind.left, top: ind.top }}
            title={`Thread on ${ind.label}`}
            aria-label={`Open thread for ${ind.label}`}
            onClick={(e) => {
              const rect = containerRef.current!.getBoundingClientRect();
              openPopupForLabel(ind.label, ind.value, e.clientX - rect.left, e.clientY - rect.top);
            }}
          >
            💬
          </button>
        ))}
      {parsed.ask_message && popup && (
        <AskPopup
          subject={popup.subject}
          context={popup.context}
          sessionId={sessionId}
          threadId={popup.threadId}
          position={{ x: popup.x, y: popup.y }}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
