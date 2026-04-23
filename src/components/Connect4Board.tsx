"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Connect4BoardProps {
  board: string[][];
}

export const Connect4Board = ({ board }: Connect4BoardProps) => {
  return (
    <div className="bg-blue-600 p-4 rounded-xl shadow-2xl border-4 border-blue-700">
      <div className="grid grid-cols-7 gap-2 bg-blue-500 p-2 rounded-lg">
        {board.flat().map((cell, i) => {
          const row = Math.floor(i / 7);
          const col = i % 7;
          
          return (
            <div 
              key={`${row}-${col}`}
              className={cn(
                "w-12 h-12 md:w-16 md:h-16 rounded-full shadow-inner flex items-center justify-center transition-all duration-300",
                cell === "blank" && "bg-blue-800",
                cell === "red" && "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]",
                cell === "yellow" && "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]"
              )}
            >
              {cell !== "blank" && (
                <div className="w-4/5 h-4/5 rounded-full border-2 border-black/10 opacity-50" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Board Legs/Base */}
      <div className="flex justify-between -mt-1 px-4">
        <div className="w-4 h-8 bg-blue-700 rounded-b-lg" />
        <div className="w-4 h-8 bg-blue-700 rounded-b-lg" />
      </div>
    </div>
  );
};
