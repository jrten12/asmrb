import React, { useState, useEffect, useRef } from 'react';
import { GameLogic } from '../../lib/gameLogic';
import { GameState, Customer, Document } from '../../types/game';
import { getDocumentRenderer } from '../../lib/documents';
import AdMobBannerAd from '../../components/AdMobBannerAd';

console.log('BANK TELLER 1988 - CORRECT VERSION LOADING');

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'WESTRIDGE NATIONAL BANK - TELLER TERMINAL v2.1',
    'System initialized. Ready for customer service.',
    '',
    'Available Commands:',
    '  LOOKUP [account] - Look up customer records',
    '  VERIFY [field] [value] - Verify customer information',
    '  COMPARE SIGNATURE - Compare signatures',
    '  APPROVE - Approve transaction',
    '  REJECT - Reject transaction',
    '',
    'Type PUNCH IN to begin your shift...'
  ]);
  const [popupDocuments, setPopupDocuments] = useState<{doc: Document, x: number, y: number, id: string}[]>([]);
  const [showBankRecords, setShowBankRecords] = useState(false);
  
  const gameLogic = useRef<GameLogic | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    gameLogic.current = new GameLogic((state: GameState) => {
      setGameState(state);
    });
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const addTerminalOutput = (message: string) => {
    setTerminalOutput(prev => [...prev, message]);
  };

  const processCommand = (cmd: string) => {
    const upperCmd = cmd.toUpperCase().trim();
    addTerminalOutput('> ' + cmd);

    if (upperCmd === 'PUNCH IN') {
      gameLogic.current?.startGame();
      addTerminalOutput('Shift started. First customer approaching...');
      return;
    }

    if (upperCmd.startsWith('LOOKUP ')) {
      const accountNum = upperCmd.substring(7);
      addTerminalOutput('Accessing bank database...');
      
      setTimeout(() => {
        if (gameState?.currentCustomer && gameState.currentCustomer.bankRecords?.accountNumber === accountNum) {
          const records = gameState.currentCustomer.bankRecords;
          addTerminalOutput('ACCOUNT FOUND:');
          addTerminalOutput(`Name: ${records.name}`);
          addTerminalOutput(`DOB: ${records.dateOfBirth}`);
          addTerminalOutput(`Address: ${records.address}`);
          addTerminalOutput(`License: ${records.licenseNumber}`);
          addTerminalOutput(`ID: ${records.idNumber}`);
          addTerminalOutput(`Signature: ${records.signature}`);
          setShowBankRecords(true);
        } else {
          addTerminalOutput('ACCOUNT NOT FOUND');
        }
      }, 1000);
      return;
    }

    if (upperCmd.startsWith('VERIFY ')) {
      const parts = upperCmd.substring(7).split(' ');
      const field = parts[0];
      const value = parts.slice(1).join(' ');
      
      if (!gameState?.currentCustomer?.bankRecords) {
        addTerminalOutput('ERROR: No customer records loaded');
        return;
      }
      
      const records = gameState.currentCustomer.bankRecords;
      let match = false;
      
      switch (field) {
        case 'NAME':
          match = records.name.toUpperCase() === value;
          break;
        case 'DOB':
          match = records.dateOfBirth === value;
          break;
        case 'ADDRESS':
          match = records.address.toUpperCase().includes(value);
          break;
        case 'LICENSE':
          match = records.licenseNumber === value;
          break;
        case 'ID':
          match = records.idNumber === value;
          break;
      }
      
      addTerminalOutput(match ? `✓ ${field} VERIFIED` : `✗ ${field} MISMATCH`);
      return;
    }

    if (upperCmd === 'COMPARE SIGNATURE') {
      if (!gameState?.currentCustomer?.bankRecords) {
        addTerminalOutput('ERROR: No customer records loaded');
        return;
      }
      addTerminalOutput('Signature comparison available in document viewer.');
      addTerminalOutput('Bank signature: ' + gameState.currentCustomer.bankRecords.signature);
      return;
    }

    if (upperCmd === 'APPROVE') {
      if (!gameState?.currentCustomer) {
        addTerminalOutput('ERROR: No customer present');
        return;
      }

      if (gameState.currentCustomer.isFraudulent) {
        addTerminalOutput('========================================');
        addTerminalOutput('🚨 CRITICAL ERROR - FRAUD APPROVED 🚨');
        addTerminalOutput('You approved fraudulent documents!');
        addTerminalOutput('Transaction processed illegally');
        addTerminalOutput('Bank security compromised');
        addTerminalOutput('========================================');
        
        // Use game logic to handle fraud approval
        gameLogic.current?.processTransaction();
      } else {
        addTerminalOutput('========================================');
        addTerminalOutput('TRANSACTION APPROVED - CORRECT DECISION');
        addTerminalOutput('All documents verified as authentic');
        addTerminalOutput('Customer served successfully');
        addTerminalOutput('========================================');
        
        gameLogic.current?.processTransaction();
      }

      setTimeout(() => {
        setPopupDocuments([]);
        setShowBankRecords(false);
        addTerminalOutput('> Next customer approaching...');
        addTerminalOutput('Ready to process transaction');
      }, 2000);
      return;
    }

    if (upperCmd === 'REJECT') {
      if (!gameState?.currentCustomer) {
        addTerminalOutput('ERROR: No customer present');
        return;
      }

      if (!gameState.currentCustomer.isFraudulent) {
        addTerminalOutput('========================================');
        addTerminalOutput('ERROR - LEGITIMATE TRANSACTION REJECTED');
        addTerminalOutput('You rejected valid documents');
        addTerminalOutput('Customer complaint filed');
        addTerminalOutput('Management review required');
        addTerminalOutput('========================================');
      } else {
        addTerminalOutput('========================================');
        addTerminalOutput('TRANSACTION REJECTED - CORRECT DECISION');
        addTerminalOutput('Fraudulent documents detected');
        addTerminalOutput('Bank security maintained');
        addTerminalOutput('Well done!');
        addTerminalOutput('========================================');
      }

      gameLogic.current?.rejectTransaction();

      setTimeout(() => {
        setPopupDocuments([]);
        setShowBankRecords(false);
        addTerminalOutput('> Next customer approaching...');
        addTerminalOutput('Ready to process transaction');
      }, 2000);
      return;
    }

    addTerminalOutput('ERROR: Unknown command');
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      processCommand(terminalInput);
      setTerminalInput('');
    }
  };

  const openDocumentPopup = (document: Document) => {
    const popup = {
      doc: document,
      x: Math.random() * 200 + 100,
      y: Math.random() * 100 + 100,
      id: Math.random().toString(36).substr(2, 9)
    };
    setPopupDocuments(prev => [...prev, popup]);
  };

  const closeDocumentPopup = (id: string) => {
    setPopupDocuments(prev => prev.filter(p => p.id !== id));
  };

  const renderDocumentCard = (doc: Document) => {
    const getDocumentTitle = () => {
      switch (doc.type) {
        case 'id': return 'DRIVER LICENSE';
        case 'signature': return 'SIGNATURE CARD';
        case 'bank_book': return 'BANK BOOK';
        case 'slip': return 'TRANSACTION SLIP';
        default: return 'DOCUMENT';
      }
    };

    return (
      <div 
        key={doc.id} 
        className="bg-green-900 border-2 border-green-400 p-3 cursor-pointer hover:bg-green-800 transition-colors w-32 h-40 text-xs"
        onClick={() => openDocumentPopup(doc)}
      >
        <div className="text-green-400 font-bold mb-2 text-center">{getDocumentTitle()}</div>
        <div className="text-green-300 space-y-1">
          {Object.entries(doc.data).slice(0, 3).map(([key, value]) => (
            <div key={key}>
              <span className="text-green-500">{key}:</span> {String(value).substring(0, 12)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Intro screen
  if (!gameState || gameState.phase === 'intro') {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <h1 className="text-6xl font-bold mb-4 text-green-300">BANK TELLER 1988</h1>
          <p className="text-xl mb-8">1980s Fraud Detection Simulation</p>
          <p className="mb-4">You are a bank teller in 1988. Process customer transactions by examining documents carefully.</p>
          <p className="mb-8 text-red-400">WARNING: Too many mistakes will end your shift!</p>
          <button 
            className="bg-green-700 hover:bg-green-600 text-white px-8 py-4 text-xl font-bold border-2 border-green-400"
            onClick={() => gameLogic.current?.startGame()}
          >
            START SHIFT
          </button>
          <AdMobBannerAd />
        </div>
      </div>
    );
  }

  // Game over screen
  if (gameState.phase === 'ended' || gameState.phase === 'supervisor') {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <h1 className="text-4xl font-bold mb-4 text-red-400">SHIFT ENDED</h1>
          <p className="text-xl mb-8">{gameState.supervisorMessage || 'Your shift has ended'}</p>
          <div className="text-left mb-8 bg-green-900 p-4 border-2 border-green-400">
            <p>Final Score: {gameState.score}</p>
            <p>Transactions Completed: {gameState.completedTransactions}</p>
            <p>Mistakes: {gameState.mistakes}/{gameState.maxMistakes}</p>
            <p>Time Remaining: {Math.floor(gameState.time)} minutes</p>
          </div>
          <button 
            className="bg-green-700 hover:bg-green-600 text-white px-8 py-4 text-xl font-bold border-2 border-green-400"
            onClick={() => {
              gameLogic.current?.restartGame();
              setTerminalOutput([
                'WESTRIDGE NATIONAL BANK - TELLER TERMINAL v2.1',
                'System initialized. Ready for customer service.',
                '',
                'Available Commands:',
                '  LOOKUP [account] - Look up customer records',
                '  VERIFY [field] [value] - Verify customer information',
                '  COMPARE SIGNATURE - Compare signatures',
                '  APPROVE - Approve transaction',
                '  REJECT - Reject transaction',
                '',
                'Type PUNCH IN to begin your shift...'
              ]);
              setPopupDocuments([]);
              setShowBankRecords(false);
            }}
          >
            RESTART
          </button>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Header */}
      <div className="bg-green-900 border-b-2 border-green-400 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">WESTRIDGE NATIONAL BANK</h1>
          <div className="flex gap-6 text-sm">
            <span>SCORE: {gameState.score}</span>
            <span>COMPLETED: {gameState.completedTransactions}</span>
            <span>MISTAKES: {gameState.mistakes}/{gameState.maxMistakes}</span>
            <span>TIME: {Math.floor(gameState.time)}min</span>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left side - Terminal and Customer Info */}
        <div className="w-1/2 p-4">
          {/* Customer Info */}
          {gameState.currentCustomer && (
            <div className="bg-green-900 border-2 border-green-400 p-4 mb-4">
              <h3 className="text-lg font-bold mb-2">CURRENT CUSTOMER</h3>
              <p><span className="text-green-500">Name:</span> {gameState.currentCustomer.name}</p>
              <p><span className="text-green-500">Transaction:</span> {gameState.currentCustomer.transaction.type.toUpperCase()}</p>
              <p><span className="text-green-500">Amount:</span> ${gameState.currentCustomer.transaction.amount}</p>
              <p><span className="text-green-500">Account:</span> {gameState.currentCustomer.transaction.accountNumber}</p>
              
              {/* Patience indicator */}
              <div className="mt-2">
                <span className="text-green-500">Patience:</span>
                <div className="bg-black border border-green-400 w-full h-2 mt-1">
                  <div 
                    className="bg-green-400 h-full transition-all duration-1000"
                    style={{ width: `${Math.max(0, gameState.currentCustomer.patience)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Suspicion Level */}
              <div className="mt-2">
                <span className="text-green-500">Suspicion Level:</span>
                <span className={`ml-2 ${gameState.currentCustomer.suspiciousLevel > 50 ? 'text-red-400' : 'text-green-400'}`}>
                  {gameState.currentCustomer.suspiciousLevel}%
                </span>
              </div>
            </div>
          )}

          {/* Terminal */}
          <div className="bg-black border-2 border-green-400 flex-1">
            <div className="bg-green-900 p-2 border-b border-green-400">
              <span className="font-bold">TELLER TERMINAL</span>
            </div>
            
            <div 
              ref={terminalRef}
              className="h-64 p-4 overflow-y-auto text-sm"
            >
              {terminalOutput.map((line, index) => (
                <div key={index} className="mb-1">{line}</div>
              ))}
            </div>
            
            <form onSubmit={handleTerminalSubmit} className="p-4 border-t border-green-400">
              <div className="flex">
                <span className="text-green-500 mr-2">{'>'}</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="bg-transparent border-none outline-none flex-1 text-green-400"
                  placeholder="Enter command..."
                />
              </div>
            </form>

            {/* Command shortcuts */}
            <div className="p-2 border-t border-green-400 flex gap-2 flex-wrap">
              <button
                onClick={() => processCommand('LOOKUP ' + (gameState.currentCustomer?.transaction.accountNumber || ''))}
                className="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded"
              >
                LOOKUP
              </button>
              <button
                onClick={() => processCommand('COMPARE SIGNATURE')}
                className="bg-purple-700 hover:bg-purple-600 px-3 py-1 text-xs rounded"
              >
                COMPARE SIG
              </button>
              <button
                onClick={() => processCommand('APPROVE')}
                className="bg-green-700 hover:bg-green-600 px-3 py-1 text-xs rounded"
              >
                APPROVE
              </button>
              <button
                onClick={() => processCommand('REJECT')}
                className="bg-red-700 hover:bg-red-600 px-3 py-1 text-xs rounded"
              >
                REJECT
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Documents */}
        <div className="w-1/2 p-4">
          <div className="bg-green-900 border-2 border-green-400 h-full">
            <div className="bg-green-800 p-2 border-b border-green-400">
              <span className="font-bold">CUSTOMER DOCUMENTS</span>
            </div>
            
            <div className="p-4 h-96 overflow-y-auto">
              {gameState.currentCustomer ? (
                <div className="grid grid-cols-2 gap-4">
                  {gameState.currentCustomer.documents.map((doc) => renderDocumentCard(doc))}
                </div>
              ) : (
                <div className="text-center text-green-600 mt-8">
                  No customer present
                </div>
              )}
            </div>

            {/* Bank Records Display */}
            {showBankRecords && gameState.currentCustomer?.bankRecords && (
              <div className="p-4 border-t border-green-400 bg-green-800">
                <h4 className="font-bold mb-2">BANK RECORDS</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-green-500">Name:</span> {gameState.currentCustomer.bankRecords.name}</p>
                  <p><span className="text-green-500">DOB:</span> {gameState.currentCustomer.bankRecords.dateOfBirth}</p>
                  <p><span className="text-green-500">Address:</span> {gameState.currentCustomer.bankRecords.address}</p>
                  <p><span className="text-green-500">License:</span> {gameState.currentCustomer.bankRecords.licenseNumber}</p>
                  <p><span className="text-green-500">ID:</span> {gameState.currentCustomer.bankRecords.idNumber}</p>
                  <p><span className="text-green-500">Account:</span> {gameState.currentCustomer.bankRecords.accountNumber}</p>
                  <p><span className="text-green-500">Signature:</span> {gameState.currentCustomer.bankRecords.signature}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup Documents */}
      {popupDocuments.map((popup) => (
        <div
          key={popup.id}
          className="fixed bg-green-900 border-2 border-green-400 w-96 h-96 p-4 z-50"
          style={{
            left: popup.x,
            top: popup.y
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">{popup.doc.type.toUpperCase()} DOCUMENT</h3>
            <button
              onClick={() => closeDocumentPopup(popup.id)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            {Object.entries(popup.doc.data).map(([key, value]) => (
              <div key={key}>
                <span className="text-green-500 font-bold">{key.toUpperCase()}:</span> {String(value)}
              </div>
            ))}
          </div>

          {/* Show bank records for comparison */}
          {gameState.currentCustomer?.bankRecords && (
            <div className="mt-4 pt-4 border-t border-green-400">
              <h4 className="font-bold mb-2 text-yellow-400">BANK RECORDS (FOR COMPARISON)</h4>
              <div className="text-xs space-y-1">
                <p><span className="text-green-500">Name:</span> {gameState.currentCustomer.bankRecords.name}</p>
                <p><span className="text-green-500">DOB:</span> {gameState.currentCustomer.bankRecords.dateOfBirth}</p>
                <p><span className="text-green-500">Address:</span> {gameState.currentCustomer.bankRecords.address}</p>
                <p><span className="text-green-500">License:</span> {gameState.currentCustomer.bankRecords.licenseNumber}</p>
                <p><span className="text-green-500">ID:</span> {gameState.currentCustomer.bankRecords.idNumber}</p>
                <p><span className="text-green-500">Account:</span> {gameState.currentCustomer.bankRecords.accountNumber}</p>
                <p><span className="text-green-500">Signature:</span> {gameState.currentCustomer.bankRecords.signature}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      <AdMobBannerAd />
    </div>
  );
}