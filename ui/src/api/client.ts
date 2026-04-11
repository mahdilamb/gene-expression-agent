import createClient from "openapi-fetch";

import type { paths } from "./schema";

const BASE_URL = import.meta.env.VITE_AGENT_URL ?? "/api";

export const api = createClient<paths>({ baseUrl: BASE_URL });

export type ChatRequest =
  paths["/chat"]["post"]["requestBody"]["content"]["application/json"];
export type SessionMessage =
  paths["/sessions/{session_id}"]["get"]["responses"]["200"]["content"]["application/json"][number];
