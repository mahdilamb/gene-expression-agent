from typing import Literal

from pydantic import BaseModel

type WidgetType = Literal["CHART", "THINKING", "TABLE"]


class PlotlyBarChartData(BaseModel):
    """Data for rendering a Plotly bar chart."""

    genes: list[str]
    values: list[float]
    title: str
    x_label: str
    y_label: str
    hover_template: str | None = None
