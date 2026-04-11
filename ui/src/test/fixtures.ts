/** Canned response data shared between mock-server.mjs and MSW test handlers. */

export const CHART_DATA = {
  labels: ["BRCA2","BRCA1","TP53","GATA3","CDH1","ESR1","MAP3K1","HER2","PIK3CA","AKT1"],
  values: [0.112,0.158,0.373,0.602,0.834,0.716,0.701,0.42,0.762,0.278],
  title: "Gene median expression values",
  x_label: "Gene",
  y_label: "Median expression",
  hover_template: "<b>%{x}</b><br>Median: %{y:.2f}<extra></extra>",
};

export const TABLE_DATA: Record<string, number> = {
  CDH1: 0.834, PIK3CA: 0.762, ESR1: 0.716, MAP3K1: 0.701,
  GATA3: 0.602, HER2: 0.42,   TP53: 0.373, AKT1: 0.278,
  BRCA1: 0.158, BRCA2: 0.112,
};

export const RESPONSES = {
  help: `I can help you explore cancer genomics data! Here are the main things I can do:

## 🔍 **Gene Discovery**
- Find genes associated with specific cancer types
- Example: "What genes are involved in lung cancer?" or "Show me breast cancer genes"

## 📊 **Expression Analysis**
- Get median expression values for specific genes
- Example: "What's the expression level of TP53?" or "Compare BRCA1 and BRCA2 expression"

## 📈 **Data Visualization**
- Create bar charts showing gene expression levels
- Example: "Plot the expression of oncogenes in breast cancer"

## 🗂️ **Dataset Exploration**
- List all available cancer types in the dataset

Just ask me about any cancer type, specific genes, or request visualizations!`,

  genes: `<!--THINKING:Called **get_targets**: \`["BRCA2","BRCA1","TP53","GATA3","CDH1","ESR1","MAP3K1","HER2","PIK3CA","AKT1"]\`-->Here are the genes involved in breast cancer according to the dataset:

## **Breast Cancer Associated Genes:**

1. **BRCA1** - Tumor suppressor gene, hereditary breast cancer susceptibility
2. **BRCA2** - Tumor suppressor gene, hereditary breast cancer susceptibility
3. **TP53** - "Guardian of the genome," frequently mutated tumor suppressor
4. **HER2** - Growth factor receptor, important therapeutic target
5. **PIK3CA** - Part of PI3K/AKT pathway, frequently mutated in breast cancer
6. **ESR1** - Estrogen receptor, critical for hormone receptor-positive breast cancer
7. **GATA3** - Transcription factor important in breast development
8. **CDH1** - E-cadherin, cell adhesion molecule
9. **MAP3K1** - Kinase involved in cell signaling pathways
10. **AKT1** - Key protein in cell survival and proliferation pathways

Would you like me to show you the expression levels of these genes, or create a visualization?`,

  chart: `<!--THINKING:Called **get_expressions** and **plot_medians**--><!--CHART:${JSON.stringify(CHART_DATA)}-->Here are the median expression values for breast cancer genes.

## **Key Observations:**
🔹 **Highest Expression**: CDH1 shows the highest median expression.
🔹 **Lowest Expression**: The BRCA genes show the lowest expression.`,

  table: `<!--TABLE:${JSON.stringify(TABLE_DATA)}-->Here is the breast cancer gene expression data as a table.`,
};

/** Pre-built session history used as the initial state in tests. */
export const SESSION_MESSAGES = [
  { id: "msg-test-0", role: "user",      content: "what genes are involved in breast cancer?" },
  { id: "msg-test-1", role: "assistant", content: RESPONSES.genes },
  { id: "msg-test-2", role: "user",      content: "yes" },
  { id: "msg-test-3", role: "assistant", content: RESPONSES.chart },
];
