import uuid

import httpx
import streamlit as st

from chat.constants import AGENT_URL


def new_session() -> str:
    """Generate a new session ID and set it in query params."""
    sid = str(uuid.uuid4())
    st.query_params["session"] = sid
    return sid


def load_session(sid: str) -> list[dict[str, str]]:
    """Fetch display messages for a session from the agent."""
    try:
        resp = httpx.get(f"{AGENT_URL}/sessions/{sid}", timeout=5)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError:
        return []


def ensure_session() -> str:
    """Ensure a valid session exists, creating one if needed.

    Returns the active session ID.
    """
    if "session" not in st.query_params:
        new_session()
        st.rerun()

    session_id = st.query_params["session"]

    if (
        "messages" not in st.session_state
        or st.session_state.get("_session_id") != session_id
    ):
        messages = load_session(session_id)
        if not messages and session_id != st.session_state.get("_session_id"):
            session_id = new_session()
            messages = []
        st.session_state.messages = messages
        st.session_state._session_id = session_id

    return session_id
