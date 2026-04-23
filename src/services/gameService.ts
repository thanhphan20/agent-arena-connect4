import { z } from "zod";
import { BoardState, BoardHistory } from "../types/connect4";

// Connect 4 Game Configuration
const CONNECT4_CONFIG = {
  BOARD_ROWS: 6,
  BOARD_COLUMNS: 7,
  MAX_MOVES: 42,
  
  // Map column numbers to XPath selectors for Connect 4 board
  COLUMN_XPATHS: {
    1: '/html/body/div[3]/div[3]/div/div[15]',
    2: '/html/body/div[3]/div[3]/div/div[16]',
    3: '/html/body/div[3]/div[3]/div/div[17]',
    4: '/html/body/div[3]/div[3]/div/div[18]',
    5: '/html/body/div[3]/div[3]/div/div[19]',
    6: '/html/body/div[3]/div[3]/div/div[20]',
    7: '/html/body/div[3]/div[3]/div/div[21]'
  } as const,
  
  // Room name generation
  CAR_TYPES: ['Sedan', 'SUV', 'Sports', 'Electric', 'Hybrid', 'Luxury', 'Compact', 'Convertible', 'Truck', 'Coupe'],
  WEATHER_THEMES: ['Sunny', 'Rainy', 'Stormy', 'Foggy', 'Clear', 'Cloudy', 'Windy', 'Misty', 'Bright', 'Calm'],
  
  // Game delays
  MOVE_DELAY: 2000, // ms to wait after a move
  BETWEEN_MOVES_DELAY: 1500, // ms between moves
  PAGE_STABILIZATION_DELAY: 2000, // ms to wait for page to stabilize
  GAME_INITIALIZATION_DELAY: 2000, // ms to wait for game to initialize
  START_BUTTON_SEARCH_DELAY: 1000, // ms to wait when searching for start button
} as const;

export class GameService {
  private currentBoardState: BoardState;
  private boardHistory: BoardHistory[];

  constructor() {
    this.currentBoardState = {
      board: Array(CONNECT4_CONFIG.BOARD_ROWS).fill(null).map(() => Array(CONNECT4_CONFIG.BOARD_COLUMNS).fill("blank")),
    };
    this.boardHistory = [];
  }

  /**
   * Updates the board state after a player makes a move
   * @param column - The column where the piece was placed (1-7)
   * @param playerColor - The color of the player making the move
   */
  updateBoardState(column: number, playerColor: string): void {
    // Find the lowest empty position in the specified column
    for (let row = CONNECT4_CONFIG.BOARD_ROWS - 1; row >= 0; row--) {
      if (this.currentBoardState.board[row][column - 1] === "blank") {
        this.currentBoardState.board[row][column - 1] = playerColor.toLowerCase();
        break;
      }
    }
  }

  /**
   * Adds the current board state to the history
   * @param moveNumber - The current move number
   * @param playerName - The name of the player who made the move
   * @param column - The column where the piece was placed
   */
  addToHistory(moveNumber: number, playerName: string, column: number): void {
    this.boardHistory.push({
      board: JSON.parse(JSON.stringify(this.currentBoardState.board)),
      moveNumber,
      player: playerName,
      column
    });
  }

  /**
   * Helper method to get player color based on player name
   * @param playerName - The name of the player
   * @returns string - The color associated with the player
   */
  private getPlayerColor(playerName: string): string {
    return playerName.includes('Player A') || playerName.includes('Red') ? 'red' : 'yellow';
  }

  /**
   * Generates a string representation of the current board state
   * @param moveNumber - The current move number
   * @param playerName - The name of the current player
   * @param lastMoveColumn - The column of the last move (optional)
   * @returns string - Formatted board log
   */
  getBoardLog(moveNumber: number, playerName: string, lastMoveColumn?: number): string {
    let output = "";
    if (lastMoveColumn) {
      output += `\n📊 Board state after ${playerName}'s move in column ${lastMoveColumn}:\n`;
    } else {
      output += `\n📊 Current board state before ${playerName}'s move:\n`;
    }

    output += "\n🎯 === CONNECT 4 BOARD STATE ===\n";
    output += "  1 2 3 4 5 6 7  (Columns)\n";
    output += "  ---------------\n";
    
    this.currentBoardState.board.forEach((row: string[], rowIndex: number) => {
      const rowNumber = rowIndex + 1;
      const rowDisplay = row.map((cell: string) => {
        switch (cell) {
          case "blank": return "B";
          case "red": return "R";
          case "yellow": return "Y";
          default: return "?";
        }
      }).join(" ");
      
      output += `${rowNumber} |${rowDisplay}|\n`;
    });
    
    output += "  ---------------\n";
    output += "B = Blank, R = Red (Player A), Y = Yellow (Player B)\n";
    
    const totalPieces = this.currentBoardState.board.flat().filter((cell: string) => cell !== "blank").length;
    output += `📊 Board Summary: ${totalPieces} pieces placed, Move #${moveNumber}\n`;
    
    if (lastMoveColumn) {
      output += `🎯 Last move: ${playerName} placed piece in column ${lastMoveColumn}\n`;
    }
    
    output += "=== END BOARD STATE ===\n";
    return output;
  }

  /**
   * Logs the current board state to the console
   * @param moveNumber - The current move number
   * @param playerName - The name of the current player
   * @param lastMoveColumn - The column of the last move (optional)
   */
  logCurrentBoardState(moveNumber: number, playerName: string, lastMoveColumn?: number): void {
    console.log(this.getBoardLog(moveNumber, playerName, lastMoveColumn));
  }

  /**
   * Checks for a winner in the current board state
   * @returns string | null - The winning color ('red' or 'yellow') or null if no winner
   */
  checkWinner(): string | null {
    const board = this.currentBoardState.board;
    const rows = CONNECT4_CONFIG.BOARD_ROWS;
    const cols = CONNECT4_CONFIG.BOARD_COLUMNS;

    // Horizontal check
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 3; c++) {
        if (board[r][c] !== 'blank' && 
            board[r][c] === board[r][c+1] && 
            board[r][c] === board[r][c+2] && 
            board[r][c] === board[r][c+3]) {
          return board[r][c];
        }
      }
    }

    // Vertical check
    for (let r = 0; r < rows - 3; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== 'blank' && 
            board[r][c] === board[r+1][c] && 
            board[r][c] === board[r+2][c] && 
            board[r][c] === board[r+3][c]) {
          return board[r][c];
        }
      }
    }

    // Diagonal check (down-right)
    for (let r = 0; r < rows - 3; r++) {
      for (let c = 0; c < cols - 3; c++) {
        if (board[r][c] !== 'blank' && 
            board[r][c] === board[r+1][c+1] && 
            board[r][c] === board[r+2][c+2] && 
            board[r][c] === board[r+3][c+3]) {
          return board[r][c];
        }
      }
    }

    // Diagonal check (up-right)
    for (let r = 3; r < rows; r++) {
      for (let c = 0; c < cols - 3; c++) {
        if (board[r][c] !== 'blank' && 
            board[r][c] === board[r-1][c+1] && 
            board[r][c] === board[r-2][c+2] && 
            board[r][c] === board[r-3][c+3]) {
          return board[r][c];
        }
      }
    }

    return null;
  }

  /**
   * Checks if the board is full (draw)
   * @returns boolean - True if board is full, false otherwise
   */
  checkDraw(): boolean {
    return this.currentBoardState.board[0].every(cell => cell !== 'blank');
  }

  /**
   * Checks if the game is over
   * @param page - Optional Playwright page object (for browser mode)
   * @returns Promise<boolean> - True if game is over, false otherwise
   */
  async isGameOver(page?: { extract: (params: { instruction: string; schema: z.ZodSchema }) => Promise<unknown> }): Promise<boolean> {
    // 1. Check logical win/draw first
    if (this.checkWinner() || this.checkDraw()) {
      return true;
    }

    // 2. Check page if provided (browser mode)
    if (page) {
      try {
        const gameOverCheck = await page.extract({
          instruction: "Check if the game is over by looking for game over text, winner announcements, or rematch/new game buttons",
          schema: z.object({
            isGameOver: z.boolean(),
            gameOverReason: z.string().optional(),
          }),
        }) as { isGameOver: boolean; gameOverReason?: string };
        
        return gameOverCheck.isGameOver;
      } catch (error) {
        console.log(`❌ Error checking game over: ${error}`);
      }
    }

    return false;
  }

  /**
   * Executes a move by clicking on the specified column
   * @param page - The Playwright page object
   * @param column - The column to click (1-7)
   * @param playerName - The name of the player making the move
   * @returns Promise<boolean> - True if move was successful, false otherwise
   */
  async executeMove(page: { locator: (selector: string) => { waitFor: (params: { state: string; timeout: number }) => Promise<void>; click: () => Promise<void>; count: () => Promise<number>; first: () => { click: () => Promise<void> } } }, column: number, playerName: string): Promise<boolean> {
    try {
      console.log(`🎯 ${playerName} attempting to click column ${column}...`);
      
      if (!(column in CONNECT4_CONFIG.COLUMN_XPATHS)) {
        throw new Error(`Invalid column number: ${column}. Must be between 1 and 7.`);
      }
      
      const xpath = CONNECT4_CONFIG.COLUMN_XPATHS[column as keyof typeof CONNECT4_CONFIG.COLUMN_XPATHS];
      console.log(`🎯 Clicking XPath: ${xpath} for column ${column}`);
      
      try {
        const columnElement = page.locator(`xpath=${xpath}`);
        
        await columnElement.waitFor({ state: 'visible', timeout: 5000 });
        
        await columnElement.click();
        
        console.log(`✅ ${playerName} successfully clicked column ${column} using XPath: ${xpath}`);
        return true;
        
          } catch (clickError) {
      console.log(`❌ Failed to click column ${column} using XPath: ${xpath}`);
      console.log(`Click error: ${clickError}`);
      return false;
    }
      
    } catch (error) {
      console.log(`❌ Error executing move for ${playerName}: ${error}`);
      return false;
    }
  }

  /**
   * Generates a random room name for the game session
   * @returns string - A random room name
   */
  generateRandomRoomName(): string {
    const randomNum = Math.floor(Math.random() * 1000);
    const randomCarType = CONNECT4_CONFIG.CAR_TYPES[Math.floor(Math.random() * CONNECT4_CONFIG.CAR_TYPES.length)];
    const randomWeather = CONNECT4_CONFIG.WEATHER_THEMES[Math.floor(Math.random() * CONNECT4_CONFIG.WEATHER_THEMES.length)];
    return `${randomCarType}${randomWeather}${randomNum}`;
  }

  /**
   * Gets the current board state
   * @returns BoardState - The current board state
   */
  getBoardState(): BoardState {
    return this.currentBoardState;
  }

  /**
   * Gets the last N moves for AI context (most recent moves are most important)
   * @param count - Number of recent moves to return (default: 5)
   * @returns BoardHistory[] - Array of recent board history entries
   */
  getRecentMoves(count: number = 5): BoardHistory[] {
    return this.boardHistory.slice(-count);
  }

  /**
   * Gets the maximum number of moves possible
   * @returns number - Maximum moves
   */
  getMaxMoves(): number {
    return CONNECT4_CONFIG.MAX_MOVES;
  }

  /**
   * Gets the configured delays for various game operations
   * @returns Object containing delay values
   */
  getDelays() {
    return {
      moveDelay: CONNECT4_CONFIG.MOVE_DELAY,
      betweenMovesDelay: CONNECT4_CONFIG.BETWEEN_MOVES_DELAY,
      pageStabilizationDelay: CONNECT4_CONFIG.PAGE_STABILIZATION_DELAY,
      gameInitializationDelay: CONNECT4_CONFIG.GAME_INITIALIZATION_DELAY,
      startButtonSearchDelay: CONNECT4_CONFIG.START_BUTTON_SEARCH_DELAY,
    };
  }
}
