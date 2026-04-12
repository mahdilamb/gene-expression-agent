# Report

The following is a report detailing some of the design choices that were made for this PoC.

## AI architecture, use, and trade-offs

### Components

| Component                        | Role                                                                                 | Model/Technology           |
| -------------------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| **Claude**                       | Orchestrates tool calls and generates natural-language responses                     | `claude-sonnet-4-20250514` |
| **MCP (Model Context Protocol)** | Standardised interface between the agent and data tools                              | FastMCP                    |
| **Anthropic tool use**           | Structured function calling — Claude decides which tools to invoke and in what order | Anthropic Messages API     |

### Design decisions and trade-offs

#### Claude as LLM agent

In embracing coding agents, I was quite slow - mostly because the quality of responses from ChatGPT (e.g. it does not remember style preferences; when I suggest a better solution to something it is immediately forgotten in the new session) was very poor. Anthropic has generally shown a lot more integrity and a desire to comply with regulatory demands (e.g. [EU Code of practice](https://www.anthropic.com/news/eu-code-practice)), which made me give try it more - I then vibe-coded a React app and realised that it can be a really useful productivity tool. Since then, I tend to use Claude and the Anthropic models over OpenAIs (I haven't had as much time to experiment with Gemini).

#### Claude Sonnet over Haiku or Opus

There's always a trade-off between capability and cost. Sonnet sits in the middle: Opus is not required, and Haiku may fail with more complex multi-turn tools usage.

#### MCP over direct function calling

Keeping the data functions behind MCP rather than calling them directly in the agent gives a few things:

- the agent doesn't need to know anything about the data layer — tools can be swapped or extended without touching agent code
- tools are self-describing, so Claude gets accurate schema and documentation at runtime rather than relying on a hardcoded prompt
- the MCP server can be built, tested, and deployed on its own

In addition, it is possible to run multiple mcp servers and allow an agent to pick up the tools. Some of the tools may be feature flagged/auth-gated and MCP makes that a lot easier to do over additional agent logic.

The trade-off is additional infrastructure complexity: an extra network hop and service to manage (though they could be added as sidecars so they use internal network).

In terms of maintainability, I see `agent` and `ui` as being more UI/UX-focused and (potentially) less regularly updated. Whereas I think the `mcp-server` package is likely to see the most development. When `mcp-server` is updated (and there isn't a UI change). You get added features without having to teach either of the two packages.

#### Agentic loop over single-shot prompting

Rather than fetching all the data upfront and stuffing it into a single prompt, the agent loops — Claude calls a tool, gets the result, then decides what to do next. This means it can handle multi-step queries naturally and deal with things like esophageal cancer (not in the dataset) without any special-case logic.

The latency trade-off is real — each tool call adds a round trip — though for this dataset it's negligible. There is also feedback to the user that the agent is thinking, so they are reassured that some progress has been made!

#### Stateless agent with Redis session storage

Storing conversation history in Redis rather than in-process memory means sessions survive agent restarts and you can run multiple instances without state conflicts — at the cost of needing Redis running. However, it also allows for horizontal scaling, which is good for production deployment.

## AI-assisted coding — pros and cons

Having reflected on this more, I think the main pro and the main cons cancel out. Using coding agents speeds up development but also adds additional code and enables scope-creep. I ended up doing the frontend with React (in part, because I know the framework quite well and had a few ideas about UI/UX I wanted to implement), but it's so unnecessary for a backend tech-test. I even had time to create a utility package for redis-schema migration and started working on a new UI feature (I thought it would be cool to be able to ask charts in-context - i.e. clicking on bars in a graph would allow you to ask more specific questions - the hope was that you could branch this out into scatter charts with a lasso selection and allow the user to ask questions directly on the data). But these were fun for me, but certainly not needed.

### Pros

- **Scaffolding speed**: FastAPI endpoints, (the original) Streamlit layout, Docker Compose, CI, README files — the boilerplate I'd normally spend time looking up was handled quickly and largely correctly.
- **UI update**: I eventually moved from Streamlit into a custom React app. I would certainly not have had the time to do that without a coding agent.
- **Test generation**: Initial test structure for things like Redis session roundtrips was a decent starting point, even if it needed editing.
- **Quick source code searches**: It is easier to find _WET_ bits of code and elide them.
- **Debugging**: I could use a coding agent as a first-pass on debugging (and only do interactive debugging when that failed)
- **Additional features**: I was able to add session-management/plotting functions because of the extra time gained in not having to do all of the IC myself.

### Cons

- **Architecture drift**: I had a specific architecture in mind upfront; the agent would sometimes ignore design decisions mid-session or introduce context drift over longer conversations. Coding agents also sometimes forget to change all refactored code (which is fine, just means we need more robust tests).
- **Agentic loop correctness**: Generated code for the multi-turn tool-call loop required careful review — the initial version didn't correctly accumulate `tool_result` messages back into the history before the next Claude call.
- **Over-engineering tendency**: Suggestions often included unnecessary abstractions (extra base classes, config dataclasses) that had to be actively pushed back on to keep the code simple (and excessive documentation/splitting of tests/not using well-designed fakes/mocks). It also tends to recreate new features rather than using existing packages (or it prefers to generate it's own types rather than using the ones from the package).
- **Hallucinated APIs**: It would sometimes use SDK methods that don't actually exist, which meant verifying anything non-trivial against the real docs.
- **New dependencies**: Often suggestions are based on older packages (e.g. suggesting using pip instead of uv for an obviously uv-managed repo).
- **Too literal**: Sometimes the asks are taken too literally. When creating the React version of the UI it had hard-coded table headers. Careful reviewing of code is always important!
- **Scope creep**: Because it's quite easy to get things moving, it's quite easy to add _nice to haves_, but in reality this adds additional IC time, debug time, review time, etc. It's definitely better to scope things correctly and focus on deliver within those remits; reviewing with stakeholders as necessary!
