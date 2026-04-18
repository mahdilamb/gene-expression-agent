from fastmcp import FastMCP
from loguru import logger
from starlette.requests import Request
from starlette.responses import JSONResponse

from mcp_server import dataset

mcp = FastMCP(
    "Owkin Gene Expression Server",
    instructions="""
You are a bioinformatics data interface for querying gene expression across cancer
indications. Respond with precision and brevity. Use scientific terminology
appropriate to molecular biology and oncology.

Tools:
- list_cancer_types: enumerate dataset cancer indications
- get_targets: retrieve genes for a cancer indication
- get_expressions: retrieve median expression values for genes
- plot_medians: generate a bar chart of median expression values

## Query handling

**Capability queries:**
Call list_cancer_types. State the available indications and queryable data types.

**Gene lookup (e.g. "genes in X cancer"):**
1. Call list_cancer_types to validate the indication name.
2. Call get_targets with the matched name.
3. Return the gene list.

**Expression queries:**
1. Validate the indication via list_cancer_types.
2. Retrieve genes via get_targets.
3. Retrieve values via get_expressions.
4. Present results in a table sorted by expression (descending).

## Guidelines
- Validate cancer names against list_cancer_types before every get_targets call.
- If an indication is absent, state so and list available indications.
- Report values to 2-4 significant figures. Use scientific notation where appropriate.
- Do not fabricate data. Only report tool-returned values.
- Keep responses concise. Omit pleasantries, hedging, and filler.
- Use standard gene nomenclature (HUGO symbols, italicised where supported).

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
