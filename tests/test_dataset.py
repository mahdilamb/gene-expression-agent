import json

from mcp_server import dataset


def test_list_cancer_types_returns_list():
    """Test that cancer types can be listed."""
    expected = [
        "breast",
        "colorectal",
        "gastric",
        "glioblastoma",
        "lung",
        "melanoma",
        "ovarian",
        "pancreatic",
        "prostate",
        "renal",
    ]
    result = dataset.list_cancer_types()
    assert isinstance(result, list)
    assert len(result) > 0
    assert all(isinstance(t, str) for t in result), (
        "Expected all elements to be strings"
    )
    assert sorted(result) == expected


def test_get_targets_returns_genes():
    expected = [
        "AKT1",
        "BRCA1",
        "BRCA2",
        "CDH1",
        "ESR1",
        "GATA3",
        "HER2",
        "MAP3K1",
        "PIK3CA",
        "TP53",
    ]
    genes = dataset.get_targets("breast")
    assert isinstance(genes, list)
    assert sorted(genes) == expected


def test_get_targets_unknown_cancer():
    genes = dataset.get_targets("nonexistent_cancer")
    assert genes == []


def test_get_expressions_returns_dict():
    result = dataset.get_expressions(["BRCA1", "TP53"])
    assert isinstance(result, dict)
    assert result == {"BRCA1": 0.158, "TP53": 0.373}


def test_get_expressions_unknown_gene():
    result = dataset.get_expressions(["FAKEGENE123"])
    assert result == {}


def test_get_expressions_empty_list():
    result = dataset.get_expressions([])
    assert result == {}


def test_plot_medians_returns_json():
    genes = ["BRCA1", "TP53"]
    values = [0.5, 0.3]
    result = dataset.plot_medians(genes, values)
    parsed = json.loads(result)
    assert parsed["genes"] == genes
    assert parsed["values"] == values


def test_as_csv_string():
    csv = dataset.as_csv_string()
    assert isinstance(csv, str)
    assert "cancer_indication" in csv
    assert "gene" in csv
    assert "median_value" in csv


def test_get_targets_all_cancers():
    """Every cancer type should return at least one gene."""
    for cancer in dataset.list_cancer_types():
        genes = dataset.get_targets(cancer)
        assert len(genes) > 0, f"{cancer} returned no genes"
