export interface BoardState {
  board: string[][];
  moveHistory?: Move[]; 
}

export interface Move {
  column: number;
  explanation: string;
  playerName?: string;
  color?: string;
  moveNumber?: number;
}

export interface MoveDecision {
  column: number;
  confidence: number;
  reasoning: string;
}

export interface BoardHistory {
  board: string[][];
  moveNumber: number;
  player: string;
  column: number;
}

export interface PlayerSession {
  stagehand: unknown; 
  page: unknown;
  sessionUrl?: string;
  liveViewLink?: string;
  browserbaseSessionID?: string;
}
