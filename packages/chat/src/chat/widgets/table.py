import json

import pandas as pd
import streamlit as st


def render_table(raw: str) -> None:
    """Render a DataFrame table from JSON data."""
    data = json.loads(raw)
    df = pd.DataFrame({"Gene": data.keys(), "Median Expression": data.values()})
    st.dataframe(df, width="stretch", hide_index=True)
