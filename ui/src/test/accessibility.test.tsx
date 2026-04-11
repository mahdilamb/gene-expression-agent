/**
 * Accessibility tests.
 *
 * Static ARIA issues (missing labels, invalid roles, etc.) are caught by
 * eslint-plugin-jsx-a11y at write-time.  Runtime violations during development
 * are surfaced in the browser console via @axe-core/react (main.tsx).
 *
 * These tests use jest-axe to catch anything that only manifests after render
 * (dynamic content, computed roles, colour contrast, etc.) and cover key
 * interaction behaviours.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "../components/ChatInput";
import { MessageList } from "../components/MessageList";
import { Chart } from "../components/widgets/Chart";
import { Table } from "../components/widgets/Table";
import { Thought } from "../components/widgets/Thought";

expect.extend(toHaveNoViolations);

// ── ChatInput ────────────────────────────────────────────────────────────────

describe("ChatInput", () => {
  it("passes axe accessibility checks", async () => {
    const { container } = render(<ChatInput onSend={vi.fn()} disabled={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("send button is disabled when input is empty", () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  it("calls onSend with trimmed value on submit", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    await userEvent.type(screen.getByLabelText("Message"), "  hello  ");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(onSend).toHaveBeenCalledWith("hello");
  });
});

// ── MessageList ──────────────────────────────────────────────────────────────

const MESSAGES = [
  { id: "msg-test-a", role: "user", content: "Hello" },
  { id: "msg-test-b", role: "assistant", content: "Hi there!" },
];

describe("MessageList", () => {
  it("passes axe accessibility checks", async () => {
    const { container } = render(<MessageList messages={MESSAGES} streaming={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders as a live log region", () => {
    render(<MessageList messages={MESSAGES} streaming={false} />);
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
  });
});

// ── Thought widget ───────────────────────────────────────────────────────────

describe("Thought widget", () => {
  it("passes axe accessibility checks", async () => {
    const { container } = render(<Thought content="Thinking..." />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("toggles open on click", async () => {
    render(<Thought content="Thinking..." />);
    const details = document.querySelector("details")!;
    expect(details.open).toBe(false);
    await userEvent.click(screen.getByText("Thought"));
    expect(details.open).toBe(true);
  });
});

// ── Table widget ─────────────────────────────────────────────────────────────

const TABLE_RAW = JSON.stringify({ BRCA1: 0.158, TP53: 0.373 });

describe("Table widget", () => {
  it("passes axe accessibility checks", async () => {
    const { container } = render(<Table raw={TABLE_RAW} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders a row per entry plus header", () => {
    render(<Table raw={TABLE_RAW} />);
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});

// ── Chart widget ─────────────────────────────────────────────────────────────

const CHART_RAW = JSON.stringify({
  labels: ["BRCA1", "TP53"],
  values: [0.158, 0.373],
  title: "Expression",
  x_label: "Gene",
  y_label: "Value",
});

describe("Chart widget", () => {
  it("renders a container div", () => {
    const { container } = render(<Chart raw={CHART_RAW} />);
    expect(container.querySelector(".chart-container")).toBeInTheDocument();
  });

  it("shows an error for invalid data", () => {
    render(<Chart raw="not-json" />);
    expect(screen.getByText(/invalid chart data/i)).toBeInTheDocument();
  });
});
