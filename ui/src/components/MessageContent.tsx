import { marked, type Tokens } from "marked";

import { useShowThoughts } from "../hooks/useShowThoughts";
import { Chart } from "./widgets/Chart";
import { Table } from "./widgets/Table";
import { ThoughtGroup } from "./widgets/ThoughtGroup";

/**
 * Custom marked renderer that converts markdown tables into <!--MD_TABLE:json-->
 * placeholders so they can be rendered as interactive Table widgets.
 */
const renderer = new marked.Renderer();
renderer.table = (token: Tokens.Table): string => {
  const headers = token.header.map((h) => h.text);
  const rows = token.rows.map((row) =>
    Object.fromEntries(row.map((cell, i) => {
      // Render inline markdown (bold, italic, code, etc.) to HTML
      const html = marked.parseInline(cell.text) as string;
      // If rendering produced HTML tags, keep as string; otherwise coerce numbers
      if (html !== cell.text) {
        return [headers[i]!, html];
      }
      const n = Number(cell.text);
      return [headers[i]!, cell.text !== "" && !isNaN(n) ? n : cell.text];
    })),
  );
  const json = JSON.stringify(rows);
  // Use a base64-encoded data attribute so the JSON doesn't interfere with HTML parsing
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `<div data-md-table="${encoded}"></div>`;
};
marked.use({ renderer });

const WIDGET_TYPES = ["CHART", "THINKING", "TABLE"] as const;
type WidgetType = (typeof WIDGET_TYPES)[number];

const WIDGET_PATTERN_STR = WIDGET_TYPES.join("|");
const SPLIT_RE = new RegExp(`\\s*<!--(${WIDGET_PATTERN_STR}):(.*?)-->\\s*`, "gs");

interface Token {
  type: "text" | WidgetType;
  value: string;
}

export function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(SPLIT_RE)) {
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) tokens.push({ type: "text", value: before.trim() });
    tokens.push({ type: match[1] as WidgetType, value: match[2]! });
    lastIndex = match.index! + match[0].length;
  }

  const after = content.slice(lastIndex);
  if (after.trim()) tokens.push({ type: "text", value: after.trim() });

  return tokens;
}

/** Strip widget markers for the live streaming preview. */
export function stripMarkers(content: string): string {
  return content.replace(SPLIT_RE, "").trim();
}

/** Collapse runs of consecutive THINKING tokens into groups. */
function groupTokens(tokens: Token[]): Array<Token | Token[]> {
  const result: Array<Token | Token[]> = [];
  for (let i = 0; i < tokens.length; ) {
    const token = tokens[i]!;
    if (token.type === "THINKING") {
      const group: Token[] = [];
      while (i < tokens.length && tokens[i]!.type === "THINKING") {
        group.push(tokens[i++]!);
      }
      result.push(group);
    } else {
      result.push(token);
      i++;
    }
  }
  return result;
}

export function MessageContent({ content }: { content: string }) {
  const { showThoughts } = useShowThoughts();
  const groups = groupTokens(tokenize(content));

  return (
    <>
      {groups.map((item, i) => {
        if (Array.isArray(item)) {
          return (
            <div key={i} className={`thought-group-wrapper${showThoughts ? " thought-group-wrapper--visible" : ""}`}>
              <ThoughtGroup thoughts={item.map((t) => t.value)} />
            </div>
          );
        }
        switch (item.type) {
          case "CHART":
            return <Chart key={i} raw={item.value} />;
          case "TABLE":
            return <Table key={i} raw={item.value} />;
          case "text":
            return <MarkdownWithTables key={i} markdown={item.value} />;
        }
      })}
    </>
  );
}

const MD_TABLE_RE = /(<div data-md-table="[^"]*"><\/div>)/g;

/** Renders markdown, replacing any markdown tables with interactive Table widgets. */
function MarkdownWithTables({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown) as string;

  if (!MD_TABLE_RE.test(html)) {
    return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  MD_TABLE_RE.lastIndex = 0;
  const segments = html.split(MD_TABLE_RE);

  return (
    <>
      {segments.map((segment, i) => {
        const attrMatch = segment.match(/^<div data-md-table="([^"]*)">/);
        if (attrMatch) {
          const json = decodeURIComponent(escape(atob(attrMatch[1]!)));
          return <Table key={i} raw={json} />;
        }
        if (segment.trim()) {
          return <div key={i} className="markdown-body" dangerouslySetInnerHTML={{ __html: segment }} />;
        }
        return null;
      })}
    </>
  );
}
