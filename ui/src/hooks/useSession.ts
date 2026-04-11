import { useCallback, useEffect, useState } from "react";

import { api, type SessionMessage } from "../api/client";

function getSessionId(): string {
  const params = new URLSearchParams(window.location.search);
  let sid = params.get("session");
  if (!sid) {
    sid = crypto.randomUUID();
    params.set("session", sid);
    window.history.replaceState(null, "", `?${params}`);
  }
  return sid;
}

export function useSession() {
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .GET("/sessions/{session_id}", { params: { path: { session_id: sessionId } } })
      .then(({ data }) => {
        if (!cancelled && data) setMessages(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const newSession = useCallback(() => {
    const sid = crypto.randomUUID();
    const params = new URLSearchParams(window.location.search);
    params.set("session", sid);
    window.history.replaceState(null, "", `?${params}`);
    setSessionId(sid);
    setMessages([]);
  }, []);

  const addMessage = useCallback((msg: SessionMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastAssistant = useCallback((content: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last["role"] === "assistant") {
        copy[copy.length - 1] = { ...last, content };
      }
      return copy;
    });
  }, []);

  return { sessionId, messages, loading, newSession, addMessage, updateLastAssistant };
}
