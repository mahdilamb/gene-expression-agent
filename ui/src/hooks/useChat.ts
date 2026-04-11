import { useCallback, useRef, useState } from "react";

import type { SessionMessage } from "../api/client";

const BASE_URL = import.meta.env.VITE_AGENT_URL ?? "/api";

/** ms between revealing one character (~90 chars/sec display rate). */
const MS_PER_CHAR = 1000 / 90;

/** Once the stream ends, drain remaining characters within this many ms. */
const DRAIN_MS = 300;

interface UseChatOptions {
  sessionId: string;
  addMessage: (msg: SessionMessage) => void;
  updateLastAssistant: (content: string) => void;
}

export function useChat({ sessionId, addMessage, updateLastAssistant }: UseChatOptions) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (message: string) => {
      addMessage({ id: crypto.randomUUID(), role: "user", content: message });
      addMessage({ id: crypto.randomUUID(), role: "assistant", content: "" });
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${BASE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, message }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          updateLastAssistant(`Error: ${res.statusText}`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let received = "";
        let displayPos = 0;
        let readDone = false;

        // rAF loop: drip-feed displayPos toward received.length at a fixed chars/sec rate.
        // Once the stream ends, accelerate to drain remaining chars within DRAIN_MS.
        const rafDone = new Promise<void>((resolve) => {
          let lastTs: number | null = null;
          let budget = 0;
          let drainStart: number | null = null;
          let drainFrom = 0;
          function tick(ts: number) {
            const elapsed = lastTs === null ? 0 : ts - lastTs;
            lastTs = ts;

            if (readDone) {
              // First frame after stream ended: snapshot where we are
              if (drainStart === null) {
                drainStart = ts;
                drainFrom = displayPos;
              }
              const remaining = received.length - drainFrom;
              if (remaining > 0) {
                const t = Math.min((ts - drainStart) / DRAIN_MS, 1);
                displayPos = Math.min(drainFrom + Math.ceil(remaining * t), received.length);
              }
            } else {
              budget += elapsed / MS_PER_CHAR;
              const advance = Math.max(1, Math.floor(budget));
              budget -= advance;
              displayPos = Math.min(displayPos + advance, received.length);
            }

            updateLastAssistant(received.slice(0, displayPos));

            if (readDone && displayPos >= received.length) {
              resolve();
            } else {
              requestAnimationFrame(tick);
            }
          }
          requestAnimationFrame(tick);
        });

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            received += decoder.decode(value, { stream: true });
          }
        } finally {
          readDone = true;
        }

        await rafDone;
        updateLastAssistant(received); // ensure final state is exact

      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        updateLastAssistant(`Error: ${String(err)}`);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, addMessage, updateLastAssistant],
  );

  return { send, streaming };
}
