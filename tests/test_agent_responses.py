"""End-to-end tests that verify Claude produces correct responses via MCP tools.

These tests require a valid ANTHROPIC_API_KEY and call the real Claude API.
They are skipped if the key is not set.
"""

import os
from typing import Any

import anthropic
import pytest
from fastmcp import Client

from mcp_server import dataset
from mcp_server.mcp import mcp

requires_api_key = pytest.mark.requires_api_key

pytestmark = pytest.mark.skipif(
    not os.environ.get("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY not set",
)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")


async def _ask(question: str) -> str:
    """Send a question through Claude with MCP tools, return final text."""
    client = anthropic.AsyncAnthropic()

    async with Client(mcp) as mcp_client:
        mcp_tools = await mcp_client.list_tools()
        anthropic_tools = [
            {
                "name": t.name,
                "description": t.description or "",
                "input_schema": t.inputSchema,
            }
            for t in mcp_tools
        ]

        messages: list[dict[str, Any]] = [{"role": "user", "content": question}]

        while True:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=4096,
                messages=messages,  # ty: ignore[invalid-argument-type]
                tools=anthropic_tools,  # ty: ignore[invalid-argument-type]
            )

            tool_uses = []
            text_blocks = []
            for block in response.content:
                if block.type == "text":
                    text_blocks.append(block.text)
                elif block.type == "tool_use":
                    tool_uses.append(block)

            if not tool_uses:
                return "\n".join(text_blocks)

            messages.append(
                {
                    "role": "assistant",
                    "content": [b.model_dump() for b in response.content],
                }
            )

            tool_results = []
            for tool_use in tool_uses:
                result = await mcp_client.call_tool(tool_use.name, tool_use.input)
                tool_result_content = ""
                for content in result.content:
                    if hasattr(content, "text"):
                        tool_result_content += content.text  # ty: ignore[unsupported-operator]
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": tool_result_content,
                    }
                )

            messages.append({"role": "user", "content": tool_results})


@requires_api_key
async def test_how_can_you_help_me():
    response = await _ask("How can you help me?")
    lower = response.lower()
    assert "gene" in lower, "Expected response to mention genes"
    assert "cancer" in lower, "Expected response to mention cancer"
    assert "expression" in lower, "Expected response to mention expression values"


@requires_api_key
async def test_lung_cancer_genes():
    response = await _ask("What are the main genes involved in lung cancer?")
    assert "RET" in response, "Expected RET in lung cancer genes"
    assert "ALK" in response, "Expected ALK in lung cancer genes"
    assert "KRAS" in response, "Expected KRAS in lung cancer genes"


@requires_api_key
async def test_breast_cancer_expression_values():
    expected = dataset.get_expressions(dataset.get_targets("breast"))
    response = await _ask(
        "What is the median value expression of genes involved in breast cancer?"
    )
    assert "BRCA2" in response, "Expected BRCA2 in response"
    # Check that the actual value for BRCA2 appears
    assert str(expected["BRCA2"]) in response, (
        f"Expected BRCA2 value {expected['BRCA2']} in response"
    )


@requires_api_key
async def test_esophageal_cancer_not_in_dataset():
    response = await _ask(
        "What is the median value expression of genes involved in esophageal cancer?"
    )
    lower = response.lower()
    assert any(
        phrase in lower
        for phrase in [
            "not available",
            "not found",
            "not in",
            "don't have",
            "do not have",
            "not include",
            "isn't in",
            "is not in",
        ]
    ), "Expected response to indicate esophageal cancer is not in the dataset"
