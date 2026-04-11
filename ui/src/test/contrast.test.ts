/**
 * WCAG 2.1 colour-contrast tests for both light and dark themes.
 *
 * Rules:
 *  - Normal text  : contrast ratio ≥ 4.5 : 1  (AA)
 *  - Large text   : contrast ratio ≥ 3.0 : 1  (AA)  – 18pt+ or 14pt bold+
 *
 * Colour-blindness note: these tests verify that *text* has sufficient
 * contrast regardless of hue, which covers deuteranopia / protanopia /
 * tritanopia scenarios where colour perception shifts.  The chat bubbles
 * also differ in layout position (left vs right), so participants are
 * never distinguished by colour alone.
 */

import { describe, expect, it } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToLinear(hex: string): number {
  const v = parseInt(hex, 16) / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: string): number {
  const c = color.replace("#", "");
  const r = hexToLinear(c.slice(0, 2));
  const g = hexToLinear(c.slice(2, 4));
  const b = hexToLinear(c.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function expectAA(label: string, fg: string, bg: string, large = false) {
  const ratio = contrastRatio(fg, bg);
  const required = large ? 3.0 : 4.5;
  expect(ratio, `${label}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (need ${required}:1)`).toBeGreaterThanOrEqual(required);
}

// ── Token maps ───────────────────────────────────────────────────────────────

const light = {
  bg:                   "#fafafa",
  text:                 "#222222",
  textMuted:            "#555555",
  textSubtle:           "#666666",
  textFaint:            "#666666",
  accent:               "#4a54d4",
  accentText:           "#ffffff",
  bubbleUserBg:         "#dce8ff",
  bubbleUserText:       "#1a3a6b",
  bubbleAssistantBg:    "#e8f5e9",
  bubbleAssistantText:  "#1b4332",
  thoughtSummaryColor:  "#555555",
  thoughtContentColor:  "#666666",
};

const dark = {
  bg:                   "#141414",
  text:                 "#e8e8e8",
  textMuted:            "#aaaaaa",
  textSubtle:           "#888888",
  textFaint:            "#888888",
  accent:               "#7c8ffc",
  accentText:           "#0d1a3a",
  bubbleUserBg:         "#1a2e4a",
  bubbleUserText:       "#aac8ff",
  bubbleAssistantBg:    "#1a2e22",
  bubbleAssistantText:  "#a3d9b1",
  thoughtSummaryColor:  "#aaaaaa",
  thoughtContentColor:  "#999999",
};

// ── Light theme ──────────────────────────────────────────────────────────────

describe("Light theme contrast (WCAG AA)", () => {
  it("body text on background", () =>
    expectAA("body text", light.text, light.bg));

  it("muted text on background", () =>
    expectAA("muted text", light.textMuted, light.bg));

  it("subtle text (role labels) on background", () =>
    expectAA("subtle text", light.textSubtle, light.bg));

  it("faint text (loading/placeholders) on background", () =>
    expectAA("faint text", light.textFaint, light.bg));

  it("accent button text on accent background", () =>
    expectAA("accent btn", light.accentText, light.accent));

  it("user bubble: text on bubble background", () =>
    expectAA("user bubble text", light.bubbleUserText, light.bubbleUserBg));

  it("assistant bubble: text on bubble background", () =>
    expectAA("assistant bubble text", light.bubbleAssistantText, light.bubbleAssistantBg));

  it("thought summary on bubble background", () =>
    expectAA("thought summary", light.thoughtSummaryColor, light.bubbleAssistantBg));

  it("thought content on bubble background", () =>
    expectAA("thought content", light.thoughtContentColor, light.bubbleAssistantBg));
});

// ── Dark theme ───────────────────────────────────────────────────────────────

describe("Dark theme contrast (WCAG AA)", () => {
  it("body text on background", () =>
    expectAA("body text", dark.text, dark.bg));

  it("muted text on background", () =>
    expectAA("muted text", dark.textMuted, dark.bg));

  it("subtle text (role labels) on background", () =>
    expectAA("subtle text", dark.textSubtle, dark.bg));

  it("faint text (loading/placeholders) on background", () =>
    expectAA("faint text", dark.textFaint, dark.bg));

  it("accent button text on accent background", () =>
    expectAA("accent btn", dark.accentText, dark.accent));

  it("user bubble: text on bubble background", () =>
    expectAA("user bubble text", dark.bubbleUserText, dark.bubbleUserBg));

  it("assistant bubble: text on bubble background", () =>
    expectAA("assistant bubble text", dark.bubbleAssistantText, dark.bubbleAssistantBg));

  it("thought summary on bubble background", () =>
    expectAA("thought summary", dark.thoughtSummaryColor, dark.bubbleAssistantBg));

  it("thought content on bubble background", () =>
    expectAA("thought content", dark.thoughtContentColor, dark.bubbleAssistantBg));
});
