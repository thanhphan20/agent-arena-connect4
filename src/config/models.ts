export const LLM_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5-mini-2025-08-07",
  "gpt-5-2025-08-07",
  "gpt-4.1",
  "claude-sonnet-4-20250514",
] as const;

export type ModelName = typeof LLM_MODELS[number];


