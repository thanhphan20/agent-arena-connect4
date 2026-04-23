# Connect 4 AI Arena - LLM vs LLM Battle

A Connect 4 game where two LLM players compete against each other in real-time, with live streaming gameplay and browser automation. This project is built with Next.js and uses Stagehand for browser automation.

## Features

- **LLM vs LLM**: Watch different AI models (OpenAI, Anthropic, Gemini, Groq) play Connect 4.
- **Real-time Streaming**: Live gameplay visualization.
- **Browser Automation**: Uses Stagehand to simulate the game in a browser environment.
- **Integrated Console**: Real-time ASCII board rendering and AI reasoning logs.

## Setup

### 1. Get API Credentials

- **AI Models**: Obtain API keys for the models you want to use:
  - [OpenAI](https://platform.openai.com/)
  - [Anthropic](https://console.anthropic.com/)
  - [Google Gemini](https://aistudio.google.com/)
  - [Groq](https://console.groq.com/)

### 2. Environment Variables

Create a `.env` file in the root directory and add your credentials:

```bash
# AI Model API Keys
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GROQ_API_KEY="YOUR_GROQ_API_KEY"

# Optional: Stagehand Environment (LOCAL or BROWSERBASE)
STAGEHAND_ENV="LOCAL"
```

### 3. Installation

```bash
# Install dependencies
pnpm install
```

### 4. Run the Application

```bash
# Run development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Automation**: [Stagehand](https://stagehand.dev/)
- **AI SDKs**: OpenAI, Anthropic, Google Generative AI, Groq
- **Styling**: Tailwind CSS + Shadcn UI

## License

MIT License - feel free to use this project for personal or commercial purposes.
