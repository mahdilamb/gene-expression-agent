import { useState } from "react";

import { Thought } from "./Thought";

interface ThoughtGroupProps {
  thoughts: string[];
}

export function ThoughtGroup({ thoughts }: ThoughtGroupProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="thought-group">
      {thoughts.map((content, i) => (
        <Thought
          key={i}
          content={content}
          index={i}
          total={thoughts.length}
          open={openIndex === i}
          onToggle={(isOpen) => setOpenIndex(isOpen ? i : null)}
        />
      ))}
    </div>
  );
}
