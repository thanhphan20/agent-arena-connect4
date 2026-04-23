"use client";

import { type ModelName } from "@/config/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlayerViewProps {
  playerName: string;
  playerModel: ModelName;
  onModelChange: (model: ModelName) => void;
  isGameStarted: boolean;
  hasResult: boolean;
  liveViewLink?: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  placeholderText: string;
  disabledModels: ModelName[];
}

export const PlayerView = ({
  playerName,
  playerModel,
  onModelChange,
  isGameStarted,
  hasResult,
  liveViewLink,
  backgroundColor,
  textColor,
  borderColor,
  placeholderText,
  disabledModels
}: PlayerViewProps) => {
  return (
    <div className="w-1/2 relative flex flex-col" style={{ backgroundColor }}>
      <div className="flex-1 p-8 flex flex-col">
        {/* Player Header */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-3 mb-4">
            <h3 className={`text-2xl font-bold text-center`} style={{ color: textColor }}>
              {playerName}
            </h3>
          </div>
          
          {/* Model Selection or Display */}
          <div>
            {!isGameStarted && !hasResult ? (
              <Select value={playerModel} onValueChange={onModelChange}>
                <SelectTrigger 
                  className="bg-white text-black border-black"
                  style={{ borderColor }}
                >
                  <SelectValue placeholder={`Select ${playerName}`} />
                </SelectTrigger>
                <SelectContent>
                  {disabledModels.map((model) => (
                    <SelectItem key={model} value={model} disabled={false}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center">
                <div className={`text-4xl font-bold`} style={{ color: textColor }}>
                  {playerModel}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Player View Area */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full relative">
            {liveViewLink ? (
              <iframe
                src={liveViewLink}
                title={`${playerName} View`}
                className={`w-full border-4 rounded-lg`}
                style={{
                  border: 'none',
                  resize: 'none',
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  objectFit: 'contain'
                }}
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                allow="clipboard-read; clipboard-write; camera; microphone; geolocation"
              />
            ) : (
              <div 
                className={`w-full border-4 rounded-lg flex items-center justify-center font-bold text-lg`}
                style={{ 
                  backgroundColor,
                  aspectRatio: '16/9',
                  borderColor,
                  color: textColor
                }}
              >
                {placeholderText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
