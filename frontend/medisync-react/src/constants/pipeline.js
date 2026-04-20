export const PIPELINE_AGENTS = [
  {
    key: 'pdf_reader',
    name: 'PDF Reader',
    icon: 'description',
    desc: 'Text Extraction',
    role: 'Extracts raw text from uploaded PDF documents',
  },
  {
    key: 'context_agent',
    name: 'Context Agent',
    icon: 'memory',
    desc: 'State Storage',
    role: 'Stores and shares data across agents via shared memory',
  },
  {
    key: 'tool_agent',
    name: 'Tool Agent',
    icon: 'construction',
    desc: 'MCP Decision',
    role: 'Routes input to the appropriate analysis tool',
  },
  {
    key: 'planner_agent',
    name: 'Planner Agent',
    icon: 'hub',
    desc: 'Workflow Planning',
    role: 'Generates a context-aware step-by-step plan',
  },
  {
    key: 'executor_agent',
    name: 'Executor Agent',
    icon: 'play_circle',
    desc: 'Dynamic Execution',
    role: 'Runs the analysis using the selected tool via LLM',
  },
  {
    key: 'validator_agent',
    name: 'Validator Agent',
    icon: 'verified_user',
    desc: 'Output Validation',
    role: 'Checks output quality and confirms the final response quality',
  },
];
