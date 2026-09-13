import { GoogleGenAI, Type } from '@google/genai';
import { searchRepos, getReadme, getRepo } from './github';
import { searchWebForRepos } from './websearch';
import { AskStep, AskResult, GitHubRepo } from '../types';

export function getGeminiApiKey(): string {
  return localStorage.getItem('gemini_api_key') || 
         import.meta.env.VITE_GEMINI_API_KEY || 
         (window as any).process?.env?.GEMINI_API_KEY || 
         (window as any).GEMINI_API_KEY || 
         '';
}

export function setGeminiApiKey(key: string) {
  if (key) {
    localStorage.setItem('gemini_api_key', key);
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

export function getSelectedGeminiModel(): string {
  const model = localStorage.getItem('gemini_model');
  if (!model || model.includes('2.5')) {
    localStorage.setItem('gemini_model', 'gemini-2.0-flash');
    return 'gemini-2.0-flash';
  }
  return model;
}

export function setSelectedGeminiModel(model: string) {
  if (model) {
    localStorage.setItem('gemini_model', model);
  } else {
    localStorage.removeItem('gemini_model');
  }
}

export interface GeminiModelInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

export const DEFAULT_GEMINI_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
];

export async function fetchGeminiModels(apiKey?: string): Promise<GeminiModelInfo[]> {
  const key = apiKey || getGeminiApiKey();
  if (!key) {
    return DEFAULT_GEMINI_MODELS;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      console.warn("Failed to fetch models dynamically, using defaults:", res.statusText);
      return DEFAULT_GEMINI_MODELS;
    }
    const data = await res.json();
    if (Array.isArray(data.models)) {
      const fetched: GeminiModelInfo[] = data.models
        .filter((m: any) => {
          const methods = m.supportedGenerationMethods || [];
          return (methods.includes('generateContent') || methods.includes('generateText')) && m.name && m.name.toLowerCase().includes('gemini');
        })
        .map((m: any) => {
          const id = m.name.replace(/^models\//, '');
          return {
            id,
            name: id,
            displayName: m.displayName ? `${m.displayName} (${id})` : id,
            description: m.description
          };
        });

      if (fetched.length > 0) {
        return fetched;
      }
    }
  } catch (err) {
    console.warn("Error fetching Gemini models:", err);
  }

  return DEFAULT_GEMINI_MODELS;
}

export async function testGeminiApi(apiKey: string, selectedModel?: string): Promise<{ success: boolean; message: string; models: GeminiModelInfo[] }> {
  if (!apiKey.trim()) {
    return { success: false, message: 'Please enter a Gemini API key first.', models: DEFAULT_GEMINI_MODELS };
  }

  try {
    const models = await fetchGeminiModels(apiKey.trim());
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const targetModel = selectedModel || getSelectedGeminiModel() || 'gemini-2.0-flash';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: 'Hello! Respond with: "OK"'
    });

    if (response && response.text) {
      return {
        success: true,
        message: `Connected successfully! Gemini API key is active. Model "${targetModel}" responded properly. Loaded ${models.length} models into dropdown.`,
        models
      };
    } else {
      return {
        success: true,
        message: `API Key is valid! Loaded ${models.length} available Gemini models.`,
        models
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Gemini API Test Failed: ${err.message || 'Invalid API key or network error.'}`,
      models: DEFAULT_GEMINI_MODELS
    };
  }
}

export function getClient() {
  const apiKey = getGeminiApiKey();
                 
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure your Gemini API Key in Settings.");
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

export async function summarizeDaily(repos: any[]) {
   const ai = getClient();
   const currentModel = getSelectedGeminiModel();
   const response = await ai.models.generateContent({
     model: currentModel,
     contents: `Summarize what is happening in open source today based on these trending repos. Focus on key themes, emerging paradigms, and notable tools. Produce a concise bulleted markdown summary.
     
     Repos: ${JSON.stringify(repos.map(r => ({name: r.name, desc: r.description, topics: r.topics, stars: r.stargazers_count})))}`
   });
   return response.text || '';
}

export async function askRadar(query: string, onStep: (step: AskStep) => void): Promise<AskResult> {
  onStep({ stage: 'intent', status: 'pending', message: 'Extracting search intent and GitHub query strategies...' });
  const intentObj = await extractAskIntent(query);
  onStep({ stage: 'intent', status: 'success', message: `Target intent: "${intentObj.intent}"` });

  onStep({ stage: 'search', status: 'pending', message: 'Executing parallel search across GitHub and web grounding...' });
  const candidatesMap = new Map<string, GitHubRepo>();

  // 1. Prepare GitHub search queries with archived:false
  const queries = (intentObj.github_queries || []).slice(0, 4).map((q: string) => 
    q.includes('archived:') ? q : `${q} archived:false`
  );

  const searchPromises = queries.map((q: string) =>
    searchRepos(q, 'stars', 'desc', 10)
      .then(res => res.items.forEach(r => candidatesMap.set(r.full_name, r)))
      .catch(e => console.warn("Sub-query search warning:", q, e))
  );

  // 2. Web search grounding for community recommendations
  const webQueries = (intentObj.web_queries || []).slice(0, 2);
  const webPromise = webQueries.length > 0
    ? searchWebForRepos(webQueries)
        .then(async webHits => {
          for (const hit of webHits.slice(0, 5)) {
            if (!candidatesMap.has(`${hit.owner}/${hit.name}`)) {
              try {
                const repo = await getRepo(hit.owner, hit.name);
                if (repo && !repo.archived) {
                  candidatesMap.set(repo.full_name, repo);
                }
              } catch (e) {
                // Ignore missing repo
              }
            }
          }
        })
        .catch(e => console.warn("Web grounding warning:", e))
    : Promise.resolve();

  await Promise.allSettled([...searchPromises, webPromise]);

  const candidateList = Array.from(candidatesMap.values());
  onStep({ stage: 'search', status: 'success', message: `Discovered ${candidateList.length} candidate projects.` });

  if (!candidateList.length) {
    return {
      explanation: "No matching repositories found on GitHub for this query. Try adjusting terms.",
      repos: []
    };
  }

  onStep({ stage: 'rank', status: 'pending', message: `Fetching READMEs and evaluating with Gemini (${getSelectedGeminiModel()})...` });

  // 3. Grounding: Fetch README snippets in parallel for top candidates so Gemini evaluates real code/docs
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
  onStep({ stage: 'rank', status: 'success', message: 'Architectural evaluation complete.' });

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

export async function convertReposToMCPs(repos: GitHubRepo[]): Promise<any[]> {
  const ai = getClient();
  const currentModel = getSelectedGeminiModel();
  
  const prompt = `You are an expert AI software architect. Given these GitHub repositories tagged with "mcp" or "model-context-protocol", analyze each and output a structured JSON array representing them as MCP Skills.
  
  For each repository, you MUST determine:
  - id: A unique string identifier (e.g., "mcp-github-tool").
  - name: A user-friendly name (e.g., "GitHub MCP Server").
  - category: A category like "MCP Servers", "AI Reasoning", "Database", "DevTools", "Browser", "Productivity", or "APIs".
  - description: A clear, concise 2-sentence description of what it does and why an agent would use it.
  - tags: A list of 3-4 lowercase tags (e.g., ["git", "mcp", "automation"]).
  - installCmd: The NPM/Pip/Docker command to install/run this MCP server. If it is an npm package, format it as "npx -y @username/server-name" or similar, or a standard install command from typical documentation if you know it, otherwise default to "npx -y <package-name>".
  - repoUrl: The exact repository HTML URL.
  
  Repositories:
  ${JSON.stringify(repos.map(r => ({
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description,
    topics: r.topics
  })))}
  
  Output a JSON array of objects conforming to this schema. Do not include markdown headers or other text.`;

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
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            installCmd: { type: Type.STRING },
            repoUrl: { type: Type.STRING }
          },
          required: ["id", "name", "category", "description", "tags", "installCmd", "repoUrl"]
        }
      }
    }
  });

  const text = cleanJsonText(response.text || '');
  return JSON.parse(text || "[]");
}


