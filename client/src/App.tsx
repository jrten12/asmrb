import React, { useState, useEffect } from 'react';

interface Customer {
  name: string;
  accountNumber: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'WIRE_TRANSFER';
  requestedAmount: number;
  documents: Document[];
  isFraud: boolean;
  fraudType: number;
}

interface Document {
  type: string;
  title: string;
  data: Record<string, string | number>;
}

function App() {
  const [gamePhase, setGamePhase] = useState<'punch_in' | 'working'>('punch_in');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [gameScore, setGameScore] = useState({
    score: 0,
    correctTransactions: 0,
    errors: 0
  });
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);

  // Simple sound effects using Web Audio API
  const playSound = (type: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch (type) {
        case 'keyboard':
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
          break;
        case 'printer':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
          break;
        case 'error':
          oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
          break;
        default:
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not available');
    }
  };

  const generateCustomer = (): Customer => {
    const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'James Wilson'];
    const name = names[Math.floor(Math.random() * names.length)];
    const accountNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    const transactionTypes: Customer['transactionType'][] = ['DEPOSIT', 'WITHDRAWAL', 'WIRE_TRANSFER'];
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const requestedAmount = Math.floor(Math.random() * 5000) + 100;
    
    const isFraud = Math.random() < 0.3;
    const fraudType = Math.floor(Math.random() * 4);
    
    const documents: Document[] = [
      {
        type: 'ID',
        title: 'Driver\'s License',
        data: {
          name: isFraud && fraudType === 1 ? name.replace('John', 'Jon') : name,
          licenseNumber: `DL-${Math.floor(10000 + Math.random() * 90000)}`,
          dateOfBirth: '1985-03-15',
          address: '123 Main Street, Springfield, IL 62701'
        }
      },
      {
        type: 'SLIP',
        title: transactionType === 'WIRE_TRANSFER' ? 'Wire Transfer Request' : 'Transaction Slip',
        data: {
          accountNumber: isFraud && fraudType === 3 ? (parseInt(accountNumber) - 50000).toString() : accountNumber,
          amount: requestedAmount,
          transactionType,
          destinationAccount: transactionType === 'WIRE_TRANSFER' ? Math.floor(100000000 + Math.random() * 900000000).toString() : '',
          date: new Date().toLocaleDateString()
        }
      },
      {
        type: 'SIGNATURE',
        title: 'Signature Card',
        data: {
          signature: isFraud && fraudType === 2 ? name.replace(/(\w+)/, '$1ie') : name
        }
      }
    ];

    return {
      name,
      accountNumber,
      transactionType,
      requestedAmount,
      documents,
      isFraud,
      fraudType
    };
  };

  const callCustomer = () => {
    const customer = generateCustomer();
    setCurrentCustomer(customer);
    playSound('printer');
    
    setTerminalOutput(prev => [
      ...prev,
      "",
      `> CUSTOMER CALLED: ${customer.name}`,
      `> TRANSACTION: ${customer.transactionType}`,
      `> AMOUNT: $${customer.requestedAmount.toLocaleString()}`
    ]);
  };

  const processTransaction = () => {
    if (!currentCustomer) return;
    
    playSound('printer');
    
    const hasNameMismatch = currentCustomer.documents.some(doc => 
      doc.data.name && doc.data.name !== currentCustomer.name
    );
    const hasAccountMismatch = currentCustomer.documents.some(doc => 
      doc.data.accountNumber && doc.data.accountNumber !== currentCustomer.accountNumber
    );
    
    const detectedFraud = hasNameMismatch || hasAccountMismatch;
    const correctDecision = detectedFraud === currentCustomer.isFraud;
    
    if (correctDecision) {
      setGameScore(prev => ({ 
        ...prev, 
        score: prev.score + 100, 
        correctTransactions: prev.correctTransactions + 1 
      }));
      setTerminalOutput(prev => [...prev, "", "✓ TRANSACTION APPROVED", "Score +100"]);
      playSound('success');
    } else {
      setGameScore(prev => ({ ...prev, errors: prev.errors + 1 }));
      setTerminalOutput(prev => [...prev, "", "✗ TRANSACTION ERROR", "Review required"]);
      playSound('error');
    }
    
    setTimeout(() => {
      setCurrentCustomer(null);
      setTerminalOutput(prev => [...prev, "", "Ready for next customer"]);
    }, 2000);
  };

  const startShift = () => {
    setGamePhase('working');
    playSound('printer');
  };

  if (gamePhase === 'punch_in') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001100 0%, #003300 50%, #001100 100%)',
        color: '#00ff00',
        fontFamily: 'Courier New, monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="mobile-panel" style={{
          background: 'rgba(0, 50, 0, 0.8)',
          border: '3px solid #00ff00',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
            🏦 FIRST NATIONAL BANK
          </h1>
          <h2 style={{ fontSize: '18px', marginBottom: '30px', color: '#ffff00' }}>
            TELLER WORKSTATION
          </h2>
          
          <div style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' }}>
            <div>Employee ID: T001</div>
            <div>Shift: Day Shift</div>
            <div>Time: {new Date().toLocaleTimeString()}</div>
          </div>
          
          <button 
            onClick={startShift}
            onTouchStart={() => playSound('keyboard')}
            className="mobile-button"
            style={{
              minHeight: '44px',
              padding: '12px 16px',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              border: '2px solid #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.2)',
              color: '#00ff00',
              borderRadius: '4px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              width: '100%'
            }}
          >
            🕐 PUNCH IN - START SHIFT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-responsive" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001100 0%, #003300 50%, #001100 100%)',
      color: '#00ff00',
      fontFamily: 'Courier New, monospace',
      padding: window.innerWidth < 768 ? '8px' : '20px'
    }}>
      
      <div className="mobile-panel" style={{
        background: 'rgba(0, 50, 0, 0.8)',
        border: '2px solid #00ff00',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>🏦 TELLER'S WINDOW</h1>
        <div style={{ fontSize: '14px', color: '#ffff00' }}>
          Score: {gameScore.score} | Transactions: {gameScore.correctTransactions} | Errors: {gameScore.errors}
        </div>
      </div>

      {!currentCustomer ? (
        <div className="mobile-panel" style={{
          background: 'rgba(0, 30, 0, 0.6)',
          border: '2px solid #888888',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#888888', margin: '0 0 16px 0' }}>NO CUSTOMER PRESENT</h2>
          <button 
            onClick={callCustomer}
            onTouchStart={() => playSound('keyboard')}
            className="mobile-button"
            style={{
              minHeight: '44px',
              padding: '12px 16px',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              border: '2px solid #00ff00',
              backgroundColor: 'rgba(0, 100, 0, 0.3)',
              color: '#00ff00',
              borderRadius: '4px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              width: '100%',
              marginBottom: '8px'
            }}
          >
            📞 CALL NEXT CUSTOMER
          </button>
        </div>
      ) : (
        <div className="mobile-panel mobile-scroll" style={{
          background: 'rgba(0, 60, 0, 0.8)',
          border: '3px solid #ffff00',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '12px'
        }}>
          <h2 style={{ color: '#ffff00', margin: '0 0 16px 0', textAlign: 'center' }}>
            📋 CUSTOMER: {currentCustomer.name}
          </h2>
          
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div><strong>Transaction:</strong> {currentCustomer.transactionType}</div>
            <div><strong>Amount:</strong> ${currentCustomer.requestedAmount.toLocaleString()}</div>
            <div><strong>Account:</strong> {currentCustomer.accountNumber}</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: '#ffff00', fontSize: '16px', marginBottom: '8px' }}>Documents:</h3>
            {currentCustomer.documents.map((doc, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 0, 0.1)',
                border: '1px solid #ffff00',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{doc.title}</div>
                {Object.entries(doc.data).map(([key, value]) => (
                  <div key={key} style={{ fontSize: '14px' }}>
                    <strong>{key}:</strong> {value}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button 
            onClick={processTransaction}
            onTouchStart={() => playSound('keyboard')}
            className="mobile-button"
            style={{
              minHeight: '44px',
              padding: '12px 16px',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              border: '2px solid #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.2)',
              color: '#00ff00',
              borderRadius: '4px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              width: '100%',
              marginBottom: '8px'
            }}
          >
            ✓ PROCESS TRANSACTION
          </button>
        </div>
      )}

      <div className="mobile-panel mobile-scroll" style={{
        background: 'rgba(0, 30, 0, 0.4)',
        border: '2px solid #00ff00',
        borderRadius: '4px',
        padding: '12px',
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#00ff00' }}>BANK TERMINAL</h3>
        {terminalOutput.map((line, index) => (
          <div key={index} style={{ marginBottom: '2px' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;