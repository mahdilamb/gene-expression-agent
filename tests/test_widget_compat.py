"""Integration tests: MCP server tool output vs chat widget types."""

from chat.types import PlotlyBarChartData
from mcp_server import dataset


def test_plot_medians_validates_as_bar_chart_data():
    """Ensure plot_medians output is valid PlotlyBarChartData."""
    genes = ["BRCA1", "TP53"]
    values = [0.5, 0.3]
    raw = dataset.plot_medians(genes, values)
    data = PlotlyBarChartData.model_validate_json(raw)
    assert data.genes == genes, "Expected genes to match"
    assert data.values == values, "Expected values to match"
    assert data.title, "Expected title to be set"
    assert data.x_label, "Expected x_label to be set"
    assert data.y_label, "Expected y_label to be set"


def test_plot_medians_from_real_data_validates():
    """End-to-end: get_expressions -> plot_medians -> PlotlyBarChartData."""
    expressions = dataset.get_expressions(["BRCA1", "TP53"])
    genes = list(expressions.keys())
    values = list(expressions.values())
    raw = dataset.plot_medians(genes, values)
    data = PlotlyBarChartData.model_validate_json(raw)
    assert data.genes == genes, "Expected genes to match dataset"
    assert data.values == values, "Expected values to match dataset"
