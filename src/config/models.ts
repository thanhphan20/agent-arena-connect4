export const LLM_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
  "groq/compound",
  "groq/compound-mini",
] as const;

export type ModelName = typeof LLM_MODELS[number];


