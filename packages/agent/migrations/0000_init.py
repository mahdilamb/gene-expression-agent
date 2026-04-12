"""
Revision: 0000
Parent: None
Created: 2026-04-12T14:15:21.957118+00:00
Description: Initial schema snapshot
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from redis.asyncio import Redis

MODELS_SNAPSHOT = [
    {
        "collection": None,
        "key": "agent:session:{session_id}:display",
        "match": "agent:session:*:display*",
        "qualified_name": "agent.types.DisplayMessages",
        "schema": {
            "$defs": {
                "DisplayMessage": {
                    "properties": {
                        "content": {"title": "Content", "type": "string"},
                        "id": {"title": "Id", "type": "string"},
                        "role": {"title": "Role", "type": "string"},
                    },
                    "required": ["role", "content"],
                    "title": "DisplayMessage",
                    "type": "object",
                }
            },
            "description": "Display messages for the frontend, stored as a JSON array.",
            "items": {"$ref": "#/$defs/DisplayMessage"},
            "title": "DisplayMessages",
            "type": "array",
        },
    },
    {
        "collection": None,
        "key": "agent:session:{session_id}",
        "match": "agent:session:*",
        "qualified_name": "agent.types.SessionMessages",
        "schema": {
            "$defs": {
                "SessionMessage": {
                    "description": "A single message in a conversation.",
                    "properties": {
                        "content": {
                            "anyOf": [
                                {"type": "string"},
                                {
                                    "items": {
                                        "additionalProperties": True,
                                        "type": "object",
                                    },
                                    "type": "array",
                                },
                            ],
                            "title": "Content",
                        },
                        "role": {"title": "Role", "type": "string"},
                    },
                    "required": ["role", "content"],
                    "title": "SessionMessage",
                    "type": "object",
                }
            },
            "description": "Conversation message history, stored as a JSON array.",
            "items": {"$ref": "#/$defs/SessionMessage"},
            "title": "SessionMessages",
            "type": "array",
        },
    },
    {
        "collection": None,
        "key": "agent:session:{session_id}:meta",
        "match": "agent:session:*:meta*",
        "qualified_name": "agent.types.SessionMeta",
        "schema": {
            "description": "Metadata for a child session.",
            "properties": {
                "context": {"default": "", "title": "Context", "type": "string"},
                "highlight_text": {
                    "anyOf": [{"type": "string"}, {"type": "null"}],
                    "default": None,
                    "title": "Highlight Text",
                },
            },
            "title": "SessionMeta",
            "type": "object",
        },
    },
]


async def upgrade(redis: Redis, scan_match: dict[str, str]) -> None:
    pass


async def downgrade(redis: Redis, scan_match: dict[str, str]) -> None:
    pass
