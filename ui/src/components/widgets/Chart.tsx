import Plotly from "plotly.js-basic-dist-min";
import { useEffect, useMemo, useRef } from "react";

import { useTheme } from "../../hooks/useTheme";

interface ChartData {
  genes: string[];
  values: number[];
  title: string;
  x_label: string;
  y_label: string;
  hover_template?: string | null;
}

export function Chart({ raw }: { raw: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const parsed = useMemo<ChartData | null>(() => {
    try {
      return JSON.parse(raw) as ChartData;
    } catch {
      return null;
    }
  }, [raw]);

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
          x: parsed.genes,
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
    );

    return () => {
      Plotly.purge(el);
    };
  }, [parsed, theme]);

  if (!parsed) return <p>Invalid chart data</p>;

  return <div ref={containerRef} className="chart-container" />;
}
