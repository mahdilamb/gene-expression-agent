import { marked } from "marked";

import { useShowThoughts } from "../hooks/useShowThoughts";
import { Chart } from "./widgets/Chart";
import { Table } from "./widgets/Table";
import { ThoughtGroup } from "./widgets/ThoughtGroup";

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
          if (!showThoughts) return null;
          return <ThoughtGroup key={i} thoughts={item.map((t) => t.value)} />;
        }
        switch (item.type) {
          case "CHART":
            return <Chart key={i} raw={item.value} />;
          case "TABLE":
            return <Table key={i} raw={item.value} />;
          case "text":
            return (
              <div
                key={i}
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(item.value) as string }}
              />
            );
        }
      })}
    </>
  );
}
