export const LLM_MODELS = [
  // Gemini Low-Cost (Standard/Stable)
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite-preview-0205",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite-001",
  
  // Gemma (Lightweight)
  "gemma-3-4b-it",
  "gemma-3-12b-it",

  // Groq (Free/Instant)
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
] as const;

export type ModelName = typeof LLM_MODELS[number];


