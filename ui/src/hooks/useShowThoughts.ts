import { createContext, useCallback, useContext, useState } from "react";

interface ShowThoughtsContextValue {
  showThoughts: boolean;
  toggleThoughts: () => void;
}

export const ShowThoughtsContext = createContext<ShowThoughtsContextValue>({
  showThoughts: true,
  toggleThoughts: () => {},
});

export function useShowThoughtsProvider() {
  const [showThoughts, setShowThoughts] = useState(true);
  const toggleThoughts = useCallback(() => setShowThoughts((v) => !v), []);
  return { showThoughts, toggleThoughts };
}

export function useShowThoughts() {
  return useContext(ShowThoughtsContext);
}
