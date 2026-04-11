/**
 * App-level accessibility tests using the mock API (via MSW).
 *
 * The MSW handlers (src/test/handlers.ts) serve the same canned responses as
 * the standalone mock server (scripts/mock-server.mjs), so axe runs against a
 * fully-populated UI — messages, markdown, thought expanders, a chart, a
 * table — rather than empty stubs.
 *
 * We test both light and dark themes because contrast failures are often
 * theme-specific.
 */

import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import App from "../App";

expect.extend(toHaveNoViolations);

// ── Helpers ───────────────────────────────────────────────────────────────────

function setTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("owkin-theme", theme);
}

async function renderApp() {
  render(<App />);
  // Wait for the session to load (loading spinner disappears)
  await waitForElementToBeRemoved(() => screen.queryByText(/loading session/i), {
    timeout: 3000,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("App accessibility — light theme", () => {
  beforeEach(() => setTheme("light"));
  afterEach(() => document.documentElement.removeAttribute("data-theme"));

  it("passes axe with a populated conversation", async () => {
    const { container } = render(<App />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading session/i), {
      timeout: 3000,
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders user and assistant messages", async () => {
    await renderApp();
    // Session has multiple turns; verify at least one of each role is present
    expect(screen.getAllByLabelText("Your message").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Jean's message").length).toBeGreaterThan(0);
  });

  it("renders the conversation log region", async () => {
    await renderApp();
    expect(screen.getByRole("log")).toBeInTheDocument();
  });

  it("renders the chat input with a label", async () => {
    await renderApp();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("theme toggle has an accessible name", async () => {
    await renderApp();
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i }),
    ).toBeInTheDocument();
  });
});

describe("App accessibility — dark theme", () => {
  beforeEach(() => setTheme("dark"));
  afterEach(() => document.documentElement.removeAttribute("data-theme"));

  it("passes axe with a populated conversation", async () => {
    const { container } = render(<App />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading session/i), {
      timeout: 3000,
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("theme toggle has an accessible name", async () => {
    await renderApp();
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toBeInTheDocument();
  });
});
