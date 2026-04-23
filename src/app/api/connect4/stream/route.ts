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

      sendSSE('connected', { message: 'Connected to Connect 4 stream' });

      // Validate API Keys
      const missingKeys = [];
      if (!process.env.BROWSERBASE_API_KEY || process.env.BROWSERBASE_API_KEY.includes('YOUR_')) missingKeys.push('BROWSERBASE_API_KEY');
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('YOUR_')) missingKeys.push('OPENAI_API_KEY');
      
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
          
          console.log(`🔍 Player A browserbaseSessionID: ${stagehand.browserbaseSessionID}`);
          
          const playerALiveViewLink = await browserService.getLiveViewLink(stagehand.browserbaseSessionID);
          
          if (playerALiveViewLink) {
            console.log("✅ Player A live view link generated:", playerALiveViewLink);
            
            sendSSE('yellow_ready', {
              liveViewLink: playerALiveViewLink,
              message: 'Yellow player iframe is ready!'
            });
          } else {
            console.log("⚠️ Could not generate Player A live view link");
            sendError('Could not generate Player A live view link');
          }

          sendProgress('Player A navigating to Connect 4 site...', 'playerA_navigating');
          
          const roomName = gameService.generateRandomRoomName();
          console.log(`🏠 Generated random room name: ${roomName}`);
          
          sendSSE('room_created', { 
            roomName,
            message: `Game room created: ${roomName}`
          });
          
          try {
            await browserService.setupPlayer(playerA, roomName, "Player A");
            sendProgress('Player A setup completed', 'playerA_setup_complete');
          } catch (error) {
            console.log(`Warning: Error setting up the game for Player A: ${error}`);
            sendError(`Error setting up Player A: ${error}`);
          }

          console.log("🚀 Creating Player B session...");
          sendProgress('Creating Player B session...', 'playerB_session_creating');
          
          let playerB: any;
          let playerBLiveViewLink: string | undefined;
          
          try {
            playerBStagehand = new Stagehand(stagehandConfig);
            await playerBStagehand.init();
            playerB = playerBStagehand.page;
            
            playerBLiveViewLink = await browserService.getLiveViewLink(playerBStagehand.browserbaseSessionID);
            
            sendProgress('Red player session created', 'red_session_created');
            
            try {
              console.log(`🎯 Player B session created`);
              console.log(`🔍 Player B browserbaseSessionID: ${playerBStagehand.browserbaseSessionID}`);
              
              if (playerBLiveViewLink) {
                console.log(`🎯 Player B live view link generated: ${playerBLiveViewLink}`);
                
                sendSSE('red_ready', {
                  liveViewLink: playerBLiveViewLink,
                  message: 'Red player iframe is ready!'
                });
              } else {
                console.log("⚠️ Could not generate Player B live view link");
                sendError('Could not generate Player B live view link');
              }
              
              sendProgress('Red player navigating to Connect 4 site...', 'red_navigating');
              
              try {
                await browserService.setupPlayer(playerB, roomName, "Player B");
                sendProgress('Red player setup completed', 'red_setup_complete');
              } catch (error) {
                console.log(`Warning: Error setting up the game for Player B: ${error}`);
                sendError(`Error setting up Player B: ${error}`);
              }
              
              console.log("✅ Player B setup completed successfully");
              
            } finally {
              console.log("✅ Player B setup completed");
            }
            
          } catch (error) {
            console.log(`❌ Error setting up Player B: ${error}`);
            console.error("Player B setup failed:", error);
            sendError(`Error setting up Player B: ${error}`);
          }

          sendProgress('Both players ready - starting the match...', 'starting_match');
          
          try {
            console.log("🔍 Checking if Start Game button is available...");
            sendProgress('Looking for Start Game button...', 'looking_for_start_button');
            try {
              await playerA.act("Look for a 'Start Game' button or similar button to begin the Connect 4 match");
              await playerA.waitForTimeout(gameService.getDelays().startButtonSearchDelay);
              
              const startGameButton = await playerA.extract({
                instruction: "Find and identify any button that could start the Connect 4 game",
                schema: z.object({
                  buttonText: z.string().optional(),
                  buttonExists: z.boolean(),
                  buttonDescription: z.string().optional(),
                }),
              });
              
              if (startGameButton.buttonExists) {
                console.log(`✅ Start Game button found: ${startGameButton.buttonText || startGameButton.buttonDescription}`);
                
                await playerA.act("Click the 'Start Game' button to begin the Connect 4 match");
                console.log("✅ Player A clicked Start Game button");
                
                sendSSE('game_started', { 
                  message: 'Connect 4 match has begun!',
                  buttonFound: true
                });
                
                await playerA.waitForTimeout(gameService.getDelays().gameInitializationDelay);
                console.log("⏰ Waiting for game to initialize...");
                
              } else {
                console.log("ℹ️ No Start Game button found - game may already be started or auto-started");
                sendSSE('game_started', { 
                  message: 'Game appears to be auto-started',
                  buttonFound: false
                });
              }
              
            } catch (buttonError) {
              console.log(`Warning: Could not find Start Game button: ${buttonError}`);
              sendWarning(`Could not find Start Game button: ${buttonError}`);
            }
            
          } catch (error) {
            console.log(`Warning: Could not start the game: ${error}`);
            sendWarning(`Could not start game: ${error}`);
          }

          console.log("✅ Both players setup completed successfully");

          let moveCount = 0;
          const maxMoves = gameService.getMaxMoves();
          
          try {
            while (moveCount < maxMoves) {
              moveCount++;
              
              const isYellowTurn = moveCount % 2 === 1;
              const activePlayer = isYellowTurn ? playerA : playerB;
              const playerName = isYellowTurn ? "Yellow" : "Red";
              const playerColor = isYellowTurn ? "Yellow" : "Red";
              
              console.log(`\n🔄 Move ${moveCount}: ${playerName}'s turn`);
           
              const gameOver = await gameService.isGameOver(activePlayer);
              if (gameOver) {
                console.log("🏁 Game over detected!");
                sendSSE('game_over', { 
                  message: 'Game Over! Final result determined.',
                  totalMoves: moveCount - 1
                });
                
                await closeBothSessions();
                break;
              }
              
              console.log(`\n📊 Current board state before ${playerName}'s move:`);
              gameService.logCurrentBoardState(moveCount, playerName);
              
              const playerModel = isYellowTurn ? playerAModel : playerBModel;
              
              const aiMove = await aiService.getConnect4Move(playerName, playerColor, gameService.getBoardState(), playerModel, gameService.getRecentMoves());
              console.log(`🤖 AI suggests column: ${aiMove.column} (${aiMove.explanation})`);
              
              const moveSuccess = await gameService.executeMove(activePlayer, aiMove.column, playerName);
              
              if (moveSuccess) {
                console.log(`✅ ${playerName} successfully made move in column ${aiMove.column}`);
                await activePlayer.waitForTimeout(gameService.getDelays().moveDelay);
                gameService.updateBoardState(aiMove.column, playerColor);
                gameService.addToHistory(moveCount, playerName, aiMove.column);
                console.log(`\n📊 Board state after ${playerName}'s move in column ${aiMove.column}:`);
                gameService.logCurrentBoardState(moveCount, playerName, aiMove.column);
              } else {
                console.log(`❌ ${playerName} failed to execute move in column ${aiMove.column}`);
                sendSSE('move_failed', {
                  player: playerName,
                  column: aiMove.column,
                  message: `${playerName}'s move failed - column ${aiMove.column} might be full or inaccessible`
                });
              }
              
              await new Promise(resolve => setTimeout(resolve, gameService.getDelays().betweenMovesDelay));
            }
            
            console.log(`🎯 Game loop completed after ${moveCount} moves`);
            await closeBothSessions();
            
          } catch (error) {
            console.log(`❌ Fatal error during game: ${error}`);
            sendSSE('fatal_error', {
              error: String(error),
              message: 'Game stopped due to fatal error'
            });
            await closeBothSessions();
          }
        }, { autoClose: false });
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
