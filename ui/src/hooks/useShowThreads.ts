import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "owkin-show-threads";

interface ShowThreadsContextValue {
  showThreads: boolean;
  toggleThreads: () => void;
}

export const ShowThreadsContext = createContext<ShowThreadsContextValue>({
  showThreads: true,
  toggleThreads: () => {},
});

export function useShowThreadsProvider() {
  const [showThreads, setShowThreads] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showThreads));
  }, [showThreads]);

  const toggleThreads = useCallback(() => setShowThreads((v) => !v), []);
  return { showThreads, toggleThreads };
}

export function useShowThreads() {
  return useContext(ShowThreadsContext);
}
