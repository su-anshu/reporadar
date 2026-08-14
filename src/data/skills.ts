export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  installCmd: string;
  repoUrl: string;
}

export const skillsList: Skill[] = [
  {
    id: 'mcp-github',
    name: 'GitHub MCP Server',
    category: 'MCP Servers',
    description: 'Model Context Protocol server for GitHub API. Search code, manage repositories, inspect issues, and execute PR workflows.',
    tags: ['mcp', 'github', 'dev-tools', 'git'],
    installCmd: 'npx -y @modelcontextprotocol/server-github',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github'
  },
  {
    id: 'mcp-filesystem',
    name: 'Filesystem MCP Server',
    category: 'MCP Servers',
    description: 'Provides safe local file read, write, and directory inspection capabilities for AI agents.',
    tags: ['mcp', 'files', 'local', 'io'],
    installCmd: 'npx -y @modelcontextprotocol/server-filesystem',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
  },
  {
    id: 'mcp-postgres',
    name: 'PostgreSQL MCP Server',
    category: 'MCP Servers',
    description: 'Connect AI agents directly to PostgreSQL databases for schema inspection and read-only query execution.',
    tags: ['mcp', 'database', 'postgres', 'sql'],
    installCmd: 'npx -y @modelcontextprotocol/server-postgres',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres'
  },
  {
    id: 'mcp-puppeteer',
    name: 'Puppeteer Browser MCP',
    category: 'MCP Servers',
    description: 'Enables browser automation, screenshot capture, and web page evaluation for AI models.',
    tags: ['mcp', 'browser', 'automation', 'scraping'],
    installCmd: 'npx -y @modelcontextprotocol/server-puppeteer',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer'
  },
  {
    id: 'mcp-slack',
    name: 'Slack MCP Server',
    category: 'MCP Servers',
    description: 'Interact with Slack workspaces, read channel messages, and post updates via Model Context Protocol.',
    tags: ['mcp', 'slack', 'communication', 'chat'],
    installCmd: 'npx -y @modelcontextprotocol/server-slack',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack'
  },
  {
    id: 'mcp-memory',
    name: 'Knowledge Graph Memory MCP',
    category: 'MCP Servers',
    description: 'Persistent memory server storing entities, relations, and context graphs across agent sessions.',
    tags: ['mcp', 'memory', 'knowledge-graph', 'ai-context'],
    installCmd: 'npx -y @modelcontextprotocol/server-memory',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory'
  },
  {
    id: 'mcp-sequential-thinking',
    name: 'Sequential Thinking MCP',
    category: 'AI Reasoning',
    description: 'Dynamic step-by-step problem-solving tool that allows agents to revise, extend, and branch thoughts.',
    tags: ['mcp', 'reasoning', 'thinking', 'chain-of-thought'],
    installCmd: 'npx -y @modelcontextprotocol/server-sequential-thinking',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking'
  },
  {
    id: 'mcp-google-maps',
    name: 'Google Maps MCP Server',
    category: 'MCP Servers',
    description: 'Integrate location search, geocoding, and directions directly into AI conversational interfaces.',
    tags: ['mcp', 'maps', 'geo', 'location'],
    installCmd: 'npx -y @modelcontextprotocol/server-google-maps',
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps'
  }
];
