import { createContext, useContext } from "react";

export const SessionIdContext = createContext<string>("");

export function useSessionId(): string {
  return useContext(SessionIdContext);
}
