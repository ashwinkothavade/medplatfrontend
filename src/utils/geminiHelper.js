// Gemini API helper for generative Q&A and chart suggestion
// NOTE: For production, proxy this through your backend to keep your API key safe

export async function askGemini({ apiKey, question, columns, sql, data }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Compose enhanced prompt for data analysis
  let prompt = `You are a professional data analyst assistant specializing in business intelligence and data visualization.

CONTEXT:
- You are analyzing a dataset from a SQL query
- Your role is to provide accurate, insightful analysis based ONLY on the provided data
- When recommending visualizations, you can ONLY suggest: Bar Chart, Line Chart, or Pie Chart

DATASET INFORMATION:
`;

  if (sql) {
    prompt += `SQL Query: ${sql}\n`;
  }

  if (columns && columns.length > 0) {
    prompt += `Available Columns: ${columns.join(", ")}\n`;
  }

  if (data && data.length > 0) {
    // Provide data summary for better context
    const dataCount = data.length;
    const sampleData = data.slice(0, 3); // Show first 3 rows as sample
    prompt += `Dataset Size: ${dataCount} rows\n`;
    prompt += `Sample Data (first 3 rows): ${JSON.stringify(
      sampleData,
      null,
      2
    )}\n`;

    if (data.length > 0) {
      const firstRow = data[0];
      const columnTypes = Object.keys(firstRow).map((col) => {
        const sampleValue = firstRow[col];
        const type =
          typeof sampleValue === "number"
            ? "numeric"
            : typeof sampleValue === "string"
            ? "text"
            : "unknown";
        return `${col} (${type})`;
      });
      prompt += `Column Types: ${columnTypes.join(", ")}\n`;
    }
  }

  if (question) {
    prompt += `\nUSER QUESTION: ${question}\n`;
  }

  prompt += `\nINSTRUCTIONS:
1. Analyze the data thoroughly and provide accurate insights
2. If asked about visualization/charts, recommend ONLY from these 3 options:
   - Bar Chart: Best for comparing categories, showing frequency distributions
   - Line Chart: Best for showing trends over time or continuous data
   - Pie Chart: Best for showing proportions/percentages of a whole (max 6-8 categories)
3. Provide specific insights about the data patterns, trends, or anomalies
4. If asked for statistics, calculate them from the provided data
5. Base your answers ONLY on the data provided - do not make assumptions
6. Be concise but informative in your responses
7. If the question cannot be answered from the available data, clearly state this

RESPONSE FORMAT:
- Start with a direct answer to the question
- Provide supporting data insights
- If chart recommendation is relevant, suggest the most appropriate chart type and explain why
- Keep responses under 200 words for clarity

Please provide your analysis:`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      maxOutputTokens: 500, // Limit response length
      topP: 0.8,
      topK: 40,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Gemini API error: " + res.statusText);
  const json = await res.json();
  // Gemini returns answer in json.candidates[0].content.parts[0].text
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No answer.";
}
