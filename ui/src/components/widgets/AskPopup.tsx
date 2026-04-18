import { marked } from "marked";
import { useCallback, useEffect, useRef, useState } from "react";

import { useThreads } from "../../hooks/useThreads";

const BASE_URL = import.meta.env.VITE_AGENT_URL ?? "/api";

interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskPopupProps {
  /** Display label shown in the header, e.g. a gene name or row summary. */
  subject: string;
  /** Contextual description sent to the agent (chart bar info, row data, etc.). */
  context: string;
  sessionId: string;
  threadId: string;
  position: { x: number; y: number };
  onClose: () => void;
  /** Original highlighted text, stored as thread metadata for underline indicators. */
  highlightText?: string;
}

export function AskPopup({ subject, context, sessionId, threadId, position, onClose, highlightText }: AskPopupProps) {
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeChatContext, setIncludeChatContext] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const { registerThread } = useThreads();

  // Load existing thread messages on mount, then focus input
  useEffect(() => {
    fetch(`${BASE_URL}/sessions/${sessionId}/threads/${threadId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((msgs: Array<{ role: string; content: string }>) => {
        setThread(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
        if (msgs.length > 0) setHasInteracted(true);
      })
      .catch(() => {})
      .finally(() => {
        inputRef.current?.focus();
      });
  }, [sessionId, threadId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const send = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;

      const userMsg: ThreadMessage = { role: "user", content: question };
      setThread((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(`${BASE_URL}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, thread_id: threadId, question, context, include_chat_context: includeChatContext, highlight_text: highlightText ?? null }),
        });

        if (!res.ok || !res.body) {
          setThread((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${res.statusText}` },
          ]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let received = "";

        setThread((prev) => [...prev, { role: "assistant", content: "" }]);

        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          received += decoder.decode(chunk, { stream: true });
          const snapshot = received;
          setThread((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: snapshot };
            return copy;
          });
        }

        registerThread(threadId);
        setHasInteracted(true);
      } catch (err) {
        setThread((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${String(err)}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [context, sessionId, threadId, loading, includeChatContext, registerThread],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div
      ref={popupRef}
      className="ask-popup"
      style={{ left: position.x, top: position.y }}
      role="dialog"
      aria-label={`Ask about ${subject}`}
    >
      <div className="ask-popup-header">
        <span className="ask-popup-title">Ask about <strong>{subject}</strong></span>
        {!hasInteracted && (
          <label className="ask-popup-context-toggle" title="Include main chat history as context">
            <input
              type="checkbox"
              checked={includeChatContext}
              onChange={(e) => setIncludeChatContext(e.target.checked)}
            />
            <span className="ask-popup-context-label">Chat context</span>
          </label>
        )}
        <button className="ask-popup-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      <div className="ask-popup-thread" role="log" aria-live="polite" aria-label="Thread messages">
        {thread.length === 0 && (
          <p className="ask-popup-hint">
            Ask anything about <strong>{subject}</strong>
          </p>
        )}
        {thread.map((msg, i) => (
          <div
            key={i}
            className={`ask-popup-msg ask-popup-msg--${msg.role}`}
            aria-label={msg.role === "user" ? "Your message" : "Assistant message"}
          >
            {msg.role === "user" ? (
              <span>{msg.content}</span>
            ) : (
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(msg.content || "...") as string,
                }}
              />
            )}
          </div>
        ))}
        <div ref={threadEndRef} />
      </div>

      <form className="ask-popup-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${subject}...`}
          aria-label={`Ask about ${subject}`}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send question">
          {loading ? "..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
