import { marked } from "marked";

interface ThoughtProps {
  content: string;
  index?: number;
  total?: number;
  open?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function Thought({ content, index = 0, total = 1, open = false, onToggle }: ThoughtProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const position = isFirst && isLast ? "solo" : isFirst ? "first" : isLast ? "last" : "middle";

  return (
    <details
      className={`thought-expander thought-expander--${position}`}
      open={open}
      onToggle={(e) => {
        if (onToggle) e.preventDefault();
      }}
    >
      <summary
        onClick={(e) => {
          if (onToggle) {
            e.preventDefault();
            onToggle(!open);
          }
        }}
      >
        Thought
      </summary>
      <div
        className="thought-content markdown-body"
        dangerouslySetInnerHTML={{ __html: marked.parse(content.trim()) as string }}
      />
    </details>
  );
}
