import { http, HttpResponse } from "msw";

import { RESPONSES, SESSION_MESSAGES } from "./fixtures";

const BASE = "http://localhost";

function matchResponse(message: string): string {
  if (/help|what (can|do) you/i.test(message)) return RESPONSES.help;
  if (/gene|breast cancer|what.*involved/i.test(message)) return RESPONSES.genes;
  if (/table/i.test(message)) return RESPONSES.table;
  if (/yes|expression|level|plot|chart|visual|show/i.test(message)) return RESPONSES.chart;
  return "I don't have a canned response for that — try asking about breast cancer genes.";
}

export const handlers = [
  // Health / ready
  http.get(`${BASE}/health`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${BASE}/ready`, () =>
    HttpResponse.json({ status: "ok", details: { "mcp-server:tools": "ok", redis: "ok" } }),
  ),

  // Session history — return pre-built messages
  http.get(`${BASE}/sessions/:sessionId`, () => HttpResponse.json(SESSION_MESSAGES)),

  // Thread list — return empty array (threads feature)
  http.get(`${BASE}/sessions/:sessionId/threads`, () => HttpResponse.json([])),

  // Chat — stream a canned response
  http.post(`${BASE}/chat`, async ({ request }) => {
    const { message } = (await request.json()) as { message: string };
    const text = matchResponse(message);
    return new HttpResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }),
];
