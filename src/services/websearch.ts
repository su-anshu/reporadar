import { GoogleGenAI, Type } from '@google/genai';
import { getClient, getSelectedGeminiModel } from './gemini';

function cleanJsonText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
}

export async function searchWebForRepos(queries: string[]): Promise<{ owner: string, name: string, citation: string }[]> {
  const results: { owner: string, name: string, citation: string }[] = [];

  for (const q of queries) {
    try {
      const ai = getClient();
      const prompt = `Use Google Search to find recommendations for the following developer query: "${q}".
      Look for reddit threads, hacker news, dev.to, awesome lists, and technical blogs.
      Extract any mentioned GitHub repositories.
      Return a JSON array of objects with "owner", "name", and "citation" (the URL where you found the recommendation).
      If you find no repos, return [].`;

      const response = await ai.models.generateContent({
        model: getSelectedGeminiModel(),
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                owner: { type: Type.STRING },
                name: { type: Type.STRING },
                citation: { type: Type.STRING }
              },
              required: ["owner", "name", "citation"]
            }
          }
        }
      });

      const text = cleanJsonText(response.text || '');
      const parsed = JSON.parse(text || "[]");
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      }
    } catch (e) {
      console.error("Web search error", e);
    }
  }

  // Deduplicate
  const unique = new Map<string, any>();
  for (const r of results) {
     if (!r.owner || !r.name) continue;
     const key = `${r.owner}/${r.name}`.toLowerCase();
     if (!unique.has(key)) {
       unique.set(key, r);
     }
  }

  return Array.from(unique.values());
}
