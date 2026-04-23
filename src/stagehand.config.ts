import type { ConstructorParams } from "@browserbasehq/stagehand";

// This configuration tells Stagehand to run in Browserbase's cloud
// and uses OpenAI for the LLM. Values are read from environment variables.
const stagehandConfig: ConstructorParams = {
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  modelName: "gpt-4o",
  modelClientOptions: {
    apiKey: process.env.OPENAI_API_KEY,
  },
};

export default stagehandConfig;


