import React from 'react';
import { GameState } from '../../types/game';

interface GameUIProps {
  gameState: GameState;
  onToggleMute: () => void;
  isMuted: boolean;
}

export function GameUI({ gameState, onToggleMute, isMuted }: GameUIProps) {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  const getShiftProgress = (): number => {
    return ((gameState.maxTime - gameState.time) / gameState.maxTime) * 100;
  };
  
  if (gameState.phase === 'intro' || gameState.phase === 'ended') {
    return null; // UI handled by canvas
  }
  
  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
        {/* Left side - Game stats */}
        <div className="bg-black bg-opacity-80 border border-green-500 p-3 rounded font-mono text-green-500">
          <div className="text-sm space-y-1">
            <div>SCORE: {gameState.score}</div>
            <div>LEVEL: {gameState.level}</div>
            <div>TRANSACTIONS: {gameState.completedTransactions}</div>
            <div>MISTAKES: {gameState.mistakes}/{gameState.maxMistakes}</div>
          </div>
        </div>
        
        {/* Right side - Time and controls */}
        <div className="bg-black bg-opacity-80 border border-green-500 p-3 rounded font-mono text-green-500">
          <div className="text-sm space-y-2">
            <div>TIME: {formatTime(gameState.time)}</div>
            <div className="w-32 h-2 bg-gray-800 border border-green-500">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${getShiftProgress()}%` }}
              />
            </div>
            <button
              onClick={onToggleMute}
              className="text-xs border border-green-500 px-2 py-1 hover:bg-green-500 hover:text-black transition-colors"
            >
              {isMuted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Customer patience indicator */}
      {gameState.currentCustomer && gameState.phase === 'working' && (
        <div className="absolute top-1/3 left-4 bg-black bg-opacity-80 border border-green-500 p-2 rounded font-mono text-green-500">
          <div className="text-xs mb-1">CUSTOMER PATIENCE</div>
          <div className="w-24 h-3 bg-gray-800 border border-green-500">
            <div 
              className={`h-full transition-all duration-300 ${
                gameState.currentCustomer.patience > 50 ? 'bg-green-500' :
                gameState.currentCustomer.patience > 25 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, gameState.currentCustomer.patience)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Document details panel */}
      {gameState.selectedDocument && gameState.phase === 'working' && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-90 border border-green-500 p-4 rounded font-mono text-green-500 max-w-sm">
          <div className="text-sm space-y-2">
            <div className="font-bold">{gameState.selectedDocument.type.toUpperCase()} DETAILS</div>
            {Object.entries(gameState.selectedDocument.data).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                <span>{value}</span>
              </div>
            ))}
            {gameState.selectedDocument.hasError && (
              <div className="text-red-500 text-xs mt-2 border-t border-red-500 pt-2">
                ERROR: {gameState.selectedDocument.hasError}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Processing status */}
      {gameState.processingState === 'reviewing' && (
        <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 border border-yellow-500 p-4 rounded font-mono text-yellow-500">
          <div className="text-center">
            <div className="animate-pulse">REVIEWING DOCUMENTS...</div>
            <div className="mt-2 text-xs">Please wait...</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState.phase === 'working' && !gameState.selectedDocument && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 border border-green-500 p-3 rounded font-mono text-green-500 text-xs max-w-xs">
          <div className="space-y-1">
            <div>• Click documents to examine</div>
            <div>• Check for errors and discrepancies</div>
            <div>• Process valid transactions</div>
            <div>• Reject suspicious requests</div>
          </div>
        </div>
      )}
    </div>
  );
}
