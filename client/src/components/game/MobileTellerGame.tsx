import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useSoundManager } from '../../hooks/useSoundManager';

export function MobileTellerGame() {
  const { gameState, startGame, restartGame, selectDocument, processTransaction, rejectTransaction } = useGameState();
  const { playSound, toggleMute, isMuted } = useSoundManager();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleStartGame = () => {
    console.log('Starting game...');
    playSound('typing');
    startGame();
  };

  const handleRestartGame = () => {
    console.log('Restarting game...');
    playSound('typing');
    restartGame();
  };

  const handleDocumentClick = (docId: string) => {
    console.log('Document clicked:', docId);
    setSelectedDocId(docId);
    playSound('typing');
    selectDocument(docId);
  };

  const handleProcessClick = () => {
    console.log('Processing transaction...');
    playSound('stamp');
    processTransaction();
  };

  const handleRejectClick = () => {
    console.log('Rejecting transaction...');
    playSound('drawer');
    rejectTransaction();
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

  if (gameState.phase === 'intro') {
    return (
      <div className="w-full h-full bg-black text-green-500 font-mono flex items-center justify-center">
        <div 
          className="text-center p-8 border-2 border-green-500 bg-green-900 bg-opacity-20 cursor-pointer hover:bg-opacity-30 transition-all"
          onClick={handleStartGame}
          onTouchEnd={handleStartGame}
        >
          <h1 className="text-4xl mb-4">TELLER'S WINDOW</h1>
          <p className="text-xl mb-6">1980s Bank Simulation</p>
          <div className="text-lg bg-green-500 text-black px-6 py-3 inline-block">
            TAP TO START SHIFT
          </div>
          <p className="text-sm mt-4 text-yellow-500">Process transactions, check documents, catch fraud!</p>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'ended') {
    return (
      <div className="w-full h-full bg-black text-green-500 font-mono flex items-center justify-center">
        <div 
          className="text-center p-8 border-2 border-green-500 bg-green-900 bg-opacity-20"
          onClick={handleRestartGame}
          onTouchEnd={handleRestartGame}
        >
          <h1 className="text-3xl mb-4">SHIFT ENDED</h1>
          <div className="space-y-2 mb-6">
            <p>FINAL SCORE: {gameState.score}</p>
            <p>TRANSACTIONS: {gameState.completedTransactions}</p>
            <p>MISTAKES: {gameState.mistakes}</p>
            <p>LEVEL REACHED: {gameState.level}</p>
          </div>
          <div className="text-lg bg-green-500 text-black px-6 py-3 inline-block cursor-pointer">
            TAP TO START NEW SHIFT
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'supervisor') {
    return (
      <div className="w-full h-full bg-black text-red-500 font-mono flex items-center justify-center">
        <div className="text-center p-8 border-2 border-red-500 bg-red-900 bg-opacity-20">
          <h1 className="text-2xl mb-4">SUPERVISOR</h1>
          <p className="text-lg">{gameState.supervisorMessage}</p>
        </div>
      </div>
    );
  }

  // Working phase
  return (
    <div className="w-full h-full bg-black text-green-500 font-mono overflow-auto">
      {/* Header HUD */}
      <div className="flex justify-between items-center p-4 border-b border-green-500">
        <div className="space-y-1 text-sm">
          <div>SCORE: {gameState.score}</div>
          <div>LEVEL: {gameState.level}</div>
          <div>TRANSACTIONS: {gameState.completedTransactions}</div>
        </div>
        <div className="space-y-1 text-sm text-right">
          <div>TIME: {Math.floor(gameState.time / 60)}:{String(Math.floor(gameState.time % 60)).padStart(2, '0')}</div>
          <div>MISTAKES: {gameState.mistakes}/{gameState.maxMistakes}</div>
          <button 
            onClick={() => toggleMute()}
            className="text-xs border border-green-500 px-2 py-1"
          >
            {isMuted() ? 'UNMUTE' : 'MUTE'}
          </button>
        </div>
      </div>

      {/* Customer Info */}
      {gameState.currentCustomer && (
        <div className="p-4 border-b border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg">CUSTOMER: {gameState.currentCustomer.name}</h2>
              <p className="text-sm">
                {gameState.currentCustomer.transaction.type.toUpperCase()}: 
                ${gameState.currentCustomer.transaction.amount}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs mb-1">PATIENCE</div>
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
          </div>
        </div>
      )}

      {/* Documents */}
      {gameState.currentCustomer && (
        <div className="p-4">
          <h3 className="text-lg mb-4">DOCUMENTS - TAP TO EXAMINE</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {gameState.currentCustomer.documents.map((doc) => (
              <div
                key={doc.id}
                className={`border-2 p-4 cursor-pointer transition-all ${
                  selectedDocId === doc.id
                    ? 'border-yellow-500 bg-yellow-900 bg-opacity-20'
                    : doc.isValid
                    ? 'border-green-500 hover:bg-green-900 hover:bg-opacity-20'
                    : 'border-red-500 hover:bg-red-900 hover:bg-opacity-20'
                }`}
                onClick={() => handleDocumentClick(doc.id)}
                onTouchEnd={() => handleDocumentClick(doc.id)}
              >
                <h4 className="text-sm font-bold mb-2">{doc.type.toUpperCase()}</h4>
                {Object.entries(doc.data).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="capitalize">{key}: </span>
                    <span>{value}</span>
                  </div>
                ))}
                {doc.hasError && (
                  <div className="text-red-500 text-xs mt-2 border-t border-red-500 pt-2">
                    ERROR: {doc.hasError}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {gameState.processingState === 'idle' ? (
              <>
                <button
                  onClick={handleProcessClick}
                  onTouchEnd={handleProcessClick}
                  className="flex-1 bg-green-500 text-black py-4 text-lg font-bold border-2 border-green-500 hover:bg-green-600 transition-colors"
                >
                  PROCESS
                </button>
                <button
                  onClick={handleRejectClick}
                  onTouchEnd={handleRejectClick}
                  className="flex-1 bg-red-500 text-black py-4 text-lg font-bold border-2 border-red-500 hover:bg-red-600 transition-colors"
                >
                  REJECT
                </button>
              </>
            ) : gameState.processingState === 'reviewing' ? (
              <div className="flex-1 bg-yellow-500 text-black py-4 text-lg font-bold text-center animate-pulse">
                PROCESSING...
              </div>
            ) : (
              <div className="flex-1 bg-green-500 text-black py-4 text-lg font-bold text-center">
                COMPLETE
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 text-xs text-green-400 space-y-1">
            <p>• Tap documents to examine them carefully</p>
            <p>• Check names, amounts, and account numbers match</p>
            <p>• Look for suspicious patterns or errors</p>
            <p>• Process valid transactions, reject fraudulent ones</p>
          </div>
        </div>
      )}
    </div>
  );
}