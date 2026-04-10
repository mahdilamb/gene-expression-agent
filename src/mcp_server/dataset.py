import json

import polars as pl

from mcp_server.constants import DATA_DIR

df = pl.read_csv(DATA_DIR / "owkin_take_home_data (1).csv")


def get_targets(cancer_name: str) -> list[str]:
    """Return a list of genes for a given cancer type."""
    return df.filter(pl.col("cancer_indication") == cancer_name)["gene"].to_list()


def get_expressions(genes: list[str]) -> dict[str, float]:
    """Return the median values for the given list of genes."""
    subset = df.filter(pl.col("gene").is_in(genes))
    genes_list = subset["gene"].to_list()
    values_list = subset["median_value"].to_list()
    return dict(zip(genes_list, values_list, strict=True))


def list_cancer_types() -> list[str]:
    """Return all cancer types available in the dataset."""
    return df["cancer_indication"].unique().to_list()


def plot_medians(genes: list[str], values: list[float]) -> str:
    """Return chart data as JSON for the frontend to render."""
    return json.dumps(
        {
            "genes": genes,
            "values": values,
            "title": "Gene median expression values",
            "x_label": "Gene",
            "y_label": "Median expression",
            "hover_template": "<b>%{x}</b><br>Median: %{y:.2f}<extra></extra>",
        }
    )


def as_csv_string() -> str:
    return df.write_csv()
