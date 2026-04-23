import { NextRequest, NextResponse } from "next/server";
import { Stagehand } from "@browserbasehq/stagehand";
import { withStagehand } from "@/backend_utils/withStagehand";
import stagehandConfig from "@/stagehand.config";
import { z } from "zod";
import { AIService } from "@/services/aiService";
import { GameService } from "@/services/gameService";
import { BrowserService } from "@/services/browserService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerAModel = searchParams.get("playerAModel") || "gpt-4o-mini";
  const playerBModel = searchParams.get("playerBModel") || "gpt-4o-mini";
  const mode = searchParams.get("mode") || "browser";

  const aiService = new AIService();
  const gameService = new GameService();
  const browserService = new BrowserService();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendSSE = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          console.error("SSE send error", e);
        }
      };

      const sendProgress = (message: string, step?: string) => 
        sendSSE('progress', { message, step });

      const sendError = (message: string, error?: unknown) => 
        sendSSE('error', { message, error });

      const sendWarning = (message: string) => 
        sendSSE('warning', { message });

      const sendBoardUpdate = (board: string[][]) =>
        sendSSE('board_update', { board });

      sendSSE('connected', { message: `Connected to Connect 4 ${mode} stream` });

      // Validate API Keys
      const missingKeys = [];
      if (!process.env.BROWSERBASE_API_KEY || process.env.BROWSERBASE_API_KEY.includes('YOUR_')) {
        // Only require Browserbase if not in simulator mode
        if (mode !== 'simulator') missingKeys.push('BROWSERBASE_API_KEY');
      }
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('YOUR_')) missingKeys.push('OPENAI_API_KEY');
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('YOUR_')) missingKeys.push('GEMINI_API_KEY');
      // GROQ is optional but we can add it to placeholders in .env
      
      if (missingKeys.length > 0) {
        console.error(`❌ Missing or placeholder API keys: ${missingKeys.join(', ')}`);
        sendSSE('fatal_error', { 
          message: `Configuration Error: Please set valid API keys in your .env file for: ${missingKeys.join(', ')}`,
          missingKeys 
        });
        controller.close();
        return;
      }

      try {
      const runGameLoop = async (
        playerAPage?: any, 
        playerBPage?: any, 
        closeCallback?: () => Promise<void>
      ) => {
        let moveCount = 0;
        const maxMoves = gameService.getMaxMoves();
        
        try {
          while (moveCount < maxMoves) {
            moveCount++;
            
            const isYellowTurn = moveCount % 2 === 1;
            const playerName = isYellowTurn ? "Yellow" : "Red";
            const playerColor = isYellowTurn ? "Yellow" : "Red";
            const activePage = isYellowTurn ? playerAPage : playerBPage;
            
            console.log(`\n🔄 Move ${moveCount}: ${playerName}'s turn`);
            
            const boardLog = gameService.getBoardLog(moveCount, playerName);
            console.log(boardLog);
            sendSSE('board_log', { message: boardLog });
            
            const playerModel = isYellowTurn ? playerAModel : playerBModel;
            
            const aiMove = await aiService.getConnect4Move(
              playerName, 
              playerColor, 
              gameService.getBoardState(), 
              playerModel, 
              gameService.getRecentMoves()
            );
            
            console.log(`🤖 AI suggests column: ${aiMove.column} (${aiMove.explanation})`);
            
            let moveSuccess = true;
            if (activePage) {
              moveSuccess = await gameService.executeMove(activePage, aiMove.column, playerName);
            }
            
            if (moveSuccess) {
              console.log(`✅ ${playerName} successfully made move in column ${aiMove.column}`);
              // Compact move log
              sendSSE('progress', { 
                message: `🤖 AI ${playerName} chose column ${aiMove.column})` 
              });

              gameService.updateBoardState(aiMove.column, playerColor);
              gameService.addToHistory(moveCount, playerName, aiMove.column);
              
              // Send board update to frontend
              sendBoardUpdate(gameService.getBoardState().board);
              
              const postMoveLog = gameService.getBoardLog(moveCount, playerName, aiMove.column);
              console.log(postMoveLog);
              sendSSE('board_log', { message: postMoveLog });
              
              // Check for winner immediately after move
              const gameOver = await gameService.isGameOver(activePage);
              if (gameOver) {
                const winner = gameService.checkWinner();
                const isDraw = gameService.checkDraw();
                const resultMessage = isDraw 
                  ? "Game Over! It's a draw." 
                  : `Game Over! ${winner?.toUpperCase()} wins!`;
                
                console.log(`🏁 ${resultMessage}`);
                sendSSE('game_over', { 
                  message: resultMessage,
                  winner,
                  isDraw,
                  totalMoves: moveCount
                });
                if (closeCallback) await closeCallback();
                break;
              }

              if (activePage) {
                await activePage.waitForTimeout(gameService.getDelays().moveDelay);
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Artificial delay for simulator
              }
            } else {
              console.log(`❌ ${playerName} failed to execute move in column ${aiMove.column}`);
              sendSSE('move_failed', {
                player: playerName,
                column: aiMove.column,
                message: `${playerName}'s move failed`
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, gameService.getDelays().betweenMovesDelay));
          }
          
          console.log(`🎯 Game loop completed after ${moveCount} moves`);
          if (closeCallback) await closeCallback();
          
        } catch (error) {
          console.log(`❌ Fatal error during game: ${error}`);
          sendSSE('fatal_error', {
            error: String(error),
            message: 'Game stopped due to fatal error'
          });
          if (closeCallback) await closeCallback();
        }
      };

      if (mode === 'simulator') {
        sendProgress('Starting pure simulation...', 'simulator_start');
        // Send initial empty board so UI renders immediately
        sendBoardUpdate(gameService.getBoardState().board);
        await runGameLoop();
      } else {
        try {
          await withStagehand(async (playerA, stagehand) => {
            let playerBStagehand: Stagehand | undefined;

            const closeBothSessions = async () => {
              console.log("🔒 Closing both player sessions...");
              await browserService.closeSession(stagehand as Stagehand, "Yellow player");
              if (playerBStagehand) {
                await browserService.closeSession(playerBStagehand as Stagehand, "Red player");
              }
            };

            sendProgress('Yellow player session created', 'yellow_session_created');
            const playerALiveViewLink = await browserService.getLiveViewLink(stagehand.browserbaseSessionID);
            
            if (playerALiveViewLink) {
              sendSSE('yellow_ready', {
                liveViewLink: playerALiveViewLink,
                message: 'Yellow player iframe is ready!'
              });
            }

            const roomName = gameService.generateRandomRoomName();
            sendSSE('room_created', { roomName, message: `Game room created: ${roomName}` });
            
            await browserService.setupPlayer(playerA, roomName, "Player A");
            sendProgress('Player A setup completed', 'playerA_setup_complete');

            playerBStagehand = new Stagehand(stagehandConfig);
            await playerBStagehand.init();
            const playerB = playerBStagehand.page;
            const playerBLiveViewLink = await browserService.getLiveViewLink(playerBStagehand.browserbaseSessionID);
            
            if (playerBLiveViewLink) {
              sendSSE('red_ready', {
                liveViewLink: playerBLiveViewLink,
                message: 'Red player iframe is ready!'
              });
            }

            //@ts-ignore
            await browserService.setupPlayer(playerB, roomName, "Player B");
            sendProgress('Red player setup completed', 'red_setup_complete');

            // Send initial board
            sendBoardUpdate(gameService.getBoardState().board);

            await runGameLoop(playerA, playerB, closeBothSessions);
          }, { autoClose: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          sendError(`Setup failed: ${message}`);
        }
      }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`❌ Error occurred: ${message}`);
        sendSSE('error', {
          success: false,
          error: message,
          message: "Setup failed - check logs for details"
        });
      } finally {
        try {
          controller.close();
        } catch (e) {
          // Stream might already be closed
        }
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
