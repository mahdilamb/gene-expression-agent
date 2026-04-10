import pytest
from mcp.types import Tool

from agent.mcp_tools import mcp_to_anthropic_tools

from .types import MockMCPClientCreator


def _to_snake_case(name: str) -> str:
    import re

    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", name).lower()


def test_mcp_to_anthropic_tools_converts_fields():
    tools = [
        Tool(
            name="get_data",
            description="Fetch data",
            inputSchema={"type": "object", "properties": {"id": {"type": "string"}}},
        ),
    ]
    result = mcp_to_anthropic_tools(tools)
    assert len(result) == 1, "Expected exactly one converted tool"
    tool_in, tool_out = tools[0], result[0]
    snake_cased_fields = {_to_snake_case(k) for k in Tool.model_fields}
    assert set(tool_out.keys()).issubset(snake_cased_fields), (
        "Expected all output keys to be snake_cased Tool field names"
    )
    assert tool_out["name"] == tool_in.name, "Expected name to be preserved"
    assert tool_out["description"] == tool_in.description, (
        "Expected description to be preserved"
    )
    assert tool_out["input_schema"] == tool_in.inputSchema, (
        "Expected input_schema to match inputSchema"
    )


def test_mcp_to_anthropic_tools_none_description():
    tools = [
        Tool(name="no_desc", inputSchema={"type": "object"}),
    ]
    result = mcp_to_anthropic_tools(tools)
    assert result[0]["description"] == "", (
        "Expected None description to be converted to empty string"
    )


@pytest.mark.asyncio
async def test_fetch_tools_calls_list_tools(mock_mcp_client: MockMCPClientCreator):
    client = mock_mcp_client(
        tools=[
            Tool(
                name="plot",
                description="Plot data",
                inputSchema={"type": "object"},
            ),
        ]
    )
    tools = await client.list_tools()
    result = mcp_to_anthropic_tools(tools)
    client.list_tools.assert_awaited_once()  # type: ignore
    assert len(result) == 1, "Expected exactly one converted tool"
    assert result[0]["name"] == "plot", "Expected name to be 'plot'"
    assert result[0]["input_schema"] == {"type": "object"}, (
        "Expected input_schema to match inputSchema"
    )


def test_mcp_to_anthropic_tools_multiple():
    tools = [
        Tool(name="a", description="Tool A", inputSchema={"type": "object"}),
        Tool(
            name="b",
            description="Tool B",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]
    result = mcp_to_anthropic_tools(tools)
    assert len(result) == 2, "Expected two converted tools"
    assert [t["name"] for t in result] == [
        "a",
        "b",
    ], "Expected tool names to be preserved in order"
