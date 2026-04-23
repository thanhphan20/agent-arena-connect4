# Connect 4 AI Arena - LLM vs LLM Battle

A Connect 4 game where two LLMs players compete against each other in real-time, with live streaming gameplay and browser automation.

## Browserbase + Stagehand Setup

This app uses Browserbase's cloud infrastructure with Stagehand for browser automation. To enable this feature:

### 1. Get Browserbase Credentials
- Sign up at [Browserbase](https://browserbase.com)
- Navigate to your account settings
- Copy your API key and project ID

### 2. Environment Variables

#### Frontend (.env in root directory)
Create a `.env` file in the root directory:

```bash
# Frontend configuration
VITE_API_BASE_URL=3000
```

#### Backend (.env in server/ directory)
Create a `.env` file in the `server/` directory:

```bash
# Browserbase API credentials
BROWSERBASE_API_KEY=bb_...
BROWSERBASE_PROJECT_ID=proj_...

# OpenAI API Key for AI players
OPENAI_API_KEY=sk-...

# Anthropic API Key for Claude models
ANTHROPIC_API_KEY=sk-ant-...

# Server configuration
PORT=8787
```

> **Note:** You may need to modify the ports if the backend is running on a different port or address.

### 3. For Development

### Frontend
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Backend
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Run development server
npm run dev
```

## License

MIT License - feel free to use this project for personal or commercial purposes.
