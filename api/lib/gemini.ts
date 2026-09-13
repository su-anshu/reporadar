import { GoogleGenAI, Type } from '@google/genai';
import { searchRepos, getReadme, getRepo } from './github';
import { AskResult, GitHubRepo } from '../../src/types';

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

export function getSelectedGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

export function getClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
}

function cleanJsonText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
}

export async function analyzeRepoDeep(repoSummary: string, readme: string) {
  const ai = getClient();
  const currentModel = getSelectedGeminiModel();
  const prompt = `Analyze this GitHub repository. 
  
  Repository Summary:
  ${repoSummary}
  
  README snippet:
  ${readme.slice(0, 5000)}
  
  Return a JSON object with the following structure:
  {
    "whatItDoes": "One paragraph explaining what it does.",
    "targetAudience": "Who should use it",
    "nonTargetAudience": "Who shouldn't use it",
    "maturity": "experimental | active | stable | stale | abandoned",
    "alternatives": ["alt1", "alt2"],
    "integrationEffort": "low | medium | high",
    "integrationReasoning": "Why this effort level"
  }`;

  const response = await ai.models.generateContent({
    model: currentModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          whatItDoes: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          nonTargetAudience: { type: Type.STRING },
          maturity: { type: Type.STRING },
          alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
          integrationEffort: { type: Type.STRING },
          integrationReasoning: { type: Type.STRING }
        },
        required: ["whatItDoes", "targetAudience", "nonTargetAudience", "maturity", "alternatives", "integrationEffort", "integrationReasoning"]
      }
    }
  });

  const text = cleanJsonText(response.text || '');
  return JSON.parse(text || "{}");
}

export async function extractAskIntent(query: string) {
  const ai = getClient();
  const currentModel = getSelectedGeminiModel();
  const response = await ai.models.generateContent({
    model: currentModel,
    contents: `Extract intent and generate search queries for this use case: "${query}"
    
    The github_queries MUST use real GitHub search qualifiers (e.g. topic:, language:, stars:>, pushed:>) and varied strategies.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          must_have: { type: Type.ARRAY, items: { type: Type.STRING } },
          nice_to_have: { type: Type.ARRAY, items: { type: Type.STRING } },
          languages: { type: Type.ARRAY, items: { type: Type.STRING } },
          topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          exclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
          github_queries: { type: Type.ARRAY, items: { type: Type.STRING } },
          web_queries: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["intent", "must_have", "nice_to_have", "languages", "topics", "exclusions", "github_queries", "web_queries"]
      }
    }
  });

  const text = cleanJsonText(response.text || '');
  return JSON.parse(text || "{}");
}

export async function rankCandidates(queryContext: any, candidates: any[]) {
  const ai = getClient();
  const currentModel = getSelectedGeminiModel();
  const prompt = `You are a technical architect evaluating GitHub repositories against a user's use case.
  
  User Intent: ${JSON.stringify(queryContext)}
  
  Candidates to evaluate:
  ${JSON.stringify(candidates.map((c: any) => ({
    full_name: c.full_name,
    description: c.description,
    stars: c.stargazers_count,
    readme_snippet: c.readme ? c.readme.slice(0, 1500) : "",
    updated_at: c.pushed_at,
    topics: c.topics
  })))}
  
  Output a JSON array of objects for evaluated candidates:
  [
    {
      "full_name": string,
      "score": number,
      "fit_reason": string,
      "caveats": string,
      "matched_requirements": string[],
      "unmet_requirements": string[],
      "maturity": string
    }
  ]
  `;

  const response = await ai.models.generateContent({
    model: currentModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            full_name: { type: Type.STRING },
            score: { type: Type.INTEGER },
            fit_reason: { type: Type.STRING },
            caveats: { type: Type.STRING },
            matched_requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            unmet_requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            maturity: { type: Type.STRING }
          },
          required: ["full_name", "score", "fit_reason", "caveats", "matched_requirements", "unmet_requirements", "maturity"]
        }
      }
    }
  });

  const text = cleanJsonText(response.text || '');
  return JSON.parse(text || "[]");
}

export async function askRadarBackend(query: string): Promise<AskResult> {
  const intentObj = await extractAskIntent(query);
  const candidatesMap = new Map<string, GitHubRepo>();

  const queries = (intentObj.github_queries || []).slice(0, 4).map((q: string) => 
    q.includes('archived:') ? q : `${q} archived:false`
  );

  for (const q of queries) {
    try {
      const res = await searchRepos(q, 'stars', 'desc', 10);
      res.items.forEach(r => candidatesMap.set(r.full_name, r));
    } catch (e) {
      console.warn("Sub-query search warning:", q, e);
    }
  }

  const candidateList = Array.from(candidatesMap.values());
  if (!candidateList.length) {
    return {
      explanation: "No matching repositories found on GitHub for this query. Try adjusting terms.",
      repos: []
    };
  }

  // Grounding: Fetch README snippets in parallel for candidates
  const candidatesToEvaluate = candidateList.slice(0, 16);
  const candidatesWithReadme = await Promise.all(
    candidatesToEvaluate.map(async (repo) => {
      try {
        const readme = await getReadme(repo.owner.login, repo.name);
        return {
          ...repo,
          readme: readme ? readme.slice(0, 2500) : ""
        };
      } catch {
        return { ...repo, readme: "" };
      }
    })
  );

  const ranked = await rankCandidates(intentObj, candidatesWithReadme);
  const rankedMap = new Map<string, number>();
  ranked.forEach((item: any) => rankedMap.set(item.full_name, item.score || 0));

  const sortedRepos = candidateList.sort((a, b) => (rankedMap.get(b.full_name) || 0) - (rankedMap.get(a.full_name) || 0));

  const top3Names = sortedRepos.slice(0, 3).map(r => `\`${r.full_name}\``).join(', ');
  const explanation = `### AI Search Summary\n\n**Intent**: ${intentObj.intent}\n\n**Top Recommendations**: ${top3Names}\n\nEvaluated ${candidateList.length} candidate repositories using **${getSelectedGeminiModel()}** grounded with real documentation, project activity, license, and architectural fit.`;

  return {
    explanation,
    repos: sortedRepos.slice(0, 15)
  };
}

export async function fetchDeveloperFeed() {
  const ai = getClient();
  const prompt = `Search the web for the latest developer news from the last 7 days.
  Focus on Hacker News, Reddit (r/programming, r/webdev, r/LocalLLaMA), dev.to, and major framework blogs.
  Return a JSON array of news items.
  Each item MUST have:
  - title: string
  - summary: string (2-3 sentences)
  - category: "Trending Discussions" | "Dev Blogs & Releases" | "AI Ecosystem"
  - citation: string (the URL)
  Ensure you output exactly 9 distinct high-quality items.`;

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
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            category: { type: Type.STRING },
            citation: { type: Type.STRING }
          },
          required: ["title", "summary", "category", "citation"]
        }
      }
    }
  });

  const text = cleanJsonText(response.text || '');
  return JSON.parse(text || "[]");
}
