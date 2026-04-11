import "@testing-library/jest-dom";
import { setupServer } from "msw/node";
import { afterAll, afterEach } from "vitest";

import { handlers } from "./handlers";

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {};

// jsdom does not implement matchMedia (used by useTheme)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Start MSW immediately at module level so it intercepts before any test runs
export const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: "warn" });

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
