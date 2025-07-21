// Gemini API helper for generative Q&A and chart suggestion
// NOTE: For production, proxy this through your backend to keep your API key safe

export async function askGemini({ apiKey, question, columns, sql, data }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Compose prompt
  let prompt = `You are a data assistant.\n`;
  if (question) {
    prompt += `Question: ${question}\n`;
  }
  if (columns) {
    prompt += `Columns: ${JSON.stringify(columns)}\n`;
  }
  if (sql) {
    prompt += `SQL: ${sql}\n`;
  }
  if (data) {
    prompt += `Data (JSON array): ${JSON.stringify(data)}\n`;
  }
  prompt += `Answer as helpfully and concisely as possible based only on the data provided.`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Gemini API error: " + res.statusText);
  const json = await res.json();
  // Gemini returns answer in json.candidates[0].content.parts[0].text
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No answer.";
}
