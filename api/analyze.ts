import { getRepo, getReadme } from './lib/github';
import { analyzeRepoDeep } from './lib/gemini';

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { owner, repo } = req.body || {};
    if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
      return res.status(400).json({ error: 'Missing required parameters "owner" and "repo" in request body.' });
    }

    // 1. Fetch repo details and README
    const [repoDetails, readme] = await Promise.all([
      getRepo(owner, repo),
      getReadme(owner, repo)
    ]);

    const summary = JSON.stringify({
       name: repoDetails.full_name,
       description: repoDetails.description,
       topics: repoDetails.topics,
       stars: repoDetails.stargazers_count,
       created: repoDetails.created_at,
       updated: repoDetails.pushed_at
    });

    // 2. Perform Gemini assessment
    const analysis = await analyzeRepoDeep(summary, readme);
    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error("API Analyze Error:", error);
    return res.status(500).json({ error: error.message || 'Internal server error during analysis.' });
  }
}
