import { createContext, useCallback, useContext, useState } from "react";

interface ShowThreadsContextValue {
  showThreads: boolean;
  toggleThreads: () => void;
}

export const ShowThreadsContext = createContext<ShowThreadsContextValue>({
  showThreads: true,
  toggleThreads: () => {},
});

export function useShowThreadsProvider() {
  const [showThreads, setShowThreads] = useState(true);
  const toggleThreads = useCallback(() => setShowThreads((v) => !v), []);
  return { showThreads, toggleThreads };
}

export function useShowThreads() {
  return useContext(ShowThreadsContext);
}
