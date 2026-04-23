"use client";

import { Button } from "@/components/ui/button";

interface TitleModalProps {
  gameState: {
    status: 'idle' | 'starting' | 'playing' | 'completed' | 'error';
    progress: string;
    error: string | null;
  };
  onStartGame: () => void;
}

export const TitleModal = ({ gameState, onStartGame }: TitleModalProps) => {
  return (
    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center">
      <div className="bg-blue-600 p-8 rounded-xl shadow-2xl border-4 border-white">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-wider">
          Connect 4
        </h1>
        <div className="text-6xl md:text-8xl font-black text-white mb-6">
          LLM vs LLM
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={onStartGame} 
              disabled={gameState.status === 'starting'} 
              className="w-full bg-white text-blue-600 font-bold hover:bg-gray-100 border-2 border-white"
            >
              {gameState.status === 'starting' ? "Starting..." : "Start Game"}
            </Button>
          </div>

          {gameState.progress && (
            <div className="text-white font-semibold bg-black/50 px-4 py-2 rounded border border-white">
              {gameState.progress}
            </div>
          )}
          
          {gameState.error && (
            <div className="text-red-100 font-semibold bg-red-600/80 px-4 py-2 rounded border border-white">
              {gameState.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
