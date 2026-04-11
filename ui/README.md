# Owkin Chat UI

React + TypeScript frontend for the Owkin Gene Expression Chat assistant.

## Stack

- **React 19** + **TypeScript**
- **Vite** — dev server and bundler
- **openapi-fetch** — typed API client generated from the agent's OpenAPI spec
- **Plotly.js** — gene expression bar charts
- **marked** — markdown rendering
- **MSW** — API mocking in tests
- **vitest** + **@testing-library/react** + **jest-axe** — unit, accessibility, and contrast tests

## Development

```bash
yarn install
yarn dev          # dev server on :8501 (proxies /api → agent at :8000)
```

For a fully local setup without the Docker backend, use the combined mock script:

```bash
yarn dev:mock     # starts mock agent on :8001 + UI dev server together
```

## Environment variables

| Variable         | Default                | Description                 |
| ---------------- | ---------------------- | --------------------------- |
| `VITE_AGENT_URL` | `http://localhost:8000` | Agent API base URL          |

Set in a `.env.local` file for local overrides.

## API client

The typed API client is generated from the agent's OpenAPI spec:

```bash
# Export fresh schema from a running agent, then regenerate types
yarn openapi-ts
```

The generated file is `src/api/schema.d.ts`; do not edit it manually.

## Testing

```bash
yarn test         # run all tests once
yarn test --watch # watch mode
```

Tests cover:

- **Contrast** (`src/test/contrast.test.ts`) — WCAG AA ratios for all text/background pairs in light and dark themes
- **Accessibility** (`src/test/accessibility.test.tsx`) — axe-core checks on individual components
- **App accessibility** (`src/test/app-accessibility.test.tsx`) — axe-core checks on the full app with mock API

## Building

```bash
yarn build        # outputs to dist/
yarn preview      # serve dist/ on :8501
```
