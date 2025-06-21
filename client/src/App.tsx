import React, { useState, useEffect } from 'react';
import AdMobBannerAd from '../../components/AdMobBannerAd';

console.log('TELLER\'S WINDOW - ORIGINAL VERSION RESTORED');

interface Document {
  type: string;
  name?: string;
  id?: string;
  account?: string;
  amount?: number;
  type_doc?: string;
  valid: boolean;
  error?: string;
}

interface Customer {
  name: string;
  transaction: {
    type: string;
    amount: number;
  };
  documents: Document[];
}

interface GameState {
  phase: 'intro' | 'playing';
  score: number;
  level: number;
  mistakes: number;
  time: number;
  currentCustomer: Customer | null;
  selectedDocument: number | null;
}

const customers: Customer[] = [
  {
    name: 'John Smith',
    transaction: { type: 'DEPOSIT', amount: 500 },
    documents: [
      { type: 'ID CARD', name: 'John Smith', id: '12345', valid: true },
      { type: 'BANK BOOK', name: 'John Smith', account: '987654321', valid: true },
      { type: 'SLIP', type_doc: 'DEPOSIT', amount: 500, valid: true },
      { type: 'SIGNATURE', name: 'John Smith', valid: true }
    ]
  },
  {
    name: 'Mary Johnson',
    transaction: { type: 'WITHDRAWAL', amount: 200 },
    documents: [
      { type: 'ID CARD', name: 'Mary Johnson', id: '54321', valid: true },
      { type: 'BANK BOOK', name: 'Mary Johnson', account: '123456789', valid: true },
      { type: 'SLIP', type_doc: 'WITHDRAWAL', amount: 250, valid: false, error: 'Amount mismatch' },
      { type: 'SIGNATURE', name: 'Mary Johnson', valid: false, error: 'Signature invalid' }
    ]
  },
  {
    name: 'Robert Wilson',
    transaction: { type: 'WIRE TRANSFER', amount: 1000 },
    documents: [
      { type: 'ID CARD', name: 'Robert Wilson', id: '98765', valid: true },
      { type: 'BANK BOOK', name: 'Robert Wilson', account: '555666777', valid: true },
      { type: 'SLIP', type_doc: 'WIRE TRANSFER', amount: 1000, valid: true },
      { type: 'SIGNATURE', name: 'Robert Wilson', valid: true }
    ]
  },
  {
    name: 'Lisa Brown',
    transaction: { type: 'DEPOSIT', amount: 750 },
    documents: [
      { type: 'ID CARD', name: 'Lisa Brown', id: '11111', valid: false, error: 'Expired ID' },
      { type: 'BANK BOOK', name: 'Lisa Brown', account: '888999000', valid: true },
      { type: 'SLIP', type_doc: 'DEPOSIT', amount: 750, valid: true },
      { type: 'SIGNATURE', name: 'Lisa Brown', valid: false, error: 'Signature mismatch' }
    ]
  },
  {
    name: 'Michael Davis',
    transaction: { type: 'WITHDRAWAL', amount: 300 },
    documents: [
      { type: 'ID CARD', name: 'Michael Davis', id: '22222', valid: true },
      { type: 'BANK BOOK', name: 'Michael Davis', account: '111222333', valid: false, error: 'Account frozen' },
      { type: 'SLIP', type_doc: 'WITHDRAWAL', amount: 350, valid: false, error: 'Amount exceeds limit' },
      { type: 'SIGNATURE', name: 'Michael Davis', valid: true }
    ]
  }
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'intro',
    score: 0,
    level: 1,
    mistakes: 0,
    time: 480, // 8 hours in minutes
    currentCustomer: null,
    selectedDocument: null
  });

  const startGame = () => {
    console.log('Starting game...');
    setGameState(prev => ({
      ...prev,
      phase: 'playing'
    }));
    loadCustomer();
  };

  const loadCustomer = () => {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    setGameState(prev => ({
      ...prev,
      currentCustomer: customer,
      selectedDocument: null
    }));
  };

  const selectDocument = (index: number) => {
    console.log('Document selected:', index);
    setGameState(prev => ({
      ...prev,
      selectedDocument: index
    }));
  };

  const processTransaction = () => {
    console.log('Processing transaction...');
    if (!gameState.currentCustomer) return;

    const customer = gameState.currentCustomer;
    const hasErrors = customer.documents.some(doc => !doc.valid);

    if (hasErrors) {
      setGameState(prev => ({
        ...prev,
        mistakes: prev.mistakes + 1,
        score: prev.score - 50
      }));
      alert('MISTAKE! Transaction had errors but was processed!');
    } else {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 100
      }));
      alert('SUCCESS! Transaction processed correctly!');
    }

    setTimeout(loadCustomer, 1500);
  };

  const rejectTransaction = () => {
    console.log('Rejecting transaction...');
    if (!gameState.currentCustomer) return;

    const customer = gameState.currentCustomer;
    const hasErrors = customer.documents.some(doc => !doc.valid);

    if (hasErrors) {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 150
      }));
      alert('GOOD CATCH! Fraudulent transaction rejected!');
    } else {
      setGameState(prev => ({
        ...prev,
        mistakes: prev.mistakes + 1,
        score: prev.score - 25
      }));
      alert('MISTAKE! Valid transaction was rejected!');
    }

    setTimeout(loadCustomer, 1500);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Intro screen
  if (gameState.phase === 'intro') {
    return (
      <div className="min-h-screen bg-green-950 text-green-400 font-mono flex items-center justify-center p-5">
        <div className="text-center border-2 border-green-400 bg-green-400/10 p-10 rounded-lg max-w-2xl w-full">
          <h1 className="text-5xl mb-5 shadow-green-400" style={{ textShadow: '0 0 10px #00ff00' }}>
            TELLER'S WINDOW
          </h1>
          <p className="text-2xl mb-8 text-green-300">1980s Bank Simulation</p>
          <button 
            onClick={startGame}
            className="text-xl bg-green-400 text-black border-none py-5 px-10 cursor-pointer font-mono rounded transition-all duration-300 hover:bg-green-300 hover:scale-105 min-h-15 min-w-50"
          >
            TAP TO START SHIFT
          </button>
          <div className="mt-8 text-sm text-yellow-400 leading-relaxed">
            <p>You are a bank teller in 1980.</p>
            <p>Process customer transactions by examining documents.</p>
            <p>Check for errors and catch fraudulent requests!</p>
          </div>
          <AdMobBannerAd />
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen bg-green-950 text-green-400 font-mono flex flex-col">
      {/* HUD */}
      <div className="bg-black/80 border-b-2 border-green-400 p-4 flex justify-between items-center flex-wrap">
        <div>
          <div>SCORE: {gameState.score}</div>
          <div>LEVEL: {gameState.level}</div>
        </div>
        <div>
          <div>TIME: {formatTime(gameState.time)}</div>
          <div>MISTAKES: {gameState.mistakes}/5</div>
        </div>
      </div>

      {/* Customer Area */}
      {gameState.currentCustomer && (
        <div className="p-5 border-b-2 border-green-400 bg-green-900/30">
          <h3>CUSTOMER: {gameState.currentCustomer.name}</h3>
          <p>
            REQUEST: {gameState.currentCustomer.transaction.type} ${gameState.currentCustomer.transaction.amount}
          </p>
        </div>
      )}

      {/* Documents Area */}
      <div className="flex-1 p-5 overflow-y-auto">
        <h3 className="mb-4">EXAMINE DOCUMENTS</h3>
        
        {gameState.currentCustomer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {gameState.currentCustomer.documents.map((doc, index) => (
              <div
                key={index}
                onClick={() => selectDocument(index)}
                className={`border-2 p-4 cursor-pointer transition-all duration-300 min-h-30 ${
                  !doc.valid 
                    ? 'border-red-500 bg-red-500/10' 
                    : 'border-green-400 bg-green-400/10'
                } ${
                  gameState.selectedDocument === index 
                    ? 'bg-yellow-400/20 border-yellow-400' 
                    : ''
                } hover:bg-yellow-400/20 hover:border-yellow-400 active:scale-95`}
              >
                <h4 className="text-lg font-bold mb-2">{doc.type}</h4>
                <p>Name: {doc.name || doc.type_doc || 'N/A'}</p>
                <p>Details: {doc.id || doc.account || doc.amount || 'Various'}</p>
                {doc.error && (
                  <p className="text-red-400 mt-2">ERROR: {doc.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={processTransaction}
            className="flex-1 py-5 text-xl font-mono border-2 border-green-400 bg-green-400 text-black cursor-pointer transition-all duration-300 hover:bg-green-300 active:scale-95"
          >
            PROCESS
          </button>
          <button
            onClick={rejectTransaction}
            className="flex-1 py-5 text-xl font-mono border-2 border-red-500 bg-red-500 text-white cursor-pointer transition-all duration-300 hover:bg-red-400 active:scale-95"
          >
            REJECT
          </button>
        </div>
      </div>

      <AdMobBannerAd />
    </div>
  );
}