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
  
  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  playSound(type: 'typing' | 'paper' | 'stamp' | 'error' | 'cash' | 'keypad') {
    if (!this.audioContext) return;
    
    try {
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
      
      gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Audio play failed');
    }
  }
}

function generateCustomer(level: number): BankCustomer {
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
  const isFraudulent = Math.random() < 0.35;
  
  const bankRecords: BankRecord = {
    name: name,
    dateOfBirth: '1985-03-15',
    address: addresses[Math.floor(Math.random() * addresses.length)],
    licenseNumber: 'DL' + Math.floor(Math.random() * 9000000 + 1000000),
    accountNumber: accountNumber,
    signature: generateSignature(name, false)
  };

  const transactionTypes: BankTransaction['type'][] = ['deposit', 'withdrawal', 'wire_transfer', 'money_order', 'cashiers_check'];
  const transaction: BankTransaction = {
    type: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
    amount: Math.floor(Math.random() * 5000 + 100),
    accountNumber: accountNumber,
    ...(Math.random() > 0.5 && {
      targetAccount: Math.floor(Math.random() * 900000000 + 100000000).toString(),
      recipientName: names[Math.floor(Math.random() * names.length)]
    })
  };

  const documents: BankDocument[] = [
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

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

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

  const openDocumentPopup = (document: BankDocument) => {
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

  const renderDocument = (doc: BankDocument) => {
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'black', 
        color: '#00ff00', 
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', padding: '32px' }}>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              marginBottom: '32px', 
              color: '#00cc00' 
            }}>
              🏦 BANK TELLER 1988 🏦
            </h1>
            <div style={{ 
              textAlign: 'left', 
              backgroundColor: '#1a1a1a', 
              padding: '24px', 
              borderRadius: '8px', 
              border: '2px solid #00ff00' 
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                marginBottom: '16px', 
                textAlign: 'center' 
              }}>
                WESTRIDGE NATIONAL BANK
              </h2>
              <p style={{ marginBottom: '16px' }}>
                Welcome to your first day as a bank teller. Your job is to process customer 
                transactions while detecting fraudulent documents and suspicious activity.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong>CRITICAL:</strong> The system will NEVER automatically flag fraud. 
                You must manually examine all documents and compare them with bank records.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <strong>Key Commands:</strong>
                <ul style={{ marginTop: '8px', fontSize: '14px' }}>
                  <li>LOOKUP [account] - Access customer bank records</li>
                  <li>VERIFY [field] [value] - Check specific information</li>
                  <li>COMPARE SIGNATURE - Review signature authenticity</li>
                  <li>APPROVE/REJECT - Make your decision</li>
                </ul>
              </div>
              <p style={{ color: '#ffff00', fontWeight: 'bold' }}>
                Remember: 2 fraudulent approvals = TERMINATION
              </p>
            </div>
            <button 
              onClick={() => processCommand('PUNCH IN')}
              style={{
                marginTop: '24px',
                padding: '12px 32px',
                backgroundColor: '#00aa00',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'black', 
        color: '#00ff00', 
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', padding: '32px' }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            marginBottom: '32px', 
            color: '#ff0000' 
          }}>
            SHIFT ENDED
          </h1>
          <div style={{ 
            backgroundColor: '#1a1a1a', 
            padding: '24px', 
            borderRadius: '8px', 
            border: '2px solid #ff0000',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              marginBottom: '16px' 
            }}>
              FINAL PERFORMANCE REPORT
            </h2>
            <div style={{ textAlign: 'left' }}>
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
            style={{
              padding: '12px 32px',
              backgroundColor: '#00aa00',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: 'black', 
        color: '#00ff00', 
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ 
        backgroundColor: '#1a1a1a', 
        borderBottom: '2px solid #00ff00', 
        padding: '8px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            WESTRIDGE NATIONAL BANK - TELLER TERMINAL
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
            <div>Score: {gameState.score}</div>
            <div>Transactions: {gameState.completedTransactions}</div>
            <div>Fraud Approvals: {gameState.fraudulentApprovals}/2</div>
            <div>Time: {Math.floor(gameState.timeOnShift / 60)}:{String(gameState.timeOnShift % 60).padStart(2, '0')}</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div 
            ref={terminalRef}
            style={{ 
              flex: 1, 
              backgroundColor: 'black', 
              padding: '16px', 
              overflowY: 'auto',
              fontSize: '14px',
              lineHeight: '1.5',
              height: '60vh'
            }}
          >
            {terminalOutput.map((line, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {line}
              </div>
            ))}
          </div>

          <div style={{ 
            backgroundColor: '#1a1a1a', 
            borderTop: '2px solid #00ff00', 
            padding: '16px' 
          }}>
            <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#00cc00' }}>{'>'}</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'black',
                  color: '#00ff00',
                  border: '1px solid #00ff00',
                  padding: '4px 8px',
                  fontFamily: 'monospace'
                }}
                placeholder="Enter command..."
                autoFocus
              />
            </form>
            
            <div style={{ 
              marginTop: '8px', 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px' 
            }}>
              <button
                onClick={() => setTerminalInput('LOOKUP ')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#333',
                  color: '#00ff00',
                  fontSize: '12px',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                LOOKUP
              </button>
              <button
                onClick={() => setTerminalInput('VERIFY ')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#333',
                  color: '#00ff00',
                  fontSize: '12px',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                VERIFY
              </button>
              <button
                onClick={() => processCommand('COMPARE SIGNATURE')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#333',
                  color: '#00ff00',
                  fontSize: '12px',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                COMPARE SIG
              </button>
              <button
                onClick={() => processCommand('APPROVE')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#006600',
                  color: 'white',
                  fontSize: '12px',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                APPROVE
              </button>
              <button
                onClick={() => processCommand('REJECT')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#cc0000',
                  color: 'white',
                  fontSize: '12px',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                REJECT
              </button>
              <button
                onClick={() => processCommand('NEXT')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  fontSize: '12px',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                NEXT
              </button>
            </div>
          </div>
        </div>

        {gameState.currentCustomer && (
          <div style={{ 
            width: '320px', 
            backgroundColor: '#1a1a1a', 
            borderLeft: '2px solid #00ff00', 
            padding: '16px' 
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '16px', 
              color: '#00cc00' 
            }}>
              CUSTOMER DOCUMENTS
            </h3>
            
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              backgroundColor: '#333', 
              borderRadius: '4px',
              border: '1px solid #00ff00'
            }}>
              <div style={{ fontSize: '14px' }}>
                <div><strong>Customer:</strong> {gameState.currentCustomer.name}</div>
                <div><strong>Transaction:</strong> {gameState.currentCustomer.transaction.type.toUpperCase()}</div>
                <div><strong>Amount:</strong> ${gameState.currentCustomer.transaction.amount}</div>
                <div><strong>Account:</strong> {gameState.currentCustomer.transaction.accountNumber}</div>
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#ffff00' }}>
                    Patience: {gameState.currentCustomer.patience}%
                  </div>
                  <div style={{ 
                    width: '100%', 
                    backgroundColor: '#666', 
                    borderRadius: '2px',
                    height: '8px',
                    marginTop: '4px'
                  }}>
                    <div 
                      style={{ 
                        backgroundColor: '#ffff00', 
                        height: '8px', 
                        borderRadius: '2px',
                        transition: 'width 1s',
                        width: `${gameState.currentCustomer.patience}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px',
              overflowY: 'auto',
              height: '38vh'
            }}>
              {gameState.currentCustomer.documents.map((doc: BankDocument) => (
                <button
                  key={doc.id}
                  onClick={() => openDocumentPopup(doc)}
                  style={{
                    padding: '12px',
                    backgroundColor: '#333',
                    border: '1px solid #00ff00',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '12px',
                    minHeight: '120px',
                    color: '#00ff00'
                  }}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: '#00cc00', 
                    marginBottom: '8px' 
                  }}>
                    {doc.type.toUpperCase().replace('_', ' ')}
                  </div>
                  <div style={{ color: '#ccc' }}>
                    Click to examine
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showBankRecords && gameState.currentCustomer && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '16px',
          width: '320px',
          backgroundColor: '#003366',
          border: '2px solid #0066cc',
          borderRadius: '4px',
          padding: '16px',
          zIndex: 50
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '12px' 
          }}>
            <h4 style={{ fontWeight: 'bold', color: '#66ccff' }}>
              BANK COMPUTER RECORDS
            </h4>
            <button
              onClick={() => setShowBankRecords(false)}
              style={{
                color: '#66ccff',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '14px', color: '#ccddff' }}>
            <div><strong>Name:</strong> {gameState.currentCustomer.bankRecords.name}</div>
            <div><strong>DOB:</strong> {gameState.currentCustomer.bankRecords.dateOfBirth}</div>
            <div><strong>Address:</strong> {gameState.currentCustomer.bankRecords.address}</div>
            <div><strong>License:</strong> {gameState.currentCustomer.bankRecords.licenseNumber}</div>
            <div><strong>Account:</strong> {gameState.currentCustomer.bankRecords.accountNumber}</div>
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              backgroundColor: '#002244', 
              borderRadius: '4px' 
            }}>
              <strong>Bank Signature:</strong>
              <div style={{ 
                marginTop: '4px', 
                color: 'white', 
                fontFamily: 'cursive', 
                fontSize: '16px' 
              }}>
                {gameState.currentCustomer.bankRecords.signature}
              </div>
            </div>
          </div>
        </div>
      )}

      {popupDocuments.map((popup) => (
        <div
          key={popup.id}
          style={{
            position: 'fixed',
            left: popup.position.x,
            top: popup.position.y,
            width: '350px',
            height: '550px',
            backgroundColor: 'white',
            color: 'black',
            border: '2px solid #666',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 40
          }}
        >
          <div
            style={{
              backgroundColor: '#ddd',
              padding: '8px',
              cursor: 'move',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #ccc'
            }}
            onMouseDown={(e) => handleMouseDown(e, popup.id)}
          >
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
              DOCUMENT: {popup.document.type.toUpperCase()}
            </span>
            <button
              onClick={() => closeDocumentPopup(popup.id)}
              style={{
                color: '#666',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ 
            padding: '16px', 
            overflowY: 'auto', 
            height: 'calc(100% - 120px)' 
          }}>
            {renderDocument(popup.document)}
          </div>

          {gameState.currentCustomer && (
            <div style={{ 
              borderTop: '1px solid #ccc', 
              backgroundColor: '#f0f8ff', 
              padding: '12px' 
            }}>
              <h5 style={{ 
                fontWeight: 'bold', 
                color: '#003366', 
                fontSize: '14px', 
                marginBottom: '8px' 
              }}>
                BANK RECORDS
              </h5>
              <div style={{ fontSize: '12px', color: '#004488' }}>
                <div>Name: {gameState.currentCustomer.bankRecords.name}</div>
                <div>DOB: {gameState.currentCustomer.bankRecords.dateOfBirth}</div>
                <div>License: {gameState.currentCustomer.bankRecords.licenseNumber}</div>
                {popup.document.type === 'signature' && (
                  <div style={{ 
                    marginTop: '4px', 
                    padding: '4px', 
                    backgroundColor: '#e6f3ff' 
                  }}>
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