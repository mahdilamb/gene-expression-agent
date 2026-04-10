from fastmcp import FastMCP
from loguru import logger
from starlette.requests import Request
from starlette.responses import JSONResponse

from mcp_server import dataset

mcp = FastMCP(
    "Owkin Gene Expression Server",
    instructions="""
You are a bioinformatics assistant helping non-technical stakeholders explore gene
expression data across cancer types.

You have access to four tools:
- list_cancer_types: discover what cancers are in the dataset
- get_targets: get the genes associated with a specific cancer
- get_expressions: get median expression values for a list of genes
- plot_medians: plot a bar chart of median expression values for a set of genes

## How to answer queries

**"How can you help me?"**
Explain that you can look up genes involved in specific cancer types and retrieve
their median expression values. Call list_cancer_types and mention the available
cancers by name.

**"What genes are involved in X cancer?"**
1. Call list_cancer_types first to verify the exact cancer name in the dataset.
2. Call get_targets with the matched name.
3. Return the gene list in a readable format.

**"What is the median expression of genes in X cancer?"**
1. Call list_cancer_types to normalize the cancer name.
2. Call get_targets to retrieve the gene list.
3. Call get_expressions with those genes.
4. Summarize the results clearly — a small table works well for non-technical readers.

## Guidelines
- Always normalize cancer names against list_cancer_types before calling get_targets.
  Never guess the exact string.
- If a cancer type is not found in the dataset, say so clearly and list what is
  available.
- Present numbers rounded to 2 decimal places.
- Avoid bioinformatics jargon unless the user explicitly uses it first.
- Do not fabricate gene names or expression values — only report what the tools return.

## Available resources
- data://gene-expression: the full raw CSV dataset. Expose this when the user asks
  to download, inspect, or explore the data directly. Do not use it as a substitute
  for the tools — prefer get_targets and get_expressions for analytical queries.
""",
)


@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request) -> JSONResponse:
    return JSONResponse({"healthy": "ok"})


@mcp.tool()
async def get_targets(cancer_name: str) -> list[str]:
    """Return a list of genes associated with a given cancer type.

    Use this when the user asks about genes involved in a specific cancer,
    e.g. 'What genes are involved in lung cancer?'

    Args:
        cancer_name: The cancer indication to look up
            (e.g. 'lung', 'breast', 'esophageal'). Use lowercase,
            single-word cancer names as they appear in the dataset.
    """
    return dataset.get_targets(cancer_name)


@mcp.tool()
async def get_expressions(genes: list[str]) -> dict[str, float]:
    """Return the median expression values for a given list of genes.

    Use this after get_targets to retrieve expression levels, or when the user
    asks for median expression values of specific genes.

    Args:
        genes: A list of gene names to look up (e.g. ['TP53', 'BRCA1']).
               These should come from get_targets or be explicitly named by the user.
    """
    logger.info("Getting expression data for %s", genes)
    return dataset.get_expressions(genes)


@mcp.tool()
async def list_cancer_types() -> list[str]:
    """Return all cancer types available in the dataset.

    Use this when the user asks what cancers are supported, or when you need to
    validate/normalize a cancer name before calling get_targets.
    """
    logger.info("Listing all cancer types.")
    return dataset.list_cancer_types()


@mcp.tool()
async def plot_medians(genes: list[str], values: list[float]) -> str:
    """Plot a bar chart of median expression values for a set of genes.

    Returns the chart as a base64-encoded PNG string.

    Use this when the user asks to visualize or plot gene expression data.
    Call get_expressions first to obtain the values, then pass the genes and
    values to this tool.

    Args:
        genes: A list of gene names (x-axis labels).
        values: Corresponding median expression values (y-axis).
    """
    return dataset.plot_medians(genes, values)


@mcp.resource("data://gene-expression")
def get_raw_data() -> str:
    """The full gene expression dataset as CSV."""
    return dataset.as_csv_string()
