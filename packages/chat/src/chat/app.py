import re
from typing import get_args

import httpx
import streamlit as st

from chat.constants import AGENT_URL, ASSETS_DIR
from chat.sessions import ensure_session, new_session
from chat.types import WidgetType
from chat.widgets import render_chart, render_table, render_thought

_WIDGET_TYPES = get_args(WidgetType.__value__)
_WIDGET_PATTERN = "|".join(_WIDGET_TYPES)
MARKER_PATTERN = re.compile(rf"\s*<!--(?:{_WIDGET_PATTERN}):(.*?)-->\s*", re.DOTALL)


st.set_page_config(
    page_title="Owkin | chat",
    page_icon="\U0001f9ec",
    layout="centered",
)

_css = (ASSETS_DIR / "style.css").read_text()
_header = (ASSETS_DIR / "header.html").read_text()

st.markdown(f"<style>{_css}</style>", unsafe_allow_html=True)

_header_col, _clear_col = st.columns([4, 1])
_header_col.markdown(_header, unsafe_allow_html=True)

session_id = ensure_session()

with _clear_col:
    if st.button("New session", type="tertiary"):
        st.session_state.messages = []
        new_session()
        st.rerun()


def render_message(content: str):
    """Render a message, extracting and displaying any embedded widgets."""
    tokens = re.split(
        rf"\s*<!--({_WIDGET_PATTERN}):(.*?)-->\s*", content, flags=re.DOTALL
    )
    i = 0
    while i < len(tokens):
        if i + 2 < len(tokens) and tokens[i + 1] in _WIDGET_TYPES:
            text = tokens[i].strip()
            if text:
                st.markdown(text)
            widget_type: WidgetType = tokens[i + 1]  # type: ignore
            match widget_type:
                case "CHART":
                    render_chart(tokens[i + 2])
                case "TABLE":
                    render_table(tokens[i + 2])
                case "THINKING":
                    render_thought(tokens[i + 2])
                case _:
                    pass
            i += 3
        else:
            text = tokens[i].strip()
            if text:
                st.markdown(text)
            i += 1


for message in st.session_state.messages:
    with st.chat_message("Jean" if message["role"] == "assistant" else "user"):
        if message["role"] == "assistant":
            render_message(message["content"])
        else:
            st.markdown(message["content"])

if prompt := st.chat_input("Ask about gene expression data..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("Jean"):
        thinking_placeholder = st.empty()
        message_placeholder = st.empty()
        full_response = ""

        thinking_dots = (
            '<span class="thinking-dot"></span>'
            '<span class="thinking-dot"></span>'
            '<span class="thinking-dot"></span>'
        )

        try:
            with httpx.stream(
                "POST",
                f"{AGENT_URL}/chat",
                json={"session_id": session_id, "message": prompt},
                timeout=120,
            ) as response:
                response.raise_for_status()
                has_text = False
                for chunk in response.iter_text():
                    if chunk:
                        full_response += chunk
                        display = MARKER_PATTERN.sub("", full_response)
                        if display.strip():
                            has_text = True
                            thinking_placeholder.empty()
                            message_placeholder.markdown(display + " \u258c")
                        elif not has_text:
                            thinking_placeholder.markdown(
                                f"Thinking {thinking_dots}",
                                unsafe_allow_html=True,
                            )

            thinking_placeholder.empty()
            message_placeholder.empty()
            render_message(full_response)
        except httpx.HTTPError as e:
            thinking_placeholder.empty()
            full_response = f"Error communicating with agent: {e}"
            message_placeholder.markdown(full_response)

    st.session_state.messages.append({"role": "assistant", "content": full_response})
