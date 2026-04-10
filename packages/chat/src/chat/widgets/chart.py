import plotly.express as px
import streamlit as st

from chat.types import PlotlyBarChartData

PLOTLY_LAYOUT = dict(
    template="plotly_white",
    font=dict(family="Inter, system-ui, sans-serif"),
    margin=dict(l=40, r=20, t=40, b=40),
    plot_bgcolor="rgba(0,0,0,0)",
    paper_bgcolor="rgba(0,0,0,0)",
)


def render_chart(raw: str) -> None:
    """Render a Plotly bar chart from JSON data."""
    data = PlotlyBarChartData.model_validate_json(raw)
    fig = px.bar(
        x=data.genes,
        y=data.values,
        labels={"x": data.x_label, "y": data.y_label},
        title=data.title,
        color_discrete_sequence=["#636EFA"],
    )
    fig.update_layout(**PLOTLY_LAYOUT)
    fig.update_traces(
        marker=dict(cornerradius=4),
        hovertemplate=data.hover_template,
    )
    st.plotly_chart(fig, width="stretch")
