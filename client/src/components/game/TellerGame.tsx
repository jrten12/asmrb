import React, { useEffect } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameUI } from './GameUI';
import { useGameState } from '../../hooks/useGameState';
import { useSoundManager } from '../../hooks/useSoundManager';

export function TellerGame() {
  const { gameState, startGame, restartGame, selectDocument, processTransaction, rejectTransaction } = useGameState();
  const { playSound, toggleMute, isMuted } = useSoundManager();
  
  useEffect(() => {
    // Listen for game events
    const handleStartGame = () => {
      playSound('typing');
      startGame();
    };
    
    const handleRestartGame = () => {
      playSound('typing');
      restartGame();
    };
    
    window.addEventListener('startGame', handleStartGame);
    window.addEventListener('restartGame', handleRestartGame);
    
    return () => {
      window.removeEventListener('startGame', handleStartGame);
      window.removeEventListener('restartGame', handleRestartGame);
    };
  }, [startGame, restartGame, playSound]);
  
  // Play sounds based on game state changes
  useEffect(() => {
    if (!gameState) return;
    
    if (gameState.phase === 'supervisor') {
      playSound('warning');
    }
    
    if (gameState.processingState === 'complete') {
      playSound('receipt');
    }
  }, [gameState?.phase, gameState?.processingState, playSound]);
  
  const handleDocumentClick = (documentId: string) => {
    playSound('typing');
    selectDocument(documentId);
  };
  
  const handleProcessClick = () => {
    playSound('stamp');
    processTransaction();
  };
  
  const handleRejectClick = () => {
    playSound('drawer');
    rejectTransaction();
  };
  
  const handleToggleMute = () => {
    const muted = toggleMute();
    console.log('Sound', muted ? 'muted' : 'unmuted');
  };
  
  if (!gameState) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-green-900 text-green-500 font-mono">
        <div className="text-center">
          <div className="text-2xl mb-4">INITIALIZING TERMINAL...</div>
          <div className="animate-pulse">Please wait...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full relative bg-black">
      <GameCanvas
        gameState={gameState}
        onDocumentClick={handleDocumentClick}
        onProcessClick={handleProcessClick}
        onRejectClick={handleRejectClick}
      />
      <GameUI
        gameState={gameState}
        onToggleMute={handleToggleMute}
        isMuted={isMuted()}
      />
    </div>
  );
}
