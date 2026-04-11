/**
 * Mock agent server — uses canned responses from the real session.
 *
 * Endpoints match the real agent API:
 *   GET  /health
 *   GET  /ready
 *   GET  /sessions/:id   → returns stored messages for that session
 *   POST /chat           → streams a canned response, appends to session
 *
 * The /chat endpoint streams raw text (same wire format as the real agent)
 * with a small per-chunk delay so the streaming UI can be tested end-to-end.
 *
 * Usage:
 *   node scripts/mock-server.mjs          # listens on :8000
 *   PORT=9000 node scripts/mock-server.mjs
 */

import http from "http";

const PORT = process.env.PORT ?? 8000;

// ── Canned responses ──────────────────────────────────────────────────────────

const CHART_DATA = JSON.stringify({
  genes: ["BRCA2","BRCA1","TP53","GATA3","CDH1","ESR1","MAP3K1","HER2","PIK3CA","AKT1"],
  values: [0.112,0.158,0.373,0.602,0.834,0.716,0.701,0.42,0.762,0.278],
  title: "Gene median expression values",
  x_label: "Gene",
  y_label: "Median expression",
  hover_template: "<b>%{x}</b><br>Median: %{y:.2f}<extra></extra>",
});

const TABLE_DATA = JSON.stringify([
  { Gene: "CDH1",    "Median Expression": 0.834 },
  { Gene: "PIK3CA",  "Median Expression": 0.762 },
  { Gene: "ESR1",    "Median Expression": 0.716 },
  { Gene: "MAP3K1",  "Median Expression": 0.701 },
  { Gene: "GATA3",   "Median Expression": 0.602 },
  { Gene: "HER2",    "Median Expression": 0.420 },
  { Gene: "TP53",    "Median Expression": 0.373 },
  { Gene: "AKT1",    "Median Expression": 0.278 },
  { Gene: "BRCA1",   "Median Expression": 0.158 },
  { Gene: "BRCA2",   "Median Expression": 0.112 },
]);

const RESPONSES = [
  {
    match: (msg) => /help|what (can|do) you/i.test(msg),
    text: `I can help you explore cancer genomics data! Here are the main things I can do:

## 🔍 **Gene Discovery**
- Find genes associated with specific cancer types
- Example: "What genes are involved in lung cancer?" or "Show me breast cancer genes"

## 📊 **Expression Analysis**
- Get median expression values for specific genes
- Compare expression levels across different genes
- Example: "What's the expression level of TP53?" or "Compare BRCA1 and BRCA2 expression"

## 📈 **Data Visualization**
- Create bar charts showing gene expression levels
- Visualize comparisons between multiple genes
- Example: "Plot the expression of oncogenes in breast cancer"

## 🗂️ **Dataset Exploration**
- List all available cancer types in the dataset
- Help you discover what cancers are supported for analysis

## Common workflows I can help with:
1. **"What genes are involved in [cancer type]?"** → I'll find the associated genes
2. **"Show me expression levels for these genes"** → I'll get the median values
3. **"Plot this data"** → I'll create a visualization for you
4. **"What cancers can I analyze?"** → I'll show you all available options

Just ask me about any cancer type, specific genes, or request visualizations - I'll guide you through the analysis!`,
  },
  {
    match: (msg) => /gene|breast cancer|what.*involved/i.test(msg),
    text: `<!--THINKING:Called **get_targets**: \`["BRCA2","BRCA1","TP53","GATA3","CDH1","ESR1","MAP3K1","HER2","PIK3CA","AKT1"]\`-->Here are the genes involved in breast cancer according to the dataset:

## **Breast Cancer Associated Genes:**

1. **BRCA1** - Tumor suppressor gene, hereditary breast cancer susceptibility
2. **BRCA2** - Tumor suppressor gene, hereditary breast cancer susceptibility
3. **TP53** - "Guardian of the genome," frequently mutated tumor suppressor
4. **HER2** - Growth factor receptor, important therapeutic target
5. **PIK3CA** - Part of PI3K/AKT pathway, frequently mutated in breast cancer
6. **ESR1** - Estrogen receptor, critical for hormone receptor-positive breast cancer
7. **GATA3** - Transcription factor important in breast development
8. **CDH1** - E-cadherin, cell adhesion molecule
9. **MAP3K1** - Kinase involved in cell signaling pathways
10. **AKT1** - Key protein in cell survival and proliferation pathways

These genes represent various aspects of breast cancer biology including hereditary susceptibility (BRCA1/2), hormone signaling (ESR1), growth factor signaling (HER2), cell cycle control (TP53), and key oncogenic pathways (PIK3CA, AKT1).

Would you like me to show you the expression levels of these genes, or create a visualization comparing their expression?`,
  },
  {
    match: (msg) => /table/i.test(msg),
    text: `<!--TABLE:${TABLE_DATA}-->Here is the breast cancer gene expression data as a table.`,
  },
  {
    match: (msg) => /yes|expression|level|plot|chart|visual|show/i.test(msg),
    text: `<!--THINKING:Called **get_expressions**: \`{"BRCA2":0.112,"BRCA1":0.158,"TP53":0.373,"GATA3":0.602,"CDH1":0.834,"ESR1":0.716,"MAP3K1":0.701,"HER2":0.42,"PIK3CA":0.762,"AKT1":0.278}\`--><!--CHART:${CHART_DATA}-->Here are the median expression values for breast cancer genes:

## **Expression Levels:**

| Gene | Median Expression |
|------|------------------|
| **CDH1** | 0.834 (highest) |
| **PIK3CA** | 0.762 |
| **ESR1** | 0.716 |
| **MAP3K1** | 0.701 |
| **GATA3** | 0.602 |
| **HER2** | 0.420 |
| **TP53** | 0.373 |
| **AKT1** | 0.278 |
| **BRCA1** | 0.158 |
| **BRCA2** | 0.112 (lowest) |

🔹 **Highest Expression**: CDH1 shows the highest median expression, important for cell-cell adhesion.
🔹 **Lowest Expression**: The BRCA genes show the lowest expression, typical for tumour suppressor genes.

Would you like me to explain any specific genes or compare with other cancer types?`,
  },
  {
    match: () => true,
    text: `I'm a mock server — I don't have a response for that query. Try asking:
- "How can you help?"
- "What genes are involved in breast cancer?"
- "Yes" (to see expression levels and a chart)
- "Can you show this as a table?"`,
  },
];

// ── In-memory session store ───────────────────────────────────────────────────

/** @type {Map<string, Array<{id:string, role:string, content:string}>>} */
const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, []);
  return sessions.get(id);
}

// ── Streaming helper ──────────────────────────────────────────────────────────

const CHUNK_SIZE = 8;   // characters per chunk
const CHUNK_DELAY = 20; // ms between chunks

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamText(res, text) {
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    res.write(text.slice(i, i + CHUNK_SIZE));
    await sleep(CHUNK_DELAY);
  }
  res.end();
}

// ── Request helpers ───────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

// ── Router ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // GET /health
  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { status: "ok" });
  }

  // GET /ready
  if (req.method === "GET" && url.pathname === "/ready") {
    return json(res, 200, {
      status: "ok",
      details: { "mcp-server:tools": "ok", redis: "ok" },
    });
  }

  // GET /sessions/:id
  const sessionMatch = url.pathname.match(/^\/sessions\/(.+)$/);
  if (req.method === "GET" && sessionMatch) {
    const messages = getSession(sessionMatch[1]);
    return json(res, 200, messages);
  }

  // POST /chat
  if (req.method === "POST" && url.pathname === "/chat") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { detail: "Invalid JSON" });
    }

    const { session_id, message } = body;
    if (!session_id || !message) {
      return json(res, 422, { detail: "session_id and message are required" });
    }

    const session = getSession(session_id);
    session.push({ id: crypto.randomUUID(), role: "user", content: message });

    const canned = RESPONSES.find((r) => r.match(message));
    const reply = canned.text;

    session.push({ id: crypto.randomUUID(), role: "assistant", content: reply });

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return streamText(res, reply);
  }

  json(res, 404, { detail: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Mock agent server listening on http://localhost:${PORT}`);
  console.log("Sessions are stored in memory (reset on restart).");
});
