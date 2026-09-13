# RepoRadar — Product Documentation

## 1. Executive Summary

RepoRadar is an AI-powered GitHub repository discovery engine and open-source intelligence platform. It bridges the gap between raw GitHub data and actionable developer insights by combining real-time GitHub API telemetry, client-side differential star velocity tracking, and Google Gemini 2.0 generative evaluation with real-time web search grounding.

Unlike static directory lists or algorithmic trending feeds susceptible to vanity metrics, RepoRadar evaluates architectural maturity, computes daily star velocity ($\Delta \text{stars} / \Delta \text{days}$), translates natural language developer needs into multi-query GitHub search strategies, and curates emerging ecosystems like Model Context Protocol (MCP) servers and AI agent extensions.

---

## 2. Product Vision & Value Proposition

### 2.1 Core Problem Statements
- **GitHub Search Limitations**: Keyword-based search lacks semantic awareness of developer requirements (e.g., "minimal state management with zero boilerplate" vs. finding whatever repo stuffed "state management" into its description).
- **Vanity Metrics vs. Momentum**: Star counts reflect cumulative historical popularity, not current momentum or active development acceleration.
- **Evaluation Overhead**: Reviewing documentation, architectural fit, dependency footprint, and maintainability for prospective open-source tools consumes substantial engineering hours.
- **Fragmented Developer Signals**: Keeping up with bleeding-edge releases requires monitoring separate channels (Hacker News, Reddit r/LocalLLaMA, Twitter/X, engineering blogs).

### 2.2 Value Proposition
- **Semantic Intent Mapping**: Gemini translates plain-English prompts into specialized GitHub search qualifiers and ranks candidates by architectural fitness.
- **Differential Velocity Engine**: Client-side IndexedDB snapshots calculate star acceleration to detect breakout tools before they hit mainstream feeds.
- **Structured Deep Assessment**: One-click architectural teardown assessing project maturity, target audience, anti-patterns, alternatives, and integration effort.
- **MCP & Agent Ecosystem First-Class Citizen**: Dedicated directory for Model Context Protocol servers with one-click install commands and live GitHub detection.
- **Grounded Intelligence**: Web-search grounded news feed synthesizing releases and discussions from developer forums into verified summaries.

---

## 3. Target Audience & Personas

| Persona | Primary Needs | Key RepoRadar Feature Used |
|---|---|---|
| **Software Engineers & Tech Leads** | Selecting dependencies, frameworks, and utility libraries for new greenfield projects or refactors. | Ask AI tab, Deep Architectural Assessment drawer, Alternative comparison. |
| **AI Engineers & Agent Builders** | Discovering MCP tools, agent frameworks, vector database connectors, and LLM tooling. | MCP & Skills tab (Live & Curated), AI/LLM category filter. |
| **Open Source Enthusiasts & DevRel** | Tracking breakout repositories, monitoring star velocity spikes, and staying ahead of ecosystem trends. | Rising Velocity tab, Today momentum carousel, Daily AI summary. |
| **Engineering Managers & CTOs** | Auditing license compliance, project maturity, and maintenance risk before team adoption. | Deep Repo Assessment (Maturity rating, Integration effort rating, License tags). |

---

## 4. System Architecture & Tech Stack

```
+---------------------------------------------------------------------------------------+
|                                    RepoRadar Client                                   |
|                                                                                       |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|  |     React 19       |  |   Tailwind CSS v4    |  |       IndexedDB Storage       |  |
|  | (Vite 6 + TS 5.8)  |  |  (Lucide + Recharts) |  |   (Star Snapshots + Cache)    |  |
|  +---------+----------+  +----------+-----------+  +---------------+---------------+  |
+------------|------------------------|------------------------------|------------------+
             |                        |                              |
             | REST                   | Dual Mode                    | Local
             v                        v                              v
+-----------------------+  +----------------------+  +----------------------------------+
|    GitHub REST API    |  |   Google Gemini AI   |  |     Vercel Serverless APIs       |
|                       |  |  (@google/genai SDK) |  |                                  |
| - Concurrency Queue   |  |                      |  | - /api/search (Search Intent)    |
| - 403/429 Backoff     |  | - Gemini 2.0 Flash   |  | - /api/analyze (Deep Teardown)   |
| - Header Telemetry    |  | - Gemini 1.5 Pro     |  | - /api/feed (Grounded News Feed) |
| - PAT Authentication  |  | - Google Search Tool |  | - OpenAPI 3.0 Specs              |
+-----------------------+  +----------------------+  +----------------------------------+
```

### 4.1 Technology Stack Details

| Layer | Technologies | Purpose |
|---|---|---|
| **Framework & Core** | React 19, TypeScript 5.8, Vite 6 | Fast modern SPA execution, reactive state, and bundle optimization. |
| **Styling & Motion** | Tailwind CSS v4, `@tailwindcss/vite`, clsx, tailwind-merge, Motion | Modern dark-mode interface, glassmorphism, responsive navigation. |
| **Visualizations** | Recharts 3.10 | Historical star progression charts in repository details. |
| **Icons & UI Assets** | Lucide React | Consistent iconography across navigation, metrics, and actions. |
| **Client Storage** | `idb-keyval` (IndexedDB) | Long-term daily star snapshot storage (up to 90 days) and TTL query caching. |
| **AI & LLM Services** | `@google/genai` (Gemini 2.0 Flash, 1.5 Pro) | Intent parsing, candidate ranking, deep teardowns, and daily summaries. |
| **Grounding & Search** | Google Search Tool (Gemini Grounding) | Real-time web retrieval for tech news feed and community citations. |
| **Backend & Routing** | Vercel Serverless Functions, Express types | Edge-compatible serverless API proxy routes (`/api/*`) with CORS support. |

---

## 5. Core Feature Matrix

### 5.1 Tab Breakdown

| Tab | Icon | Purpose | Key Functionality |
|---|---|---|---|
| **Today** | `Flame` | Daily radar & momentum | Newly created repos, high-engagement active repos, AI daily open-source summary, and 24h/7d/30d timeframe filters. |
| **Categories** | `Layers` | Ecosystem exploration | 16 curated technology domains, dynamic sub-search, sorting by stars/updated, and multi-topic GitHub search. |
| **Rising Velocity** | `TrendingUp` | Acceleration tracking | Calculates star accumulation speed using differential IndexedDB snapshots, surfacing repos with high momentum. |
| **Ask AI** | `Sparkles` | Natural language search | Multi-stage pipeline: extracts intent $\rightarrow$ executes parallel GitHub searches $\rightarrow$ ranks results with Gemini. |
| **MCP & Skills** | `Cpu` | Agent tool discovery | Curated and live MCP servers, category filtering, one-click install command copy (`npx -y ...`), and dynamic GitHub-to-MCP parsing. |
| **Tech Feed** | `Newspaper` | Grounded tech news | Real-time web-grounded developer news summaries from Hacker News, Reddit (r/programming, r/LocalLLaMA), and framework blogs. |

### 5.2 Deep Repository Assessment Drawer
Clicking any repository card opens a slide-over drawer providing:
- **Header & Telemetry**: Full repo slug, owner avatar, license badge, primary language tag, star count, and fork count.
- **One-Click Actions**: Quick `git clone` command copy and direct GitHub link.
- **Full README Renderer**: Sanitized Markdown rendering of the repository documentation.
- **Star History Chart**: Visual line chart plotting star growth over recorded snapshot dates.
- **Gemini Architectural Teardown**:
  - *What It Does*: 1-paragraph synthesis of value proposition.
  - *Target Audience*: Who should use this tool.
  - *Non-Target Audience*: Scenarios where developers should avoid it.
  - *Maturity Stage*: Categorization into `experimental`, `active`, `stable`, `stale`, or `abandoned`.
  - *Alternatives*: Notable competitor projects.
  - *Integration Effort*: Rated as `low`, `medium`, or `high` with architectural justification.

---

## 6. Algorithmic & Data Pipeline Details

### 6.1 Star Velocity Algorithm
To prevent star gaming and identify genuine breakout software:
1. When browsing repositories, RepoRadar captures a snapshot of `{ full_name, stars, forks }` mapped to `YYYY-MM-DD` in IndexedDB.
2. Snapshots are stored chronologically for up to 90 days.
3. Velocity is calculated across the oldest and newest recorded dates for a given repo:
   $$\text{Velocity} = \frac{\text{Stars}_{\text{newest}} - \text{Stars}_{\text{oldest}}}{\max\left(1, \frac{\text{Timestamp}_{\text{newest}} - \text{Timestamp}_{\text{oldest}}}{86,400,000}\right)}$$
4. Repositories are ranked descending by star velocity, highlighting tools with rapid community adoption.

### 6.2 Ask AI Multi-Stage Search Pipeline
1. **Stage 1 (Intent Extraction)**: Gemini extracts developer requirements into structured parameters:
   - `intent`: Canonical problem statement
   - `must_have` & `nice_to_have`: Functional constraints
   - `languages` & `topics`: Language and ecosystem tags
   - `github_queries`: Specialized search strings containing qualifiers like `stars:>500`, `topic:...`, `pushed:>...`
2. **Stage 2 (Parallel Candidate Retrieval)**: Top 3 query strategies execute concurrently against the GitHub Search API, consolidating and deduplicating up to 30 candidates.
3. **Stage 3 (Architectural Ranking)**: Top candidates (including star counts, topic tags, and README snippets) are fed back into Gemini with a strict schema to grade fit, maturity, and caveats.
4. **Stage 4 (Synthesis & Presentation)**: Repositories are sorted by architectural score, accompanied by an executive summary highlighting recommended choices.

---

## 7. API Specifications & Endpoints

All backend endpoints are defined in `api/openapi.json` and hosted as serverless functions in `/api/`:

| Endpoint | Method | Input Parameters | Output Response | Description |
|---|---|---|---|---|
| `/api/search` | `POST` | `{ "query": string }` | `{ "explanation": string, "repos": GitHubRepo[] }` | Runs multi-stage intent parsing, parallel GitHub discovery, and architectural candidate ranking. |
| `/api/analyze` | `POST` | `{ "owner": string, "repo": string }` | Structured analysis object (whatItDoes, targetAudience, maturity, alternatives, etc.) | Fetches repo metadata + README and performs deep architectural assessment. |
| `/api/feed` | `GET` | *None* | `Array<{ title, summary, category, citation }>` | Uses Gemini with Google Search tool grounding to return 9 curated developer news summaries. |

---

## 8. Configuration, Rate Limits & Security

### 8.1 API Keys & Credentials
RepoRadar operates with dual-mode credential resolution (environment variables for serverless deployments or browser `localStorage` for client-side override):
- **Google Gemini API Key**:
  - Resolved via `localStorage.gemini_api_key`, `VITE_GEMINI_API_KEY`, or `process.env.GEMINI_API_KEY`.
  - Supports model selection: `gemini-2.0-flash` (default), `gemini-1.5-flash`, `gemini-1.5-pro`, or dynamically retrieved models.
- **GitHub Personal Access Token (PAT)**:
  - Resolved via `localStorage.githubToken` or `process.env.GITHUB_TOKEN`.
  - Upgrades GitHub API limits from 60 requests/hr (unauthenticated) to 5,000 requests/hr (authenticated).

### 8.2 Client-Side Settings Security
- The `SettingsModal` is protected by an admin passcode authentication lock (`Anshu@2026`) to prevent unauthorized modification or key exposure in shared environments.
- API keys can be masked, cleared, and validated in real time via live test connection buttons.

### 8.3 Rate Limit Management & Resilience
- **GitHub Rate Limit Telemetry**: Real-time header tracking (`x-ratelimit-remaining`, `x-ratelimit-reset`) displayed in the header with visual warnings (<20% remaining).
- **Concurrency Control**: Outgoing GitHub calls pass through an in-memory queue throttled to a maximum concurrency of 4 simultaneous requests.
- **Exponential Backoff**: Automatic retry handler with exponential wait times upon receiving `403` or `429` responses with `Retry-After` header parsing.
- **TTL Cache**: Cached responses stored in IndexedDB to minimize redundant GitHub network calls.

---

## 9. Product Directory Structure

```
reporadar/
├── api/                        # Serverless backend functions
│   ├── analyze.ts              # POST /api/analyze - Deep architectural teardown
│   ├── feed.ts                 # GET /api/feed - Grounded developer news feed
│   ├── openapi.json            # OpenAPI 3.0 specification
│   ├── search.ts               # POST /api/search - Multi-stage search endpoint
│   └── lib/
│       ├── gemini.ts           # Server-side Gemini client & AI prompts
│       └── github.ts           # Server-side GitHub API fetcher & rate-limit handler
├── src/                        # Client SPA source
│   ├── App.tsx                 # Main layout, tab controller, global modals
│   ├── main.tsx                # React DOM entry point
│   ├── types.ts                # TypeScript interfaces (GitHubRepo, AskResult, etc.)
│   ├── components/             # Reusable UI components
│   │   ├── Carousel.tsx        # Horizontal scrolling shelf for trending repositories
│   │   ├── Header.tsx          # Brand logo, model badge, rate limit tracker, settings trigger
│   │   ├── RepoCard.tsx        # Repository preview card with topic tags & metrics
│   │   ├── RepoDetail.tsx      # Slide-over drawer with README, history chart & AI analysis
│   │   └── SettingsModal.tsx   # Passcode-protected API key & model settings modal
│   ├── data/                   # Static data registries
│   │   ├── categories.ts       # 16 curated technology domains & search queries
│   │   └── skills.ts           # Curated catalog of MCP servers & tools
│   ├── lib/
│   │   └── utils.ts            # Formatting utilities, star count helpers, class merger
│   ├── services/               # Client-side service layer
│   │   ├── cache.ts            # IndexedDB TTL cache service
│   │   ├── gemini.ts           # Client Gemini SDK wrapper & prompt pipelines
│   │   ├── github.ts           # Client GitHub API client with queue & rate limiting
│   │   ├── snapshots.ts        # Differential star snapshot & velocity calculator
│   │   └── websearch.ts        # Google Search tool grounding service
│   └── tabs/                   # Primary application views
│       ├── Ask.tsx             # Natural language AI search interface
│       ├── Categories.tsx      # Curated domain explorer with dual search & sorting
│       ├── Feed.tsx            # Real-time grounded developer news feed
│       ├── Rising.tsx          # Star velocity leaderboard & momentum tracker
│       ├── Skills.tsx          # Model Context Protocol & AI agent tool directory
│       └── Today.tsx           # Daily radar, new repos, hot movers & daily summary
├── index.html                  # HTML template with Google Fonts
├── metadata.json               # Google AI Studio app configuration
├── package.json                # Project dependencies & build scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vercel.json                 # Vercel deployment rewrites & CORS headers
└── vite.config.ts              # Vite configuration with Tailwind CSS plugin
```

---

## 10. Future Roadmap & Product Opportunities

| Priority | Milestone / Feature | Description |
|---|---|---|
| **P1** | **Multi-Provider AI Fallback** | Add support for Claude, OpenAI, and local Ollama endpoints in addition to Google Gemini. |
| **P2** | **Automated Star Fraud Detection** | Train heuristic detectors to identify sudden unorganic star spikes (botting) vs. authentic GitHub engagement. |
| **P3** | **Dependency & Vulnerability Audit** | Integrate OpenSSF Scorecard and CVE advisory databases directly into the Deep Assessment drawer. |
| **P4** | **Personalized Developer Watchlists** | Enable users to pin repositories, track custom velocity alerts, and export daily digest summaries. |
| **P5** | **Cloud Snapshot Synchronization** | Optional server-side database sync to aggregate star velocity across all RepoRadar users globally. |
