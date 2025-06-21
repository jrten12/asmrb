import React, { useState, useEffect, useRef, useCallback } from 'react';
import './client/src/index.css';

// Game interfaces
interface Customer {
  id: string;
  name: string;
  transaction: Transaction;
  documents: Document[];
  bankRecords: BankRecord;
  isFraudulent: boolean;
  patience: number;
  maxPatience: number;
}

interface Transaction {
  type: 'deposit' | 'withdrawal' | 'wire_transfer' | 'money_order' | 'cashiers_check';
  amount: number;
  accountNumber: string;
  targetAccount?: string;
  recipientName?: string;
}

interface Document {
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
  currentCustomer: Customer | null;
  score: number;
  completedTransactions: number;
  fraudulentApprovals: number;
  correctRejections: number;
  errors: number;
  timeOnShift: number;
  level: number;
}

interface PopupDocument {
  document: Document;
  position: { x: number; y: number };
  id: string;
}

// Sound management
class AudioManager {
  private audioContext: AudioContext | null = null;
  
  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  playSound(type: 'typing' | 'paper' | 'stamp' | 'error' | 'cash' | 'keypad') {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    const frequencies = {
      typing: 800,
      paper: 200,
      stamp: 150,
      error: 300,
      cash: 400,
      keypad: 600
    };
    
    oscillator.frequency.value = frequencies[type];
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }
}

// Customer and document generation
function generateCustomer(level: number): Customer {
  const names = [
    'Sarah Williams', 'John Davis', 'Maria Rodriguez', 'Robert Johnson', 
    'Jennifer Brown', 'Michael Wilson', 'Lisa Anderson', 'David Martinez'
  ];
  
  const addresses = [
    '123 Main St, Springfield, IL 62701',
    '456 Oak Ave, Riverside, CA 92501',
    '789 Pine Rd, Austin, TX 73301',
    '321 Elm Dr, Denver, CO 80201'
  ];

  const name = names[Math.floor(Math.random() * names.length)];
  const accountNumber = Math.floor(Math.random() * 900000000 + 100000000).toString();
  const isFraudulent = Math.random() < 0.35; // 35% fraud rate
  
  // Generate bank records (what's in the system)
  const bankRecords: BankRecord = {
    name: name,
    dateOfBirth: '1985-03-15',
    address: addresses[Math.floor(Math.random() * addresses.length)],
    licenseNumber: 'DL' + Math.floor(Math.random() * 9000000 + 1000000),
    accountNumber: accountNumber,
    signature: generateSignature(name, false)
  };

  // Generate transaction
  const transactionTypes: Transaction['type'][] = ['deposit', 'withdrawal', 'wire_transfer', 'money_order', 'cashiers_check'];
  const transaction: Transaction = {
    type: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
    amount: Math.floor(Math.random() * 5000 + 100),
    accountNumber: accountNumber,
    ...(Math.random() > 0.5 && {
      targetAccount: Math.floor(Math.random() * 900000000 + 100000000).toString(),
      recipientName: names[Math.floor(Math.random() * names.length)]
    })
  };

  // Generate documents with potential fraud
  const documents: Document[] = [
    {
      id: 'id-1',
      type: 'id',
      data: {
        name: isFraudulent && Math.random() > 0.5 ? generateSimilarName(name) : name,
        dateOfBirth: isFraudulent && Math.random() > 0.5 ? '1987-05-22' : bankRecords.dateOfBirth,
        address: isFraudulent && Math.random() > 0.5 ? addresses[Math.floor(Math.random() * addresses.length)] : bankRecords.address,
        licenseNumber: isFraudulent && Math.random() > 0.5 ? 'DL' + Math.floor(Math.random() * 9000000 + 1000000) : bankRecords.licenseNumber
      }
    },
    {
      id: 'signature-1',
      type: 'signature',
      data: {
        signature: isFraudulent && Math.random() > 0.5 ? generateSignature(name, true) : bankRecords.signature,
        signedBy: name
      }
    },
    {
      id: 'slip-1',
      type: 'slip',
      data: {
        accountNumber: accountNumber,
        amount: transaction.amount,
        type: transaction.type,
        date: new Date().toLocaleDateString()
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
    maxPatience: 100
  };
}

function generateSimilarName(originalName: string): string {
  const variations = [
    originalName.replace('a', 'e'),
    originalName.replace('i', 'y'),
    originalName.replace('Williams', 'Wilson'),
    originalName.replace('John', 'Jon'),
    originalName.replace('Sarah', 'Sara')
  ];
  return variations[Math.floor(Math.random() * variations.length)] || originalName;
}

function generateSignature(name: string, isFraud: boolean): string {
  const baseSignature = name.split(' ').map(word => 
    word.split('').map((char, i) => 
      i === 0 ? char.toUpperCase() : char.toLowerCase()
    ).join('')
  ).join(' ');
  
  if (isFraud) {
    // Make signature look different - shaky, different style
    return baseSignature.split('').map(char => 
      Math.random() > 0.7 ? char.toUpperCase() : char
    ).join('');
  }
  
  return baseSignature;
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

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Timer for customer patience and game time
  useEffect(() => {
    if (gameState.phase === 'working') {
      const timer = setInterval(() => {
        setGameState(prev => {
          const newState = { ...prev, timeOnShift: prev.timeOnShift + 1 };
          
          if (prev.currentCustomer) {
            const updatedCustomer = {
              ...prev.currentCustomer,
              patience: Math.max(0, prev.currentCustomer.patience - 1)
            };
            
            if (updatedCustomer.patience === 0) {
              // Customer leaves due to timeout
              addTerminalOutput('Customer left due to timeout. -10 points.');
              return {
                ...newState,
                currentCustomer: null,
                score: Math.max(0, prev.score - 10),
                errors: prev.errors + 1
              };
            }
            
            return { ...newState, currentCustomer: updatedCustomer };
          }
          
          return newState;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.phase]);

  const addTerminalOutput = useCallback((message: string) => {
    setTerminalOutput(prev => [...prev, message]);
  }, []);

  const processCommand = useCallback((command: string) => {
    const cmd = command.trim().toUpperCase();
    audioManager.current.playSound('typing');
    
    addTerminalOutput(`> ${command}`);

    if (cmd === 'PUNCH IN') {
      if (gameState.phase === 'intro') {
        setGameState(prev => ({ ...prev, phase: 'working' }));
        addTerminalOutput('Shift started. Waiting for first customer...');
        setTimeout(() => {
          const newCustomer = generateCustomer(gameState.level);
          setGameState(prev => ({ ...prev, currentCustomer: newCustomer }));
          addTerminalOutput(`Customer: ${newCustomer.name}`);
          addTerminalOutput(`Transaction: ${newCustomer.transaction.type.toUpperCase()} $${newCustomer.transaction.amount}`);
          addTerminalOutput(`Account: ${newCustomer.transaction.accountNumber}`);
          addTerminalOutput('Documents provided. Click to examine.');
          audioManager.current.playSound('paper');
        }, 1000);
      }
      return;
    }

    if (!gameState.currentCustomer) {
      addTerminalOutput('No customer present. Use NEXT to call next customer.');
      return;
    }

    if (cmd.startsWith('LOOKUP ')) {
      const accountNum = cmd.substring(7).trim();
      if (accountNum === gameState.currentCustomer.bankRecords.accountNumber) {
        audioManager.current.playSound('keypad');
        addTerminalOutput('ACCOUNT FOUND:');
        addTerminalOutput(`Name: ${gameState.currentCustomer.bankRecords.name}`);
        addTerminalOutput(`DOB: ${gameState.currentCustomer.bankRecords.dateOfBirth}`);
        addTerminalOutput(`Address: ${gameState.currentCustomer.bankRecords.address}`);
        addTerminalOutput(`License: ${gameState.currentCustomer.bankRecords.licenseNumber}`);
        setShowBankRecords(true);
      } else {
        addTerminalOutput('Account not found or invalid format.');
        audioManager.current.playSound('error');
      }
      return;
    }

    if (cmd.startsWith('VERIFY ')) {
      const parts = cmd.substring(7).split(' ');
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

    if (cmd === 'COMPARE SIGNATURE') {
      addTerminalOutput('Signature comparison available in document viewer.');
      addTerminalOutput('Bank signature: ' + gameState.currentCustomer.bankRecords.signature);
      return;
    }

    if (cmd === 'APPROVE') {
      if (!gameState.currentCustomer) return;
      
      audioManager.current.playSound('stamp');
      
      if (gameState.currentCustomer.isFraudulent) {
        // Player approved fraud - this is bad
        const newFraudApprovals = gameState.fraudulentApprovals + 1;
        addTerminalOutput('TRANSACTION APPROVED');
        addTerminalOutput('⚠️ WARNING: Fraudulent transaction approved!');
        
        if (newFraudApprovals >= 2) {
          addTerminalOutput('SECURITY ALERT: Too many fraudulent approvals.');
          addTerminalOutput('Your employment has been terminated.');
          setGameState(prev => ({ 
            ...prev, 
            phase: 'ended',
            fraudulentApprovals: newFraudApprovals,
            currentCustomer: null
          }));
          return;
        }
        
        setGameState(prev => ({
          ...prev,
          score: Math.max(0, prev.score - 50),
          fraudulentApprovals: newFraudApprovals,
          completedTransactions: prev.completedTransactions + 1,
          currentCustomer: null,
          errors: prev.errors + 1
        }));
      } else {
        // Correctly approved legitimate transaction
        addTerminalOutput('TRANSACTION APPROVED');
        addTerminalOutput('+25 points - Legitimate transaction processed.');
        setGameState(prev => ({
          ...prev,
          score: prev.score + 25,
          completedTransactions: prev.completedTransactions + 1,
          currentCustomer: null
        }));
      }
      
      setPopupDocuments([]);
      setShowBankRecords(false);
      return;
    }

    if (cmd === 'REJECT') {
      if (!gameState.currentCustomer) return;
      
      audioManager.current.playSound('error');
      
      if (gameState.currentCustomer.isFraudulent) {
        // Correctly rejected fraudulent transaction
        addTerminalOutput('TRANSACTION REJECTED');
        addTerminalOutput('+50 points - Fraud successfully detected!');
        setGameState(prev => ({
          ...prev,
          score: prev.score + 50,
          correctRejections: prev.correctRejections + 1,
          completedTransactions: prev.completedTransactions + 1,
          currentCustomer: null
        }));
      } else {
        // Incorrectly rejected legitimate transaction
        addTerminalOutput('TRANSACTION REJECTED');
        addTerminalOutput('⚠️ WARNING: Legitimate transaction rejected.');
        addTerminalOutput('-15 points - Customer complaint filed.');
        setGameState(prev => ({
          ...prev,
          score: Math.max(0, prev.score - 15),
          completedTransactions: prev.completedTransactions + 1,
          currentCustomer: null,
          errors: prev.errors + 1
        }));
      }
      
      setPopupDocuments([]);
      setShowBankRecords(false);
      return;
    }

    if (cmd === 'NEXT') {
      if (gameState.currentCustomer) {
        addTerminalOutput('Complete current transaction first.');
        return;
      }
      
      const newCustomer = generateCustomer(gameState.level);
      setGameState(prev => ({ ...prev, currentCustomer: newCustomer }));
      addTerminalOutput(`Customer: ${newCustomer.name}`);
      addTerminalOutput(`Transaction: ${newCustomer.transaction.type.toUpperCase()} $${newCustomer.transaction.amount}`);
      addTerminalOutput(`Account: ${newCustomer.transaction.accountNumber}`);
      addTerminalOutput('Documents provided. Click to examine.');
      audioManager.current.playSound('paper');
      return;
    }

    addTerminalOutput('Unknown command. Type HELP for available commands.');
    audioManager.current.playSound('error');
  }, [gameState, addTerminalOutput]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      processCommand(terminalInput.trim());
      setTerminalInput('');
    }
  };

  const openDocumentPopup = (document: Document) => {
    audioManager.current.playSound('paper');
    
    const popup: PopupDocument = {
      document,
      position: { 
        x: 300 + popupDocuments.length * 20, 
        y: 100 + popupDocuments.length * 20 
      },
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setPopupDocuments(prev => [...prev, popup]);
  };

  const closeDocumentPopup = (popupId: string) => {
    setPopupDocuments(prev => prev.filter(p => p.id !== popupId));
  };

  const handleMouseDown = (e: React.MouseEvent, popupId: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragState({
      id: popupId,
      offset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragState) {
      setPopupDocuments(prev => prev.map(popup => 
        popup.id === dragState.id 
          ? {
              ...popup,
              position: {
                x: e.clientX - dragState.offset.x,
                y: e.clientY - dragState.offset.y
              }
            }
          : popup
      ));
    }
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  const renderDocument = (doc: Document) => {
    switch (doc.type) {
      case 'id':
        return (
          <div className="bg-blue-100 p-3 border-2 border-blue-300 rounded">
            <h4 className="font-bold text-blue-800">DRIVER'S LICENSE</h4>
            <div className="text-sm mt-2">
              <div><strong>Name:</strong> {doc.data.name}</div>
              <div><strong>DOB:</strong> {doc.data.dateOfBirth}</div>
              <div><strong>Address:</strong> {doc.data.address}</div>
              <div><strong>License #:</strong> {doc.data.licenseNumber}</div>
            </div>
          </div>
        );
      case 'signature':
        return (
          <div className="bg-yellow-100 p-3 border-2 border-yellow-300 rounded">
            <h4 className="font-bold text-yellow-800">SIGNATURE CARD</h4>
            <div className="text-sm mt-2">
              <div><strong>Signed by:</strong> {doc.data.signedBy}</div>
              <div className="mt-2 p-2 bg-white border">
                <em style={{ fontFamily: 'cursive', fontSize: '18px' }}>
                  {doc.data.signature}
                </em>
              </div>
            </div>
          </div>
        );
      case 'slip':
        return (
          <div className="bg-green-100 p-3 border-2 border-green-300 rounded">
            <h4 className="font-bold text-green-800">TRANSACTION SLIP</h4>
            <div className="text-sm mt-2">
              <div><strong>Type:</strong> {doc.data.type?.toUpperCase()}</div>
              <div><strong>Amount:</strong> ${doc.data.amount}</div>
              <div><strong>Account:</strong> {doc.data.accountNumber}</div>
              <div><strong>Date:</strong> {doc.data.date}</div>
            </div>
          </div>
        );
      default:
        return <div>Unknown document type</div>;
    }
  };

  if (gameState.phase === 'intro') {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl p-8">
            <h1 className="text-4xl font-bold mb-8 text-green-300">
              🏦 BANK TELLER 1988 🏦
            </h1>
            <div className="text-left bg-gray-900 p-6 rounded border-2 border-green-400">
              <h2 className="text-xl font-bold mb-4 text-center">WESTRIDGE NATIONAL BANK</h2>
              <p className="mb-4">
                Welcome to your first day as a bank teller. Your job is to process customer 
                transactions while detecting fraudulent documents and suspicious activity.
              </p>
              <p className="mb-4">
                <strong>CRITICAL:</strong> The system will NEVER automatically flag fraud. 
                You must manually examine all documents and compare them with bank records.
              </p>
              <div className="mb-4">
                <strong>Key Commands:</strong>
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>LOOKUP [account] - Access customer bank records</li>
                  <li>VERIFY [field] [value] - Check specific information</li>
                  <li>COMPARE SIGNATURE - Review signature authenticity</li>
                  <li>APPROVE/REJECT - Make your decision</li>
                </ul>
              </div>
              <p className="text-yellow-400 font-bold">
                Remember: 2 fraudulent approvals = TERMINATION
              </p>
            </div>
            <button 
              onClick={() => processCommand('PUNCH IN')}
              className="mt-6 px-8 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors"
            >
              BEGIN SHIFT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'ended') {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <h1 className="text-4xl font-bold mb-8 text-red-400">SHIFT ENDED</h1>
          <div className="bg-gray-900 p-6 rounded border-2 border-red-400 mb-6">
            <h2 className="text-xl font-bold mb-4">FINAL PERFORMANCE REPORT</h2>
            <div className="text-left">
              <div>Score: {gameState.score}</div>
              <div>Transactions Processed: {gameState.completedTransactions}</div>
              <div>Fraud Correctly Detected: {gameState.correctRejections}</div>
              <div>Fraudulent Approvals: {gameState.fraudulentApprovals}</div>
              <div>Total Errors: {gameState.errors}</div>
              <div>Time on Shift: {Math.floor(gameState.timeOnShift / 60)}:{String(gameState.timeOnShift % 60).padStart(2, '0')}</div>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-black text-green-400 font-mono flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Header */}
      <div className="bg-gray-900 border-b-2 border-green-400 p-2">
        <div className="flex justify-between items-center">
          <div className="text-lg font-bold">WESTRIDGE NATIONAL BANK - TELLER TERMINAL</div>
          <div className="flex gap-6 text-sm">
            <div>Score: {gameState.score}</div>
            <div>Transactions: {gameState.completedTransactions}</div>
            <div>Fraud Approvals: {gameState.fraudulentApprovals}/2</div>
            <div>Time: {Math.floor(gameState.timeOnShift / 60)}:{String(gameState.timeOnShift % 60).padStart(2, '0')}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Terminal */}
        <div className="flex-1 flex flex-col">
          {/* Terminal Output */}
          <div 
            ref={terminalRef}
            className="flex-1 bg-black p-4 overflow-y-auto text-sm leading-relaxed"
            style={{ height: '60vh' }}
          >
            {terminalOutput.map((line, index) => (
              <div key={index} className="mb-1">
                {line}
              </div>
            ))}
          </div>

          {/* Terminal Input */}
          <div className="bg-gray-900 border-t-2 border-green-400 p-4">
            <form onSubmit={handleTerminalSubmit} className="flex gap-2">
              <span className="text-green-300">{'>'}</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="flex-1 bg-black text-green-400 border border-green-400 px-2 py-1 focus:outline-none focus:border-green-300"
                placeholder="Enter command..."
                autoFocus
              />
            </form>
            
            {/* Command Buttons */}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setTerminalInput('LOOKUP ')}
                className="px-3 py-1 bg-gray-700 text-green-400 text-xs rounded hover:bg-gray-600 transition-colors"
              >
                LOOKUP
              </button>
              <button
                onClick={() => setTerminalInput('VERIFY ')}
                className="px-3 py-1 bg-gray-700 text-green-400 text-xs rounded hover:bg-gray-600 transition-colors"
              >
                VERIFY
              </button>
              <button
                onClick={() => processCommand('COMPARE SIGNATURE')}
                className="px-3 py-1 bg-gray-700 text-green-400 text-xs rounded hover:bg-gray-600 transition-colors"
              >
                COMPARE SIG
              </button>
              <button
                onClick={() => processCommand('APPROVE')}
                className="px-3 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-600 transition-colors"
              >
                APPROVE
              </button>
              <button
                onClick={() => processCommand('REJECT')}
                className="px-3 py-1 bg-red-700 text-white text-xs rounded hover:bg-red-600 transition-colors"
              >
                REJECT
              </button>
              <button
                onClick={() => processCommand('NEXT')}
                className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              >
                NEXT
              </button>
            </div>
          </div>
        </div>

        {/* Customer Documents */}
        {gameState.currentCustomer && (
          <div className="w-80 bg-gray-900 border-l-2 border-green-400 p-4">
            <h3 className="text-lg font-bold mb-4 text-green-300">CUSTOMER DOCUMENTS</h3>
            
            {/* Customer Info */}
            <div className="mb-4 p-3 bg-gray-800 rounded border border-green-400">
              <div className="text-sm">
                <div><strong>Customer:</strong> {gameState.currentCustomer.name}</div>
                <div><strong>Transaction:</strong> {gameState.currentCustomer.transaction.type.toUpperCase()}</div>
                <div><strong>Amount:</strong> ${gameState.currentCustomer.transaction.amount}</div>
                <div><strong>Account:</strong> {gameState.currentCustomer.transaction.accountNumber}</div>
                <div className="mt-2">
                  <div className="text-xs text-yellow-400">
                    Patience: {gameState.currentCustomer.patience}%
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${gameState.currentCustomer.patience}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Grid */}
            <div 
              className="grid grid-cols-2 gap-2 overflow-y-auto"
              style={{ height: '38vh' }}
            >
              {gameState.currentCustomer.documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => openDocumentPopup(doc)}
                  className="p-3 bg-gray-800 border border-green-400 rounded hover:bg-gray-700 transition-colors text-left text-xs"
                  style={{ minHeight: '120px' }}
                >
                  <div className="font-bold text-green-300 mb-2">
                    {doc.type.toUpperCase().replace('_', ' ')}
                  </div>
                  <div className="text-gray-300">
                    Click to examine
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bank Records Panel */}
      {showBankRecords && gameState.currentCustomer && (
        <div className="fixed top-20 right-4 w-80 bg-blue-900 border-2 border-blue-400 rounded p-4 z-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-blue-200">BANK COMPUTER RECORDS</h4>
            <button
              onClick={() => setShowBankRecords(false)}
              className="text-blue-200 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-blue-100">
            <div><strong>Name:</strong> {gameState.currentCustomer.bankRecords.name}</div>
            <div><strong>DOB:</strong> {gameState.currentCustomer.bankRecords.dateOfBirth}</div>
            <div><strong>Address:</strong> {gameState.currentCustomer.bankRecords.address}</div>
            <div><strong>License:</strong> {gameState.currentCustomer.bankRecords.licenseNumber}</div>
            <div><strong>Account:</strong> {gameState.currentCustomer.bankRecords.accountNumber}</div>
            <div className="mt-2 p-2 bg-blue-800 rounded">
              <strong>Bank Signature:</strong>
              <div className="mt-1 text-white" style={{ fontFamily: 'cursive', fontSize: '16px' }}>
                {gameState.currentCustomer.bankRecords.signature}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Popups */}
      {popupDocuments.map((popup) => (
        <div
          key={popup.id}
          className="fixed bg-white text-black border-2 border-gray-400 rounded shadow-lg z-40"
          style={{
            left: popup.position.x,
            top: popup.position.y,
            width: '350px',
            height: '550px'
          }}
        >
          {/* Popup Header */}
          <div
            className="bg-gray-200 p-2 cursor-move flex justify-between items-center border-b"
            onMouseDown={(e) => handleMouseDown(e, popup.id)}
          >
            <span className="font-bold text-sm">
              DOCUMENT: {popup.document.type.toUpperCase()}
            </span>
            <button
              onClick={() => closeDocumentPopup(popup.id)}
              className="text-gray-600 hover:text-black font-bold"
            >
              ✕
            </button>
          </div>

          {/* Popup Content */}
          <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 120px)' }}>
            {renderDocument(popup.document)}
          </div>

          {/* Bank Records in Popup */}
          {gameState.currentCustomer && (
            <div className="border-t bg-blue-50 p-3">
              <h5 className="font-bold text-blue-800 text-sm mb-2">BANK RECORDS</h5>
              <div className="text-xs text-blue-700">
                <div>Name: {gameState.currentCustomer.bankRecords.name}</div>
                <div>DOB: {gameState.currentCustomer.bankRecords.dateOfBirth}</div>
                <div>License: {gameState.currentCustomer.bankRecords.licenseNumber}</div>
                {popup.document.type === 'signature' && (
                  <div className="mt-1 p-1 bg-blue-100">
                    <em style={{ fontFamily: 'cursive' }}>
                      {gameState.currentCustomer.bankRecords.signature}
                    </em>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}