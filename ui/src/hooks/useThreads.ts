import { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_AGENT_URL ?? "/api";

interface ThreadsContextValue {
  /** Set of known thread IDs for the current session. */
  threadIds: Set<string>;
  /** Optimistically register a new thread (e.g. after first message sent). */
  registerThread: (threadId: string) => void;
}

export const ThreadsContext = createContext<ThreadsContextValue>({
  threadIds: new Set(),
  registerThread: () => {},
});

export function useThreadsProvider(sessionId: string) {
  const [threadIds, setThreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    fetch(`${BASE_URL}/sessions/${sessionId}/threads`)
      .then((res) => (res.ok ? res.json() : []))
      .then((threads: Array<{ thread_id: string }>) => {
        if (!cancelled) {
          setThreadIds(new Set(threads.map((t) => t.thread_id)));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const registerThread = useCallback((threadId: string) => {
    setThreadIds((prev) => {
      if (prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.add(threadId);
      return next;
    });
  }, []);

  return { threadIds, registerThread };
}

export function useThreads() {
  return useContext(ThreadsContext);
}
