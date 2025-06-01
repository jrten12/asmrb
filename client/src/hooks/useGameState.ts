import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types/game';
import { GameLogic } from '../lib/gameLogic';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);
  
  useEffect(() => {
    const gameLogic = new GameLogic((state) => {
      setGameState(state);
    });
    
    gameLogicRef.current = gameLogic;
    
    return () => {
      gameLogic.destroy();
    };
  }, []);
  
  const startGame = () => {
    gameLogicRef.current?.startGame();
  };
  
  const restartGame = () => {
    gameLogicRef.current?.restartGame();
  };
  
  const selectDocument = (documentId: string) => {
    gameLogicRef.current?.selectDocument(documentId);
  };
  
  const processTransaction = () => {
    gameLogicRef.current?.processTransaction();
  };
  
  const rejectTransaction = () => {
    gameLogicRef.current?.rejectTransaction();
  };
  
  return {
    gameState,
    startGame,
    restartGame,
    selectDocument,
    processTransaction,
    rejectTransaction
  };
}
