import { useEffect, useRef } from "react";
import { marked } from "marked";

import type { SessionMessage } from "../api/client";
import { useShowThoughts } from "../hooks/useShowThoughts";

import { MessageContent, stripMarkers, tokenize } from "./MessageContent";
import { ThoughtGroup } from "./widgets/ThoughtGroup";

interface MessageListProps {
  messages: SessionMessage[];
  streaming: boolean;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="message-list" role="log" aria-live="polite" aria-label="Conversation">
      {messages.map((msg, i) => {
        const role = msg.role ?? "";
        const content = msg.content ?? "";
        const isAssistant = role === "assistant";
        const isLast = i === messages.length - 1;
        const isStreamingMsg = isAssistant && isLast && streaming;

        const msgId = msg.id ? `msg-${msg.id}` : `msg-${i}`;

        return (
          <div
            key={msgId}
            id={msgId}
            className={`message ${isAssistant ? "assistant" : "user"}`}
            aria-label={isAssistant ? "Jean's message" : "Your message"}
          >
            <div className="message-role" aria-hidden="true">{isAssistant ? "Jean" : "You"}</div>
            <div className="message-body">
              {isStreamingMsg ? (
                <StreamingContent content={content} />
              ) : (
                <MessageContent content={content} />
              )}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

/** Returns true while a <!--THINKING: block has opened but --> hasn't arrived yet. */
function hasOpenThought(content: string): boolean {
  const last = content.lastIndexOf("<!--THINKING:");
  if (last === -1) return false;
  return !content.includes("-->", last);
}

function StreamingContent({ content }: { content: string }) {
  const { showThoughts } = useShowThoughts();
  const tokens = tokenize(content);

  const completedThoughts = tokens
    .filter((t) => t.type === "THINKING")
    .map((t) => t.value);

  const inProgress = hasOpenThought(content);
  const display = stripMarkers(content);

  return (
    <>
      {showThoughts && (completedThoughts.length > 0 || inProgress) && (
        <div className="thought-group">
          {completedThoughts.length > 0 && (
            <ThoughtGroup thoughts={completedThoughts} />
          )}
          {inProgress && (
            <details
              className={`thought-expander thought-expander--skeleton thought-expander--${completedThoughts.length === 0 ? "solo" : "last"}`}
            >
              <summary>
                Thought
                <span className="thinking-dots" style={{ marginLeft: "0.4em" }}>
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </span>
              </summary>
            </details>
          )}
        </div>
      )}
      {display ? (
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: marked.parse(display + "\u258C") as string }}
        />
      ) : (
        !inProgress && (
          <span className="thinking-dots">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </span>
        )
      )}
    </>
  );
}
