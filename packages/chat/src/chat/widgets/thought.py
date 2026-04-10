import streamlit as st


def render_thought(content: str) -> None:
    """Render a collapsible thought expander."""
    with st.expander("Thought", expanded=False):
        st.markdown(content.strip())
