"use client";

import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Info, AlertTriangle, CheckCircle2, User, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export type LogEntry = {
  id: string;
  type: 'info' | 'progress' | 'move' | 'error' | 'success';
  message: string;
  timestamp: Date;
  player?: string;
  model?: string;
};

interface GameLogProps {
  logs: LogEntry[];
}

export const GameLog = ({ logs }: GameLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 font-mono text-sm border-t border-slate-800 shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/50">
        <Terminal className="w-4 h-4 text-emerald-400" />
        <span className="font-bold text-slate-200">Match Console</span>
        <div className="ml-auto flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>
      
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-col gap-1 border-l-2 border-slate-800 pl-3 py-1 hover:bg-slate-900/30 transition-colors">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>{log.timestamp.toLocaleTimeString()}</span>
                {log.player && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded uppercase font-bold",
                    log.player === 'Yellow' ? "bg-yellow-400/10 text-yellow-400" : "bg-red-500/10 text-red-500"
                  )}>
                    {log.player}
                  </span>
                )}
                {log.model && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {log.model}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2 items-start">
                {log.type === 'progress' && <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />}
                {log.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                {log.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
                {log.type === 'move' && <User className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
                
                <span className={cn(
                  "leading-relaxed break-words whitespace-pre-wrap",
                  log.type === 'error' && "text-red-400",
                  log.type === 'success' && "text-emerald-400 font-bold"
                )}>
                  {log.message}
                </span>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 italic">
              <Terminal className="w-8 h-8 mb-2 opacity-20" />
              Waiting for match to start...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
