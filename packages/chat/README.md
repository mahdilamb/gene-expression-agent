# Chat

Streamlit frontend for the Claude agent. Streams responses and renders rich content (charts, tables, collapsible thought blocks) inline in the conversation.

## Sessions

Each browser tab gets a unique session via `?session=<uuid>` in the URL. Sessions are managed by the agent — the frontend fetches display history on load and sends new messages with the session ID. Clicking **New session** generates a fresh UUID and starts a clean conversation.

## Widgets

Response content can contain embedded markers that are rendered as rich widgets:

| Marker       | Widget                        |
| ------------ | ----------------------------- |
| `CHART`      | Plotly bar chart               |
| `TABLE`      | Pandas DataFrame               |
| `THINKING`   | Collapsible thought expander   |

Widget types are defined in `chat.types.WidgetType` and rendered by modules in `chat.widgets`.

## Configuration

| Variable     | Default                  | Description            |
| ------------ | ------------------------ | ---------------------- |
| `AGENT_URL`  | `http://localhost:8000`  | Agent API base URL     |

## Running

```bash
uv run chat
```

The app starts on `http://0.0.0.0:8501`.

## Project structure

```
src/chat/
    __init__.py         Entry point (Streamlit CLI wrapper)
    app.py              Main Streamlit application
    constants.py        Environment-based configuration
    sessions.py         Session management (new, load, ensure)
    types.py            Shared types (WidgetType, PlotlyBarChartData)
    widgets/
        chart.py        Plotly bar chart renderer
        table.py        DataFrame table renderer
        thought.py      Collapsible thought expander
    static/
        style.css       Custom CSS
        header.html     Owkin header markup
        chat.svg        Chat icon
tests/
    test_sessions.py    Session management tests
```

## Development

```bash
uv run pytest packages/chat/tests
```
