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
    <div
      className={`thought-expander thought-expander--${position}${open ? " thought-expander--open" : ""}`}
      role="group"
    >
      <button
        type="button"
        className="thought-summary"
        onClick={() => onToggle?.(!open)}
        aria-expanded={open}
      >
        <span className="thought-arrow" />
        Thought
      </button>
      <div className="thought-content-wrapper">
        <div
          className="thought-content markdown-body"
          dangerouslySetInnerHTML={{ __html: marked.parse(content.trim()) as string }}
        />
      </div>
    </div>
  );
}
