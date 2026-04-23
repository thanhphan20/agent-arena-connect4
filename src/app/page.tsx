"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { LLM_MODELS, type ModelName } from "@/config/models";
import { PlayerView } from "@/components/PlayerView";
import { TitleModal } from "@/components/TitleModal";

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
};

export default function IndexPage() {
  const [showTitleModal, setShowTitleModal] = useState(true);
  const [playerA, setPlayerA] = useState<ModelName>(LLM_MODELS[0]);
  const [playerB, setPlayerB] = useState<ModelName>(LLM_MODELS[1] ?? LLM_MODELS[0]);
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    progress: '',
    result: null,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startConnect4Stream = () => {
    setGameState({
      status: 'starting',
      progress: 'Connecting...',
      result: null,
      error: null
    });
    
    setShowTitleModal(false);
    toast({ title: "Starting Connect 4 game"});

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let eventSource: EventSource | null = null;

    try {
      // Updated to use relative Next.js API route
      const url = `/api/connect4/stream?playerAModel=${encodeURIComponent(playerA)}&playerBModel=${encodeURIComponent(playerB)}`;
      
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
      };

      eventSource.addEventListener('connected', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          progress: data.message
        }));
      });

      eventSource.addEventListener('progress', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          progress: data.message
        }));
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
        
        toast({ title: "Red Ready!", description: "You can now see Red player's live view" });
      });

      eventSource.addEventListener('room_created', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setGameState(prev => ({
          ...prev,
          progress: data.message
        }));
        toast({ title: "Room Created", description: `Game room: ${data.roomName}` });
      });

      eventSource.addEventListener('fatal_error', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        console.error("📡 SSE Fatal Error:", data);
        
        setGameState({
          status: 'error',
          progress: 'Fatal error occurred',
          result: null,
          error: data.message
        });
        
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

        setGameState({
          status: 'error',
          progress: 'Connection failed',
          result: null,
          error: message
        });
        
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
        error: errorMessage
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

      {(gameState.status !== 'idle' || gameState.result) && !showTitleModal && (
        <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '130px' }}>
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border-2 border-gray-300">
            <div className="text-4xl font-black text-gray-800 text-center">
              VS
            </div>
          </div>
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
    </div>
  );
}
