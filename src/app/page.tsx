"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { LLM_MODELS, type ModelName } from "@/config/models";
import { PlayerView } from "@/components/PlayerView";
import { TitleModal } from "@/components/TitleModal";

import { Connect4Board } from "@/components/Connect4Board";

import { GameLog, type LogEntry } from "@/components/GameLog";
import { Button } from "@/components/ui/button";
import { Terminal, X } from "lucide-react";
import { cn } from "@/lib/utils";

type GameResult = {
  success: boolean;
  message: string;
  yellow?: {
    liveViewLink?: string;
  };
  red?: {
    liveViewLink?: string;
  };
};

type GameState = {
  status: 'idle' | 'starting' | 'playing' | 'completed' | 'error';
  progress: string;
  result: GameResult | null;
  error: string | null;
  board: string[][] | null;
};

export default function IndexPage() {
  const [showTitleModal, setShowTitleModal] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [playerA, setPlayerA] = useState<ModelName>(LLM_MODELS[0]);
  const [playerB, setPlayerB] = useState<ModelName>(LLM_MODELS[1] ?? LLM_MODELS[0]);
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    progress: '',
    result: null,
    error: null,
    board: null
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'> & { id?: string }) => {
    setLogs(prev => [...prev, {
      ...entry,
      id: entry.id || Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    }]);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const startConnect4Stream = () => {
    setGameState({
      status: 'starting',
      progress: 'Connecting...',
      result: null,
      error: null,
      board: Array(6).fill(null).map(() => Array(7).fill("blank"))
    });
    
    setLogs([]);
    addLog({ type: 'info', message: `Initializing match between ${playerA} and ${playerB}...` });
    
    setShowTitleModal(false);
    toast({ title: "Starting Connect 4 game"});

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let eventSource: EventSource | null = null;

    try {
      // Updated to use relative Next.js API route
      const url = `/api/connect4/stream?playerAModel=${encodeURIComponent(playerA)}&playerBModel=${encodeURIComponent(playerB)}&mode=simulator`;
      
      eventSource = new EventSource(url);
      
      if (abortController.signal.aborted) {
        eventSource.close();
        return;
      }

      const timeoutId = setTimeout(() => {
        console.log("⏰ SSE timeout after 200 seconds");
        abortController.abort();
      }, 200000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (eventSource) {
          eventSource.close();
        }
      };

      abortController.signal.addEventListener('abort', () => {
        cleanup();
        
        setGameState(prev => ({
          ...prev,
          status: prev.result?.success ? 'completed' : 'error',
          error: prev.result?.success ? null : 'Game session timed out'
        }));
      });
      
      eventSource.onopen = () => {
        setGameState(prev => ({
          ...prev,
          progress: 'Connected to stream'
        }));
        addLog({ type: 'success', message: 'Established connection to game stream.' });
      };

      eventSource.addEventListener('connected', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          progress: data.message
        }));
        addLog({ type: 'info', message: data.message });
      });

      eventSource.addEventListener('board_update', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          board: data.board,
          status: 'playing'
        }));
      });

      eventSource.addEventListener('board_log', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        addLog({ 
          type: 'info', 
          message: data.message,
          id: `board-${Date.now()}` // Unique ID for board logs to prevent duplicates
        });
      });

      eventSource.addEventListener('progress', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          progress: data.message
        }));

        const msg = data.message;
        const isMove = msg.includes('analyzing') || msg.includes('suggests') || msg.includes('made move');
        const player = msg.includes('Yellow') ? 'Yellow' : msg.includes('Red') ? 'Red' : undefined;
        
        addLog({ 
          type: isMove ? 'move' : 'progress', 
          message: msg,
          player
        });
      });

      eventSource.addEventListener('yellow_ready', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        
        setGameState(prev => ({
          ...prev,
          status: 'playing',
          progress: data.message,
          result: {
            success: true,
            message: data.message,
            yellow: {
              liveViewLink: data.liveViewLink,
            },
            red: prev.result?.red || {},
          }
        }));
        
        addLog({ type: 'success', message: 'Yellow player browser session ready.', player: 'Yellow' });
        toast({ title: "Yellow Ready!", description: "You can now see Yellow player's live view" });
      });

      eventSource.addEventListener('red_ready', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        
        setGameState(prev => ({
          ...prev,
          status: 'playing',
          progress: data.message,
          result: {
            success: true,
            message: data.message,
            yellow: prev.result?.yellow || {},
            red: {
              liveViewLink: data.liveViewLink,
            },
          }
        }));
        
        addLog({ type: 'success', message: 'Red player browser session ready.', player: 'Red' });
        toast({ title: "Red Ready!", description: "You can now see Red player's live view" });
      });

      eventSource.addEventListener('room_created', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          progress: data.message
        }));
        addLog({ type: 'info', message: `Game room created: ${data.roomName}` });
        toast({ title: "Room Created", description: `Game room: ${data.roomName}` });
      });

      eventSource.addEventListener('game_over', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          status: 'completed',
          progress: data.message,
          result: {
            success: true,
            message: data.message,
            ...prev.result
          }
        }));
        addLog({ type: 'success', message: data.message });
      });

      eventSource.addEventListener('fatal_error', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        console.error("📡 SSE Fatal Error:", data);
        
        setGameState(prev => ({
          ...prev,
          status: 'error',
          progress: 'Fatal error occurred',
          error: data.message
        }));
        
        addLog({ type: 'error', message: `FATAL ERROR: ${data.message}` });
        toast({ title: "Fatal Error", description: data.message, variant: "destructive" });
        abortController.abort();
      });

      eventSource.onerror = (error) => {
        console.error("📡 SSE connection error:", error);
        
        let message = 'Stream connection failed';
        if (eventSource?.readyState === EventSource.CLOSED) {
          message = 'Stream connection was closed';
        } else if (eventSource?.readyState === EventSource.CONNECTING) {
          message = 'Stream is connecting...';
        }

        setGameState(prev => ({
          ...prev,
          status: 'error',
          progress: 'Connection failed',
          error: message
        }));
        
        addLog({ type: 'error', message: `Connection error: ${message}` });
        toast({ title: "Connection Error", description: message, variant: "destructive" });
        abortController.abort();
      };

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("❌ Error starting Connect 4 SSE stream:", errorMessage);
      
      setGameState({
        status: 'error',
        progress: 'Failed to start',
        result: null,
        error: errorMessage,
        board: null
      });
      
      toast({ 
        title: "Error starting Connect 4 game", 
        description: errorMessage, 
        variant: "destructive" 
      });
      if (eventSource) {
        eventSource.close();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex">
      <PlayerView
        playerName="Yellow Player"
        playerModel={playerA}
        onModelChange={setPlayerA}
        isGameStarted={gameState.status !== 'idle'}
        hasResult={!!gameState.result}
        liveViewLink={gameState.result?.yellow?.liveViewLink}
        backgroundColor="#ffc83c"
        textColor="black"
        borderColor="black"
        placeholderText="Yellow player view will appear here"
        disabledModels={LLM_MODELS.filter(model => model !== playerB)}
      />

      {/* Central Board or VS */}
      {(gameState.status !== 'idle' || gameState.result) && !showTitleModal && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-8">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border-2 border-gray-300 mb-4">
            <div className="text-4xl font-black text-gray-800 text-center">
              VS
            </div>
          </div>
          
          {gameState.board && (
            <Connect4Board board={gameState.board} />
          )}
        </div>
      )}

      {showTitleModal && (
        <TitleModal 
          gameState={gameState}
          onStartGame={startConnect4Stream}
        />
      )}

      {/* Right Red Side */}
      <PlayerView
        playerName="Red Player"
        playerModel={playerB}
        onModelChange={setPlayerB}
        isGameStarted={gameState.status !== 'idle'}
        hasResult={!!gameState.result}
        liveViewLink={gameState.result?.red?.liveViewLink}
        backgroundColor="#f03603"
        textColor="white"
        borderColor="white"
        placeholderText="Red player view will appear here"
        disabledModels={LLM_MODELS.filter(model => model !== playerA)}
      />

      {/* Floating Log Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowLogs(!showLogs)}
          className={cn(
            "rounded-full w-14 h-14 shadow-2xl transition-all duration-300",
            showLogs ? "bg-red-500 hover:bg-red-600" : "bg-slate-900 hover:bg-slate-800 border border-slate-700"
          )}
        >
          {showLogs ? <X className="w-6 h-6" /> : <Terminal className="w-6 h-6 text-emerald-400" />}
        </Button>
      </div>

      {/* Bottom Log Panel */}
      {showLogs && (
        <div className="fixed bottom-0 left-0 right-0 h-72 z-40 animate-in slide-in-from-bottom duration-300">
          <GameLog logs={logs} />
        </div>
      )}
    </div>
  );
}
