import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Move, BoardState } from "../types/connect4";
import { z } from "zod";

const moveDecisionSchema = z.object({
  column: z.number().min(1).max(7),
  confidence: z.number().min(0).max(100).default(50),
  reasoning: z.string().default("Strategic move based on board analysis")
});

export class AIService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private groq: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    
    this.groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  async getConnect4Move(
    playerName: string, 
    playerColor: string, 
    boardState: BoardState, 
    playerModel: string,
    boardHistory?: Array<{ board: string[][]; moveNumber: number; player: string; column: number }>
  ): Promise<Move> {
    try {
      console.log(`🤖 ${playerName} (${playerColor}) is analyzing the board using model: ${playerModel}`);
      
      const prompt = this.createConnect4Prompt(playerColor);
      
      let response: string;
      
      if (this.isGeminiModel(playerModel)) {
        response = await this.callGemini(prompt, playerModel, playerColor, boardState, boardHistory);
      } else if (this.isGroqModel(playerModel)) {
        response = await this.callGroq(prompt, playerModel, playerColor, boardState, boardHistory);
      } else if (this.isAnthropicModel(playerModel)) {
        response = await this.callAnthropic(prompt, playerModel, playerColor, boardState, boardHistory);
      } else {
        response = await this.callOpenAI(prompt, playerModel, playerColor, boardState, boardHistory);
      }
      
      console.log(`🤖 Raw AI response (${response.length} chars): ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
      
      const moveDecision = this.parseAIResponse(response);
      
      console.log(`🤖 Move Analysis for ${playerName}: Column ${moveDecision.column} - ${moveDecision.reasoning}`);
      
      return {
        column: moveDecision.column,
        explanation: `AI ${playerName} (${playerColor}) chose column ${moveDecision.column} - ${moveDecision.reasoning}`
      };
    } catch (error) {
      console.error(`❌ Error getting AI move for ${playerName}: ${error}`);
      throw new Error(`AI Error - ${playerName}: ${error}`);
    }
  }

  private isAnthropicModel(modelName: string): boolean {
    return modelName.toLowerCase().includes('claude');
  }

  private isGeminiModel(modelName: string): boolean {
    return modelName.toLowerCase().includes('gemini');
  }

  private isGroqModel(modelName: string): boolean {
    const lower = modelName.toLowerCase();
    return lower.includes('llama') || lower.includes('mixtral') || lower.includes('qwen') || lower.includes('groq/');
  }

  private createConnect4Prompt(playerColor: string): string {
    return `You are a Connect 4 AI playing as ${playerColor} pieces.

Connect 4 Rules:
- Drop pieces into one of 7 columns (numbered 1-7 from left to right)
- Win by connecting 4 pieces in a row (horizontally, vertically, or diagonally)
- IF the other player is about to win, you should block them. This is the most important rule. After blocking an opponent's immediate threat (3 in a row), reassess the board. Do not attempt to block again if the threat is already neutralized.
- Pieces fall to the bottom of the column or stack on top of existing pieces
- Once the column is full you can't drop a piece in that column.
- You should defend against the other player, but you should also try to win the game.
- Use the move history to understand your opponent's strategy and adapt your play accordingly.

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting outside the JSON.

Return this exact JSON structure:
{
  "column": 4,
  "confidence": 85,
  "reasoning": "Brief explanation of why this column is the best choice, considering both the current board and move history"
}`;
  }

  private createConnect4Input(playerColor: string, boardState: BoardState, boardHistory?: Array<{ board: string[][]; moveNumber: number; player: string; column: number }>): string {
    const recentMoves = boardHistory?.slice(-5) || [];
    const moveHistoryText = recentMoves.length > 0 
      ? `\nRecent Move History (last ${recentMoves.length} moves):\n${recentMoves.map(move => 
          `Move ${move.moveNumber}: ${move.player} placed piece in column ${move.column}`
        ).join("\n")}`
      : "\nThis is the first move of the game.";

    return `Current Board State:
${boardState.board.map((row: string[], rowIndex: number) => 
  `Row ${rowIndex + 1}: [${row.map(cell => cell === "blank" ? "B" : cell === "red" ? "R" : "Y").join(", ")}]`
).join("\n")}${moveHistoryText}

Based on the current board state and move history, what is the best column (1-7) to drop your ${playerColor} piece?`;
  }

  private async callOpenAI(prompt: string, playerModel: string, playerColor: string, boardState: BoardState, boardHistory?: Array<{ board: string[][]; moveNumber: number; player: string; column: number }>): Promise<string> {
    console.log(`🤖 Asking OpenAI for move decision using model: ${playerModel}`);
    
    const input = this.createConnect4Input(playerColor, boardState, boardHistory);
    
    const requestOptions: {
      model: string;
      instructions: string;
      input: string;
      reasoning?: { effort: "low" | "medium" | "high" };
    } = {
      model: playerModel,
      instructions: prompt,
      input: input,
    };

    if (playerModel.includes('gpt-5')) {
      requestOptions.reasoning = { effort: "high" };
    }

    const completion = await this.openai.responses.create(requestOptions);
    
    return completion.output_text || "";
  }

  private async callAnthropic(prompt: string, playerModel: string, playerColor: string, boardState: BoardState, boardHistory?: Array<{ board: string[][]; moveNumber: number; player: string; column: number }>): Promise<string> {
    console.log(`🤖 Asking Anthropic for move decision using model: ${playerModel}`);
    
    const input = this.createConnect4Input(playerColor, boardState, boardHistory);
    
    const completion = await this.anthropic.messages.create({
      model: playerModel,
      max_tokens: 1000,
      system: prompt,
      messages: [
        {
          role: "user",
          content: input
        }
      ],
    });

    return completion.content[0]?.type === 'text' ? completion.content[0].text : "";
  }

  private async callGemini(prompt: string, playerModel: string, playerColor: string, boardState: BoardState, boardHistory?: Array<{ board: string[][]; moveNumber: number; player: string; column: number }>): Promise<string> {
    console.log(`🤖 Asking Gemini for move decision using model: ${playerModel}`);
    
    const input = this.createConnect4Input(playerColor, boardState, boardHistory);
    const model = this.gemini.getGenerativeModel({ model: playerModel });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\n${input}` }] }],
    });
    
    const response = await result.response;
    return response.text();
  }

  private async callGroq(prompt: string, playerModel: string, playerColor: string, boardState: BoardState, boardHistory?: Array<{ board: string[][]; moveNumber: number; player: string; column: number }>): Promise<string> {
    console.log(`🤖 Asking Groq for move decision using model: ${playerModel}`);
    
    const input = this.createConnect4Input(playerColor, boardState, boardHistory);
    
    const completion = await this.groq.chat.completions.create({
      model: playerModel,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
    });

    return completion.choices[0].message.content || "";
  }

  private parseAIResponse(response: string) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }
      
      const rawDecision = JSON.parse(jsonMatch[0]);
      
      const moveDecision = moveDecisionSchema.parse(rawDecision);
      
      return moveDecision;
      
    } catch (parseError) {
      console.error(`❌ Error parsing AI move decision: ${parseError}`);
      throw new Error(`Failed to parse AI move decision: ${parseError}`);
    }
  }
}
