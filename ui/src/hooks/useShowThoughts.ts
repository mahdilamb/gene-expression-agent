import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "owkin-show-thoughts";

interface ShowThoughtsContextValue {
  showThoughts: boolean;
  toggleThoughts: () => void;
}

export const ShowThoughtsContext = createContext<ShowThoughtsContextValue>({
  showThoughts: true,
  toggleThoughts: () => {},
});

export function useShowThoughtsProvider() {
  const [showThoughts, setShowThoughts] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showThoughts));
  }, [showThoughts]);

  const toggleThoughts = useCallback(() => setShowThoughts((v) => !v), []);
  return { showThoughts, toggleThoughts };
}

export function useShowThoughts() {
  return useContext(ShowThoughtsContext);
}
