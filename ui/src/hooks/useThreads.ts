import { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_AGENT_URL ?? "/api";

export interface ThreadMeta {
  thread_id: string;
  context?: string;
  highlight_text?: string;
}

interface ThreadsContextValue {
  /** Set of known thread IDs for the current session. */
  threadIds: Set<string>;
  /** Thread metadata keyed by thread ID. */
  threadMeta: Map<string, ThreadMeta>;
  /** Optimistically register a new thread (e.g. after first message sent). */
  registerThread: (threadId: string, meta?: ThreadMeta) => void;
}

export const ThreadsContext = createContext<ThreadsContextValue>({
  threadIds: new Set(),
  threadMeta: new Map(),
  registerThread: () => {},
});

export function useThreadsProvider(sessionId: string) {
  const [threadIds, setThreadIds] = useState<Set<string>>(new Set());
  const [threadMeta, setThreadMeta] = useState<Map<string, ThreadMeta>>(new Map());

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    fetch(`${BASE_URL}/sessions/${sessionId}/threads`)
      .then((res) => (res.ok ? res.json() : []))
      .then((threads: ThreadMeta[]) => {
        if (!cancelled) {
          setThreadIds(new Set(threads.map((t) => t.thread_id)));
          setThreadMeta(new Map(threads.map((t) => [t.thread_id, t])));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const registerThread = useCallback((threadId: string, meta?: ThreadMeta) => {
    setThreadIds((prev) => {
      if (prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.add(threadId);
      return next;
    });
    if (meta) {
      setThreadMeta((prev) => {
        const next = new Map(prev);
        next.set(threadId, meta);
        return next;
      });
    }
  }, []);

  return { threadIds, threadMeta, registerThread };
}

export function useThreads() {
  return useContext(ThreadsContext);
}
