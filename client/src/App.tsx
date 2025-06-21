import React, { useState, useEffect, useRef, useCallback } from 'react';

console.log('BANK TELLER 1988 - CLEAN VERSION LOADING');

interface BankCustomer {
  id: string;
  name: string;
  transaction: BankTransaction;
  documents: BankDocument[];
  bankRecords: BankRecord;
  isFraudulent: boolean;
  patience: number;
  maxPatience: number;
}

interface BankTransaction {
  type: 'deposit' | 'withdrawal' | 'wire_transfer' | 'money_order' | 'cashiers_check';
  amount: number;
  accountNumber: string;
  targetAccount?: string;
  recipientName?: string;
}

interface BankDocument {
  id: string;
  type: 'id' | 'signature' | 'bank_book' | 'slip';
  data: Record<string, any>;
}

interface BankRecord {
  name: string;
  dateOfBirth: string;
  address: string;
  licenseNumber: string;
  accountNumber: string;
  signature: string;
}

interface GameState {
  phase: 'intro' | 'working' | 'ended';
  currentCustomer: BankCustomer | null;
  score: number;
  completedTransactions: number;
  fraudulentApprovals: number;
  correctRejections: number;
  errors: number;
  timeOnShift: number;
  level: number;
}

interface PopupDocument {
  document: BankDocument;
  position: { x: number; y: number };
  id: string;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private musicGain: GainNode | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new AudioContext();
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.audioContext.destination);
      this.musicGain.gain.value = 0.3;
    } catch (e) {
      console.log('Music auto-play prevented:', e);
    }
  }

  playSound(type: 'typing' | 'paper' | 'stamp' | 'error' | 'cash' | 'keypad') {
    if (!this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      const now = this.audioContext.currentTime;
      
      switch (type) {
        case 'typing':
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.1;
          oscillator.start(now);
          oscillator.stop(now + 0.05);
          break;
        case 'paper':
          oscillator.frequency.value = 400;
          gainNode.gain.value = 0.15;
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;
        case 'stamp':
          oscillator.frequency.value = 200;
          gainNode.gain.value = 0.3;
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          break;
        case 'error':
          oscillator.frequency.value = 150;
          gainNode.gain.value = 0.2;
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;
        case 'cash':
          oscillator.frequency.value = 600;
          gainNode.gain.value = 0.2;
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;
        case 'keypad':
          oscillator.frequency.value = 1000;
          gainNode.gain.value = 0.1;
          oscillator.start(now);
          oscillator.stop(now + 0.03);
          break;
      }
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  }
}

function generateCustomer(level: number): BankCustomer {
  const names = [
    'Betty Lee', 'Robert Chen', 'Maria Garcia', 'David Johnson', 'Sarah Wilson',
    'Michael Davis', 'Jennifer Brown', 'Christopher Miller', 'Lisa Anderson', 'James Taylor'
  ];
  
  const name = names[Math.floor(Math.random() * names.length)];
  const accountNumber = Math.floor(Math.random() * 90000000 + 10000000).toString();
  const amount = Math.floor(Math.random() * 5000) + 50;
  
  const isFraudulent = Math.random() < 0.35;
  
  const bankRecords: BankRecord = {
    name: name,
    dateOfBirth: `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1}/${Math.floor(Math.random() * 30) + 1950}`,
    address: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr'][Math.floor(Math.random() * 4)]}`,
    licenseNumber: `DL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    accountNumber: accountNumber,
    signature: generateSignature(name, isFraudulent)
  };

  const transaction: BankTransaction = {
    type: ['deposit', 'withdrawal', 'wire_transfer', 'money_order', 'cashiers_check'][Math.floor(Math.random() * 5)] as any,
    amount: amount,
    accountNumber: accountNumber,
    targetAccount: Math.random() < 0.3 ? Math.floor(Math.random() * 90000000 + 10000000).toString() : undefined,
    recipientName: Math.random() < 0.3 ? names[Math.floor(Math.random() * names.length)] : undefined
  };

  const documents: BankDocument[] = [
    {
      id: 'id_card',
      type: 'id',
      data: {
        name: isFraudulent ? generateSimilarName(name) : name,
        accountNumber: isFraudulent && Math.random() < 0.5 ? Math.floor(Math.random() * 90000000 + 10000000).toString() : accountNumber,
        address: bankRecords.address,
        dateOfBirth: isFraudulent && Math.random() < 0.5 ? `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1}/${Math.floor(Math.random() * 30) + 1950}` : bankRecords.dateOfBirth,
        idNumber: Math.random().toString(36).substr(2, 9).toUpperCase(),
        licenseNumber: isFraudulent && Math.random() < 0.3 ? `DL-${Math.random().toString(36).substr(2, 8).toUpperCase()}` : bankRecords.licenseNumber
      }
    },
    {
      id: 'transaction_slip',
      type: 'slip',
      data: {
        name: isFraudulent && Math.random() < 0.4 ? generateSimilarName(name) : name,
        amount: isFraudulent && Math.random() < 0.3 ? amount + Math.floor(Math.random() * 500) : amount,
        accountNumber: isFraudulent && Math.random() < 0.4 ? Math.floor(Math.random() * 90000000 + 10000000).toString() : accountNumber,
        type: transaction.type
      }
    },
    {
      id: 'bank_book',
      type: 'bank_book',
      data: {
        name: isFraudulent && Math.random() < 0.4 ? generateSimilarName(name) : name,
        accountNumber: isFraudulent && Math.random() < 0.4 ? Math.floor(Math.random() * 90000000 + 10000000).toString() : accountNumber,
        balance: Math.floor(Math.random() * 10000) + 100,
        amount: amount
      }
    },
    {
      id: 'signature',
      type: 'signature',
      data: {
        signature: generateSignature(name, isFraudulent),
        name: name
      }
    }
  ];

  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    transaction,
    documents,
    bankRecords,
    isFraudulent,
    patience: 100,
    maxPatience: Math.floor(Math.random() * 30) + 70
  };
}

function generateSimilarName(originalName: string): string {
  const variations = [
    originalName.replace(/a/g, 'e'),
    originalName.replace(/e/g, 'a'),
    originalName.replace(/i/g, 'y'),
    originalName.replace(/y/g, 'i'),
    originalName.charAt(0) + originalName.slice(1).replace(/l/g, 'r'),
    originalName.charAt(0) + originalName.slice(1).replace(/r/g, 'l'),
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

function generateSignature(name: string, isFraud: boolean): string {
  const style = isFraud ? 'trembling' : 'legitimate';
  const initials = name.split(' ').map(n => n[0]).join('');
  return `${initials}_${style}_${name.split(' ')[1] || 'signature'}`;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'intro',
    currentCustomer: null,
    score: 0,
    completedTransactions: 0,
    fraudulentApprovals: 0,
    correctRejections: 0,
    errors: 0,
    timeOnShift: 0,
    level: 1
  });

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
    '  NEXT - Process next customer',
    '',
    'Type PUNCH IN to begin your shift...'
  ]);
  
  const [terminalInput, setTerminalInput] = useState('');
  const [popupDocuments, setPopupDocuments] = useState<PopupDocument[]>([]);
  const [showBankRecords, setShowBankRecords] = useState(false);
  const [dragState, setDragState] = useState<{id: string, offset: {x: number, y: number}} | null>(null);
  
  const audioManager = useRef(new AudioManager());
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const addTerminalOutput = useCallback((message: string) => {
    setTerminalOutput(prev => [...prev, message]);
  }, []);

  const processCommand = useCallback((cmd: string) => {
    const upperCmd = cmd.toUpperCase().trim();
    addTerminalOutput('> ' + cmd);

    if (upperCmd === 'PUNCH IN') {
      setGameState(prev => ({ ...prev, phase: 'working' }));
      const customer = generateCustomer(gameState.level);
      setGameState(prev => ({ ...prev, currentCustomer: customer }));
      addTerminalOutput('Shift started. First customer approaching...');
      console.log('Generated customer:', customer);
      audioManager.current.playSound('cash');
      return;
    }

    if (upperCmd.startsWith('LOOKUP ')) {
      const accountNum = upperCmd.substring(7);
      addTerminalOutput('Accessing bank database...');
      audioManager.current.playSound('keypad');
      
      setTimeout(() => {
        if (gameState.currentCustomer && gameState.currentCustomer.bankRecords.accountNumber === accountNum) {
          addTerminalOutput('ACCOUNT FOUND:');
          addTerminalOutput(`Name: ${gameState.currentCustomer.bankRecords.name}`);
          addTerminalOutput(`DOB: ${gameState.currentCustomer.bankRecords.dateOfBirth}`);
          addTerminalOutput(`Address: ${gameState.currentCustomer.bankRecords.address}`);
          addTerminalOutput(`License: ${gameState.currentCustomer.bankRecords.licenseNumber}`);
          addTerminalOutput(`Signature: ${gameState.currentCustomer.bankRecords.signature}`);
          setShowBankRecords(true);
          audioManager.current.playSound('paper');
        } else {
          addTerminalOutput('ACCOUNT NOT FOUND');
          audioManager.current.playSound('error');
        }
      }, 1000);
      return;
    }

    if (upperCmd.startsWith('VERIFY ')) {
      const parts = upperCmd.substring(7).split(' ');
      const field = parts[0];
      const value = parts.slice(1).join(' ');
      
      if (!gameState.currentCustomer) return;
      
      const customer = gameState.currentCustomer;
      let match = false;
      
      switch (field) {
        case 'NAME':
          match = customer.bankRecords.name.toUpperCase() === value;
          break;
        case 'DOB':
          match = customer.bankRecords.dateOfBirth === value;
          break;
        case 'ADDRESS':
          match = customer.bankRecords.address.toUpperCase().includes(value);
          break;
        case 'LICENSE':
          match = customer.bankRecords.licenseNumber === value;
          break;
      }
      
      addTerminalOutput(match ? `✓ ${field} VERIFIED` : `✗ ${field} MISMATCH`);
      audioManager.current.playSound(match ? 'cash' : 'error');
      return;
    }

    if (upperCmd === 'COMPARE SIGNATURE') {
      addTerminalOutput('Signature comparison available in document viewer.');
      addTerminalOutput('Bank signature: ' + gameState.currentCustomer?.bankRecords.signature);
      return;
    }

    if (upperCmd === 'APPROVE') {
      if (!gameState.currentCustomer) {
        addTerminalOutput('ERROR: No customer present');
        return;
      }

      if (gameState.currentCustomer.isFraudulent) {
        const fraudCount = gameState.fraudulentApprovals + 1;
        addTerminalOutput('========================================');
        addTerminalOutput('🚨 CRITICAL ERROR - FRAUD APPROVED 🚨');
        addTerminalOutput('You approved fraudulent documents!');
        addTerminalOutput('Transaction processed illegally');
        addTerminalOutput('Bank security compromised');
        addTerminalOutput(`Fraudulent approvals: ${fraudCount}/2`);
        addTerminalOutput('========================================');
        
        setGameState(prev => ({
          ...prev,
          fraudulentApprovals: fraudCount,
          errors: prev.errors + 1
        }));

        if (fraudCount === 1) {
          addTerminalOutput('⚠️ MANAGEMENT WARNING ⚠️');
          addTerminalOutput('FIRST FRAUDULENT APPROVAL DETECTED');
          addTerminalOutput('One more fraud approval = IMMEDIATE TERMINATION');
          addTerminalOutput('Review all documents carefully');
          audioManager.current.playSound('error');
        } else if (fraudCount >= 2) {
          addTerminalOutput('🚨 IMMEDIATE TERMINATION 🚨');
          addTerminalOutput('TWO FRAUDULENT APPROVALS DETECTED');
          addTerminalOutput('You are terminated for criminal negligence');
          addTerminalOutput('Fraud investigation initiated');
          
          setTimeout(() => {
            setGameState(prev => ({ ...prev, phase: 'ended' }));
          }, 2000);
          return;
        }
      } else {
        addTerminalOutput('========================================');
        addTerminalOutput('TRANSACTION APPROVED - CORRECT DECISION');
        addTerminalOutput('All documents verified as authentic');
        addTerminalOutput('Customer served successfully');
        addTerminalOutput('========================================');
        
        setGameState(prev => ({
          ...prev,
          completedTransactions: prev.completedTransactions + 1,
          score: prev.score + 100
        }));
        audioManager.current.playSound('cash');
      }

      setTimeout(() => {
        const customer = generateCustomer(gameState.level);
        setGameState(prev => ({ ...prev, currentCustomer: customer }));
        setPopupDocuments([]);
        setShowBankRecords(false);
        addTerminalOutput('> Next customer approaching...');
        addTerminalOutput('Ready to process transaction');
        console.log('Generated customer:', customer);
        audioManager.current.playSound('paper');
      }, 2000);
      return;
    }

    if (upperCmd === 'REJECT') {
      if (!gameState.currentCustomer) {
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
        
        setGameState(prev => ({
          ...prev,
          errors: prev.errors + 1
        }));
        audioManager.current.playSound('error');
      } else {
        addTerminalOutput('========================================');
        addTerminalOutput('TRANSACTION REJECTED - CORRECT DECISION');
        addTerminalOutput('Fraudulent documents detected');
        addTerminalOutput('Bank security maintained');
        addTerminalOutput('Well done!');
        addTerminalOutput('========================================');
        
        setGameState(prev => ({
          ...prev,
          correctRejections: prev.correctRejections + 1,
          score: prev.score + 150
        }));
        audioManager.current.playSound('stamp');
      }

      setTimeout(() => {
        const customer = generateCustomer(gameState.level);
        setGameState(prev => ({ ...prev, currentCustomer: customer }));
        setPopupDocuments([]);
        setShowBankRecords(false);
        addTerminalOutput('> Next customer approaching...');
        addTerminalOutput('Ready to process transaction');
        console.log('Generated customer:', customer);
        audioManager.current.playSound('paper');
      }, 2000);
      return;
    }

    addTerminalOutput('ERROR: Unknown command');
  }, [gameState, addTerminalOutput]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      processCommand(terminalInput);
      setTerminalInput('');
      audioManager.current.playSound('typing');
    }
  };

  const openDocumentPopup = (document: BankDocument) => {
    const popup: PopupDocument = {
      document,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 100 + 100 },
      id: Math.random().toString(36).substr(2, 9)
    };
    setPopupDocuments(prev => [...prev, popup]);
    audioManager.current.playSound('paper');
  };

  const closeDocumentPopup = (id: string) => {
    setPopupDocuments(prev => prev.filter(p => p.id !== id));
  };

  const renderDocument = (doc: BankDocument) => {
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

  if (gameState.phase === 'intro') {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <h1 className="text-6xl font-bold mb-4 text-green-300">BANK TELLER 1988</h1>
          <p className="text-xl mb-8">1980s Fraud Detection Simulation</p>
          <p className="mb-4">You are a bank teller in 1988. Process customer transactions by examining documents carefully.</p>
          <p className="mb-8 text-red-400">WARNING: Approving 2 fraudulent transactions will result in immediate termination!</p>
          <button 
            className="bg-green-700 hover:bg-green-600 text-white px-8 py-4 text-xl font-bold border-2 border-green-400"
            onClick={() => {
              setGameState(prev => ({ ...prev, phase: 'working' }));
              const customer = generateCustomer(gameState.level);
              setGameState(prev => ({ ...prev, currentCustomer: customer }));
              console.log('Generated customer:', customer);
            }}
          >
            START SHIFT
          </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'ended') {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <h1 className="text-4xl font-bold mb-4 text-red-400">GAME OVER</h1>
          <p className="text-xl mb-8">Your shift has ended</p>
          <div className="text-left mb-8 bg-green-900 p-4 border-2 border-green-400">
            <p>Final Score: {gameState.score}</p>
            <p>Transactions Completed: {gameState.completedTransactions}</p>
            <p>Fraudulent Approvals: {gameState.fraudulentApprovals}</p>
            <p>Correct Rejections: {gameState.correctRejections}</p>
            <p>Total Errors: {gameState.errors}</p>
          </div>
          <button 
            className="bg-green-700 hover:bg-green-600 text-white px-8 py-4 text-xl font-bold border-2 border-green-400"
            onClick={() => {
              setGameState({
                phase: 'intro',
                currentCustomer: null,
                score: 0,
                completedTransactions: 0,
                fraudulentApprovals: 0,
                correctRejections: 0,
                errors: 0,
                timeOnShift: 0,
                level: 1
              });
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
                '  NEXT - Process next customer',
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

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Header */}
      <div className="bg-green-900 border-b-2 border-green-400 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">WESTRIDGE NATIONAL BANK</h1>
          <div className="flex gap-6 text-sm">
            <span>SCORE: {gameState.score}</span>
            <span>COMPLETED: {gameState.completedTransactions}</span>
            <span>ERRORS: {gameState.errors}</span>
            <span className="text-red-400">FRAUD APPROVALS: {gameState.fraudulentApprovals}/2</span>
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
                    style={{ width: `${(gameState.currentCustomer.patience / gameState.currentCustomer.maxPatience) * 100}%` }}
                  ></div>
                </div>
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
                  {gameState.currentCustomer.documents.map((doc: BankDocument) => renderDocument(doc))}
                </div>
              ) : (
                <div className="text-center text-green-600 mt-8">
                  No customer present
                </div>
              )}
            </div>

            {/* Bank Records Display */}
            {showBankRecords && gameState.currentCustomer && (
              <div className="p-4 border-t border-green-400 bg-green-800">
                <h4 className="font-bold mb-2">BANK RECORDS</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-green-500">Name:</span> {gameState.currentCustomer.bankRecords.name}</p>
                  <p><span className="text-green-500">DOB:</span> {gameState.currentCustomer.bankRecords.dateOfBirth}</p>
                  <p><span className="text-green-500">Address:</span> {gameState.currentCustomer.bankRecords.address}</p>
                  <p><span className="text-green-500">License:</span> {gameState.currentCustomer.bankRecords.licenseNumber}</p>
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
            left: popup.position.x,
            top: popup.position.y
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">{popup.document.type.toUpperCase()} DOCUMENT</h3>
            <button
              onClick={() => closeDocumentPopup(popup.id)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            {Object.entries(popup.document.data).map(([key, value]) => (
              <div key={key}>
                <span className="text-green-500 font-bold">{key.toUpperCase()}:</span> {String(value)}
              </div>
            ))}
          </div>

          {/* Show bank records for comparison */}
          {gameState.currentCustomer && (
            <div className="mt-4 pt-4 border-t border-green-400">
              <h4 className="font-bold mb-2 text-yellow-400">BANK RECORDS (FOR COMPARISON)</h4>
              <div className="text-xs space-y-1">
                <p><span className="text-green-500">Name:</span> {gameState.currentCustomer.bankRecords.name}</p>
                <p><span className="text-green-500">DOB:</span> {gameState.currentCustomer.bankRecords.dateOfBirth}</p>
                <p><span className="text-green-500">Address:</span> {gameState.currentCustomer.bankRecords.address}</p>
                <p><span className="text-green-500">License:</span> {gameState.currentCustomer.bankRecords.licenseNumber}</p>
                <p><span className="text-green-500">Account:</span> {gameState.currentCustomer.bankRecords.accountNumber}</p>
                <p><span className="text-green-500">Signature:</span> {gameState.currentCustomer.bankRecords.signature}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}