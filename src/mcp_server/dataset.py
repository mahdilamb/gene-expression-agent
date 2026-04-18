import json

import pandas as pd

from mcp_server.constants import DATA_DIR

df = pd.read_csv(DATA_DIR / "owkin_take_home_data (1).csv")


def get_targets(cancer_name: str) -> list[str]:
    """Return a list of genes for a given cancer type."""
    return df[df["cancer_indication"] == cancer_name]["gene"].tolist()


def get_expressions(genes: list[str]) -> dict[str, float]:
    """Return the median values for the given list of genes."""
    subset = df[df["gene"].isin(genes)]
    return dict(zip(subset["gene"], subset["median_value"], strict=True))


def list_cancer_types() -> list[str]:
    """Return all cancer types available in the dataset."""
    return df["cancer_indication"].unique().tolist()


def plot_medians(genes: list[str], values: list[float]) -> str:
    """Return chart data as JSON for the frontend to render."""
    return json.dumps(
        {
            "labels": genes,
            "values": values,
            "title": "Gene median expression values",
            "x_label": "Gene",
            "y_label": "Median expression",
            "hover_template": "<b>%{x}</b><br>Median: %{y:.2f}<extra></extra>",
            "ask_message": "Ask about gene expression data...",
        }
    )


def as_csv_string() -> str:
    return df.to_csv(index=False)
