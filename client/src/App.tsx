import React, { useState, useRef } from 'react';

interface Customer {
  name: string;
  accountNumber: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'WIRE_TRANSFER' | 'ACCOUNT_UPDATE' | 'INQUIRY';
  requestedAmount: number;
  destinationAccount?: string;
  documents: Document[];
  isFraud: boolean;
  fraudType: number;
}

interface GameScore {
  score: number;
  correctTransactions: number;
  errors: number;
  timeOnShift: number;
  consecutiveErrors: number;
  errorDetails: string[];
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

interface Document {
  type: string;
  title: string;
  data: Record<string, string | number>;
}

function App() {
  const [gamePhase, setGamePhase] = useState<'punch_in' | 'working' | 'punch_out' | 'leaderboard'>('punch_in');
  const [punchStatus, setPunchStatus] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);
  const [gameScore, setGameScore] = useState<GameScore>({
    score: 0,
    correctTransactions: 0,
    errors: 0,
    timeOnShift: 0,
    consecutiveErrors: 0,
    errorDetails: []
  });
  const [shiftStartTime, setShiftStartTime] = useState<number>(0);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [showManagerWarning, setShowManagerWarning] = useState(false);
  const [managerMessage, setManagerMessage] = useState('');
  const [showFiredAnimation, setShowFiredAnimation] = useState(false);
  
  // Verification state
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    accountNotFound: false,
    signatureCompared: false,
    signatureFraud: false,
    transactionProcessed: false
  });
  
  // UI state
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean, 
    bankSignature: string,
    customerSignature: string
  }>({
    isOpen: false, 
    bankSignature: '',
    customerSignature: ''
  });
  const [currentStep, setCurrentStep] = useState<'lookup' | 'signature' | 'process' | 'approve'>('lookup');
  const [waitingForInput, setWaitingForInput] = useState<string>('');
  const [commandPrefix, setCommandPrefix] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [showBalanceWindow, setShowBalanceWindow] = useState(false);
  const [showFloatingInput, setShowFloatingInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [cardPosition, setCardPosition] = useState({ x: 50, y: 400 });
  const [cardInSlot, setCardInSlot] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [showArrestAnimation, setShowArrestAnimation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enhanced verification system that checks all transaction requirements
  const validateTransaction = (): { isValid: boolean; errors: string[] } => {
    if (!currentCustomer) return { isValid: false, errors: ['No customer present'] };
    
    const errors: string[] = [];
    const customer = currentCustomer;
    
    // Check if account lookup was performed
    if (!verificationState.accountLookedUp) {
      errors.push('Account not looked up in system');
    }
    
    // Check if account exists in system
    if (verificationState.accountNotFound) {
      errors.push('Account does not exist in bank system');
    }
    
    // Check signature verification
    if (!verificationState.signatureCompared) {
      errors.push('Signature not verified');
    }
    
    if (verificationState.signatureFraud) {
      errors.push('Signature does not match bank records');
    }
    
    // Verify document consistency
    const idDoc = customer.documents.find(d => d.type === 'ID');
    const slipDoc = customer.documents.find(d => d.type === 'SLIP');
    const sigDoc = customer.documents.find(d => d.type === 'SIGNATURE');
    
    if (!idDoc || !slipDoc || !sigDoc) {
      errors.push('Missing required documents');
    } else {
      // Check name consistency
      if (idDoc.data.name !== customer.name) {
        errors.push('ID name does not match customer');
      }
      
      // Check account number consistency
      if (slipDoc.data.accountNumber !== customer.accountNumber) {
        errors.push('Account number mismatch on transaction slip');
      }
      
      // Check transaction amount
      if (customer.transactionType !== 'INQUIRY' && slipDoc.data.amount !== customer.requestedAmount) {
        errors.push('Transaction amount mismatch');
      }
      
      // Check wire transfer destination
      if (customer.transactionType === 'WIRE_TRANSFER') {
        if (!customer.destinationAccount || slipDoc.data.destinationAccount !== customer.destinationAccount) {
          errors.push('Wire transfer destination account mismatch');
        }
      }
      
      // Check signature consistency
      if (sigDoc.data.signature !== customer.name.split(' ')[0] + " " + customer.name.split(' ')[customer.name.split(' ').length - 1]) {
        errors.push('Signature format inconsistent');
      }
    }
    
    // Check for fraud indicators
    if (customer.isFraud) {
      switch (customer.fraudType) {
        case 0:
          errors.push('Date of birth inconsistency detected');
          break;
        case 1:
          errors.push('Address mismatch with bank records');
          break;
        case 2:
          errors.push('Signature forgery detected');
          break;
        case 3:
          errors.push('Account number tampering detected');
          break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Award points for correct transaction
  const addCorrectTransaction = () => {
    setGameScore(prev => ({
      ...prev,
      score: prev.score + 100,
      correctTransactions: prev.correctTransactions + 1,
      consecutiveErrors: 0
    }));
    
    setTerminalOutput(prev => [...prev, 
      "",
      "> TRANSACTION APPROVED +100 POINTS",
      "Excellent verification work!"
    ]);
  };

  // Handle transaction errors with manager warnings
  const handleTransactionError = (errorType: string) => {
    setGameScore(prev => {
      const newErrors = prev.errors + 1;
      const newConsecutiveErrors = prev.consecutiveErrors + 1;
      const newErrorDetails = [...prev.errorDetails, errorType];
      
      // Show manager warning on 3 consecutive errors or every error after that
      if (newConsecutiveErrors >= 3) {
        const remainingWarnings = 3 - Math.floor(newConsecutiveErrors / 3);
        
        if (remainingWarnings <= 0) {
          // Fire the employee
          setShowFiredAnimation(true);
          return prev;
        }
        
        setManagerMessage(`⚠️ BANK MANAGER NOTIFICATION ⚠️

Employee Warning #${Math.floor(newConsecutiveErrors / 3)}

Consecutive errors detected: ${newConsecutiveErrors}

Recent violations:
• ${newErrorDetails.slice(-3).join('\n• ')}

Warnings remaining: ${remainingWarnings}

Please review bank verification procedures carefully.
Failure to improve performance will result in termination.

- Bank Management`);
        setShowManagerWarning(true);
        playSound('reject');
      }
      
      return {
        ...prev,
        errors: newErrors,
        consecutiveErrors: newConsecutiveErrors,
        errorDetails: newErrorDetails
      };
    });
    
    setTerminalOutput(prev => [...prev, 
      "",
      "> TRANSACTION ERROR",
      `Error: ${errorType}`,
      "Please review procedures"
    ]);
  };

  // Enhanced transaction processing
  const handleCorrectTransaction = () => {
    const validation = validateTransaction();
    
    if (validation.isValid) {
      addCorrectTransaction();
    } else {
      validation.errors.forEach(error => {
        handleTransactionError(error);
      });
    }
  };

  const generateCustomer = (): Customer => {
    const names = ["Sarah L. Williams", "Michael Johnson", "Jennifer Rodriguez", "David Chen", "Emily Davis", "Robert Thompson", "Lisa Parker", "James Wilson", "Amanda Davis", "Christopher Lee"];
    const transactionTypes: Customer['transactionType'][] = ["DEPOSIT", "WITHDRAWAL", "WIRE_TRANSFER", "INQUIRY"];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const baseAccountNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const requestedAmount = transactionType === 'INQUIRY' ? 0 : Math.floor(100 + Math.random() * 5000);
    const destinationAccount = transactionType === 'WIRE_TRANSFER' ? Math.floor(100000000 + Math.random() * 900000000).toString() : undefined;
    
    // 30% chance of fraud with subtle differences
    const isFraud = Math.random() < 0.3;
    const fraudType = Math.floor(Math.random() * 4);
    
    // System records (what should be correct)
    const systemName = name;
    const systemAccountNumber = baseAccountNumber;
    const systemDOB = "1985-03-15";
    const systemAddress = "123 Main Street, Springfield, IL 62701";
    const systemSignature = name.split(' ')[0] + " " + name.split(' ')[name.split(' ').length - 1];
    
    // Document data (potentially fraudulent)
    let documentName = systemName;
    let documentAccountNumber = systemAccountNumber;
    let documentDOB = systemDOB;
    let documentAddress = systemAddress;
    let documentSignature = systemSignature;
    
    // Introduce subtle fraud differences
    if (isFraud) {
      switch (fraudType) {
        case 0: // DOB fraud
          documentDOB = "1985-02-15";
          break;
        case 1: // Address fraud
          documentAddress = "123 Main Street, Springfield, IN 62701";
          break;
        case 2: // Signature fraud
          documentSignature = name.split(' ')[0] + " Smith";
          break;
        case 3: // Account fraud
          documentAccountNumber = (parseInt(baseAccountNumber) + 1).toString();
          break;
      }
    }
    
    const documents: Document[] = [
      {
        type: "ID",
        title: "Driver's License",
        data: {
          name: documentName,
          licenseNumber: `DL-${Math.floor(10000 + Math.random() * 90000)}`,
          dateOfBirth: documentDOB,
          address: documentAddress
        }
      },
      {
        type: "SLIP",
        title: transactionType === 'WIRE_TRANSFER' ? 'Wire Transfer Request' : 
               transactionType === 'INQUIRY' ? 'Balance Inquiry Form' : 'Transaction Slip',
        data: {
          accountNumber: documentAccountNumber,
          amount: requestedAmount,
          transactionType: transactionType,
          destinationAccount: destinationAccount || "",
          date: new Date().toLocaleDateString()
        }
      },
      {
        type: "SIGNATURE",
        title: "Signature Card",
        data: {
          signature: documentSignature
        }
      }
    ];
    
    return {
      name: systemName,
      accountNumber: systemAccountNumber,
      transactionType,
      requestedAmount,
      destinationAccount,
      documents,
      isFraud,
      fraudType
    };
  };

  const playSound = (soundType: string) => {
    // Create Web Audio context for retro sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createTone = (frequency: number, duration: number, volume: number = 0.1) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    const createNoise = (volume: number = 0.1, duration: number = 0.1) => {
      const bufferSize = 4096;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      
      const gainNode = audioContext.createGain();
      whiteNoise.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      whiteNoise.start(audioContext.currentTime);
      whiteNoise.stop(audioContext.currentTime + duration);
    };

    switch (soundType) {
      case 'button_click':
        createTone(800, 0.1);
        break;
      case 'accept':
        createTone(1200, 0.15);
        setTimeout(() => createTone(1600, 0.1), 150);
        break;
      case 'reject':
        createTone(400, 0.3);
        setTimeout(() => createTone(300, 0.2), 300);
        break;
      case 'type_key':
        createTone(1000 + Math.random() * 200, 0.05, 0.03);
        break;
      case 'paper_rustle':
        createNoise(0.2, 0.04);
        break;
      case 'dot_matrix_printer':
        // Enhanced ASMR dot matrix printer with authentic mechanical sounds - shortened
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            // Main printer head impact
            createTone(1600 + (i % 4) * 150, 0.025, 0.04);
            createTone(1200 + (i % 3) * 100, 0.015, 0.03);
            // Mechanical noise and paper feed
            createNoise(0.018, 0.025);
            // Carriage movement
            if (i % 4 === 0) createTone(800, 0.008, 0.02);
          }, i * 50);
        }
        // Paper tear sound at the end
        setTimeout(() => {
          createNoise(0.15, 0.08);
          createTone(400, 0.06, 0.04);
          setTimeout(() => createNoise(0.08, 0.05), 60);
        }, 10 * 50 + 150);
        break;
      case 'police_radio':
        // Authentic police radio dispatch sound with static
        // Radio static burst
        createNoise(0.4, 0.15);
        setTimeout(() => createNoise(0.2, 0.1), 150);
        
        // Radio beep
        setTimeout(() => createTone(800, 0.2, 0.05), 300);
        
        // Static crackle
        setTimeout(() => {
          for (let i = 0; i < 8; i++) {
            setTimeout(() => createNoise(0.15, 0.03), i * 40);
          }
        }, 500);
        
        // Deep radio voice frequency simulation
        setTimeout(() => {
          createTone(180, 0.8, 0.08);
          createTone(220, 0.6, 0.06);
          createTone(160, 0.4, 0.04);
        }, 800);
        
        // Radio squelch at end
        setTimeout(() => {
          createTone(1200, 0.15, 0.04);
          createNoise(0.3, 0.08);
        }, 1600);
        break;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#00ff00',
      fontFamily: 'Courier New, monospace',
      padding: '50px 10px 10px 10px',
      background: 'radial-gradient(circle, #001100 0%, #000000 100%)',
    }}>
      
      {/* Score and Warnings Display */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        right: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #00ff00',
        padding: '8px 16px',
        fontSize: '16px',
        fontWeight: 'bold',
        zIndex: 1000
      }}>
        <div style={{ color: '#00ff00' }}>
          SCORE: {gameScore.score.toLocaleString()}
        </div>
        <div style={{ color: gameScore.consecutiveErrors >= 6 ? '#ff0000' : gameScore.consecutiveErrors >= 3 ? '#ffaa00' : '#00ff00' }}>
          WARNINGS: {Math.floor(gameScore.consecutiveErrors / 3)}/3
        </div>
      </div>

      {gamePhase === 'punch_in' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '20px',
            color: '#00ff00',
            textShadow: '0 0 10px #00ff00'
          }}>
            🏦 FIRST NATIONAL BANK 🏦
          </div>
          
          <div style={{
            fontSize: '20px',
            marginBottom: '30px',
            color: '#88ff88'
          }}>
            TELLER'S WINDOW FRAUD DETECTION SYSTEM
          </div>
          
          <div style={{
            border: '2px solid #00ff00',
            padding: '30px',
            borderRadius: '10px',
            background: 'rgba(0, 255, 0, 0.1)',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '20px' }}>
              PUNCH IN TO START SHIFT
            </div>
            
            <button
              onClick={() => {
                setShiftStartTime(Date.now());
                setGamePhase('working');
                setPunchStatus('Punched in at ' + new Date().toLocaleTimeString());
                playSound('accept');
              }}
              style={{
                background: 'rgba(0, 255, 0, 0.2)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '5px',
                fontFamily: 'monospace'
              }}
            >
              🕐 PUNCH IN
            </button>
            
            {punchStatus && (
              <div style={{ marginTop: '20px', fontSize: '14px', color: '#88ff88' }}>
                {punchStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {gamePhase === 'working' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr)',
          gap: '20px',
          height: 'calc(100vh - 80px)',
          '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr',
            height: 'auto'
          }
        }}>
          {/* Left Panel - Customer Documents */}
          <div style={{
            border: '2px solid #00ff00',
            borderRadius: '8px',
            padding: '16px',
            background: 'rgba(0, 50, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px',
              color: '#00ff00',
              textAlign: 'center'
            }}>
              CUSTOMER DOCUMENTS
            </h3>
            
            {currentCustomer ? (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ 
                  marginBottom: '16px',
                  padding: '12px',
                  border: '1px solid #00aa00',
                  borderRadius: '4px',
                  background: 'rgba(0, 100, 0, 0.1)'
                }}>
                  <strong style={{ fontSize: '16px' }}>Customer: {currentCustomer.name}</strong><br/>
                  <span style={{ fontSize: '14px' }}>Transaction: {currentCustomer.transactionType}</span><br/>
                  {currentCustomer.requestedAmount > 0 && (
                    <span style={{ fontSize: '14px' }}>Amount: ${currentCustomer.requestedAmount.toLocaleString()}</span>
                  )}
                  {currentCustomer.destinationAccount && (
                    <>
                      <br/>
                      <span style={{ fontSize: '14px' }}>To Account: {currentCustomer.destinationAccount}</span>
                    </>
                  )}
                </div>
                
                {currentCustomer.documents.map((doc, index) => (
                  <div 
                    key={index}
                    style={{
                      border: selectedDocument === index ? '2px solid #ffff00' : '1px solid #00aa00',
                      borderRadius: '6px',
                      padding: '14px',
                      marginBottom: '12px',
                      background: selectedDocument === index ? 'rgba(255, 255, 0, 0.1)' : 'rgba(0, 100, 0, 0.1)',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      setSelectedDocument(selectedDocument === index ? null : index);
                      playSound('paper_rustle');
                    }}
                  >
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '8px',
                      color: '#00ff00',
                      fontSize: '16px'
                    }}>
                      📄 {doc.title}
                    </div>
                    
                    {Object.entries(doc.data).map(([key, value]) => (
                      <div key={key} style={{ 
                        marginBottom: '4px',
                        fontSize: '14px',
                        letterSpacing: '0.5px'
                      }}>
                        <strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888888',
                fontSize: '16px'
              }}>
                No customer at window
              </div>
            )}
          </div>

          {/* Right Panel - Terminal and Controls */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Bank System Records */}
            <div style={{
              border: '2px solid #00ff00',
              borderRadius: '8px',
              background: 'rgba(0, 50, 0, 0.3)'
            }}>
              <div 
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  borderBottom: showBankInfo ? '1px solid #00aa00' : 'none',
                  background: 'rgba(0, 100, 0, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => setShowBankInfo(!showBankInfo)}
              >
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  🏛️ BANK SYSTEM RECORDS
                </span>
                <span style={{ fontSize: '14px' }}>
                  {showBankInfo ? '▼' : '▶'}
                </span>
              </div>
              
              {showBankInfo && currentCustomer && (
                <div style={{ padding: '16px', fontSize: '15px', lineHeight: '1.6' }}>
                  <div><strong>Account Holder:</strong> {currentCustomer.name}</div>
                  <div><strong>Account Number:</strong> {currentCustomer.accountNumber}</div>
                  <div><strong>Date of Birth:</strong> 1985-03-15</div>
                  <div><strong>Address:</strong> 123 Main Street, Springfield, IL 62701</div>
                  <div><strong>License Number:</strong> DL-{Math.floor(10000 + Math.random() * 90000)}</div>
                  <div><strong>Account Status:</strong> <span style={{ color: '#00ff00' }}>ACTIVE</span></div>
                  <div><strong>Balance:</strong> ${(Math.floor(1000 + Math.random() * 50000)).toLocaleString()}</div>
                  <div><strong>Signature on File:</strong> {currentCustomer.name.split(' ')[0]} {currentCustomer.name.split(' ')[currentCustomer.name.split(' ').length - 1]}</div>
                </div>
              )}
              
              {showBankInfo && !currentCustomer && (
                <div style={{ 
                  padding: '16px', 
                  fontSize: '15px', 
                  color: '#888888', 
                  textAlign: 'center' 
                }}>
                  No customer selected for lookup
                </div>
              )}
            </div>

            {/* Terminal Output */}
            <div style={{
              border: '2px solid #00ff00',
              borderRadius: '8px',
              background: 'rgba(0, 50, 0, 0.3)',
              padding: '16px',
              flex: 1,
              minHeight: '200px'
            }}>
              <div style={{
                height: '150px',
                overflow: 'auto',
                marginBottom: '12px',
                fontSize: '15px',
                fontFamily: 'monospace',
                lineHeight: '1.5',
                color: '#00ff00'
              }}>
                {terminalOutput.map((line, index) => (
                  <div key={index} style={{ 
                    marginBottom: '3px',
                    color: line.includes('ERROR') || line.includes('WARNING') ? '#ff0000' : '#00ff00'
                  }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Control Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <button
                onClick={() => {
                  // Always call next customer
                  setCurrentCustomer(generateCustomer());
                  setVerificationState({
                    accountLookedUp: false,
                    accountNotFound: false,
                    signatureCompared: false,
                    signatureFraud: false,
                    transactionProcessed: false
                  });
                  setTerminalOutput(prev => [...prev, 
                    "",
                    "> Customer approaching teller window",
                    "Ready to process transaction"
                  ]);
                  playSound('button_click');
                }}
                style={{
                  background: 'rgba(0, 100, 0, 0.6)',
                  border: '2px solid #00ff00',
                  color: '#00ff00',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                CALL CUSTOMER
              </button>
              
              {/* REPORT FRAUD Button */}
              {currentCustomer && (
                <button
                  onClick={() => {
                    playSound('police_radio');
                    setTerminalOutput(prev => [...prev, 
                      "> FRAUD ALERT ACTIVATED",
                      "*** CALLING BANK SECURITY ***",
                      "Radio dispatch: Units responding...",
                      "Customer being detained for investigation"
                    ]);
                    
                    // Start arrest animation sequence
                    setTimeout(() => {
                      setShowArrestAnimation(true);
                      
                      // Close animation and proceed to next customer
                      setTimeout(() => {
                        setShowArrestAnimation(false);
                        handleCorrectTransaction();
                        
                        // Generate next customer after brief pause
                        setTimeout(() => {
                          setCurrentCustomer(generateCustomer());
                          setVerificationState({
                            accountLookedUp: false,
                            accountNotFound: false,
                            signatureCompared: false,
                            signatureFraud: false,
                            transactionProcessed: false
                          });
                          setTerminalOutput(prev => [...prev, 
                            "",
                            "> Next customer approaching...",
                            "Ready to process transaction"
                          ]);
                        }, 1000);
                      }, 4000);
                    }, 2000);
                  }}
                  style={{
                    background: 'rgba(150, 0, 0, 0.8)',
                    border: '3px solid #ff0000',
                    color: '#ff0000',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    textShadow: '0 0 10px #ff0000',
                    boxShadow: '0 0 15px rgba(255, 0, 0, 0.3)'
                  }}
                >
                  🚨 REPORT FRAUD
                </button>
              )}
              
              <button
                onClick={() => {
                  if (currentCustomer) {
                    const validation = validateTransaction();
                    if (validation.isValid) {
                      addCorrectTransaction();
                      playSound('accept');
                      playSound('dot_matrix_printer');
                    } else {
                      validation.errors.forEach(error => handleTransactionError(error));
                      playSound('reject');
                    }
                  }
                }}
                disabled={!currentCustomer}
                style={{
                  background: currentCustomer ? 'rgba(0, 100, 0, 0.6)' : 'rgba(50, 50, 50, 0.6)',
                  border: '2px solid #00ff00',
                  color: currentCustomer ? '#00ff00' : '#666666',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: currentCustomer ? 'pointer' : 'not-allowed',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                ✅ APPROVE TRANSACTION
              </button>
              
              <button
                onClick={() => {
                  if (currentCustomer) {
                    handleTransactionError('Transaction rejected by teller');
                    playSound('reject');
                  }
                }}
                disabled={!currentCustomer}
                style={{
                  background: currentCustomer ? 'rgba(100, 0, 0, 0.6)' : 'rgba(50, 50, 50, 0.6)',
                  border: '2px solid #ff0000',
                  color: currentCustomer ? '#ff0000' : '#666666',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: currentCustomer ? 'pointer' : 'not-allowed',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                ❌ REJECT TRANSACTION
              </button>
            </div>

            {/* Verification Actions */}
            <div style={{
              border: '2px solid #00aa00',
              borderRadius: '6px',
              padding: '12px',
              background: 'rgba(0, 50, 0, 0.2)'
            }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#00ff00'
              }}>
                VERIFICATION ACTIONS:
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '6px'
              }}>
                <button
                  onClick={() => {
                    if (currentCustomer) {
                      setVerificationState(prev => ({ ...prev, accountLookedUp: true }));
                      setTerminalOutput(prev => [...prev, "> Account lookup completed"]);
                      playSound('type_key');
                    }
                  }}
                  disabled={!currentCustomer || verificationState.accountLookedUp}
                  style={{
                    background: verificationState.accountLookedUp ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 50, 0, 0.6)',
                    border: '1px solid #00ff00',
                    color: verificationState.accountLookedUp ? '#88ff88' : '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: (!currentCustomer || verificationState.accountLookedUp) ? 'not-allowed' : 'pointer',
                    borderRadius: '3px',
                    fontFamily: 'monospace'
                  }}
                >
                  {verificationState.accountLookedUp ? '✓' : ''} LOOKUP ACCOUNT
                </button>
                
                <button
                  onClick={() => {
                    if (currentCustomer) {
                      setVerificationState(prev => ({ ...prev, signatureCompared: true }));
                      setTerminalOutput(prev => [...prev, "> Signature verification completed"]);
                      playSound('type_key');
                    }
                  }}
                  disabled={!currentCustomer || verificationState.signatureCompared}
                  style={{
                    background: verificationState.signatureCompared ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 50, 0, 0.6)',
                    border: '1px solid #00ff00',
                    color: verificationState.signatureCompared ? '#88ff88' : '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: (!currentCustomer || verificationState.signatureCompared) ? 'not-allowed' : 'pointer',
                    borderRadius: '3px',
                    fontFamily: 'monospace'
                  }}
                >
                  {verificationState.signatureCompared ? '✓' : ''} VERIFY SIGNATURE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Warning Modal */}
      {showManagerWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a0000 0%, #4a0000 50%, #1a0000 100%)',
            border: '4px solid #ff0000',
            borderRadius: '12px',
            padding: '32px',
            minWidth: '500px',
            maxWidth: '90vw',
            boxShadow: '0 0 30px rgba(255, 0, 0, 0.5)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '16px'
              }}>⚠️</div>
              
              <div style={{
                color: '#ff0000',
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '20px',
                textShadow: '0 0 10px #ff0000'
              }}>
                MANAGER WARNING
              </div>
              
              <div style={{
                color: '#ffcccc',
                fontSize: '16px',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                textAlign: 'left',
                marginBottom: '24px',
                fontFamily: 'monospace'
              }}>
                {managerMessage}
              </div>
              
              <button
                onClick={() => {
                  setShowManagerWarning(false);
                  playSound('button_click');
                }}
                style={{
                  background: 'rgba(255, 0, 0, 0.3)',
                  border: '2px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}
              >
                ACKNOWLEDGED
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fired Animation */}
      {showFiredAnimation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#000000',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000,
          animation: 'fadeInArrest 0.5s ease-in-out',
          fontFamily: 'monospace'
        }}>
          {/* CRT Scanlines */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 0, 0.03) 2px, rgba(255, 0, 0, 0.03) 4px)',
            pointerEvents: 'none'
          }} />
          
          <div style={{
            textAlign: 'center',
            color: '#ff0000',
            maxWidth: '600px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '30px',
              animation: 'errorPulse 1s infinite',
              textShadow: '0 0 20px #ff0000'
            }}>
              🚫 TERMINATED 🚫
            </div>
            
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              border: '3px solid #ff0000',
              padding: '20px',
              background: 'rgba(255, 0, 0, 0.1)'
            }}>
              EMPLOYMENT TERMINATED
            </div>
            
            <div style={{
              fontSize: '18px',
              lineHeight: '1.6',
              marginBottom: '30px',
              color: '#ffaaaa'
            }}>
              Due to excessive verification errors,<br/>
              your employment with First National Bank<br/>
              has been terminated effective immediately.
            </div>
            
            <div style={{
              fontSize: '16px',
              marginBottom: '30px',
              color: '#ff6666'
            }}>
              Final Score: {gameScore.score.toLocaleString()}<br/>
              Errors: {gameScore.errors}
            </div>
            
            <button
              onClick={() => {
                // Reset game
                setShowFiredAnimation(false);
                setGamePhase('punch_in');
                setGameScore({
                  score: 0,
                  correctTransactions: 0,
                  errors: 0,
                  timeOnShift: 0,
                  consecutiveErrors: 0,
                  errorDetails: []
                });
                setCurrentCustomer(null);
                setTerminalOutput([
                  "FIRST NATIONAL BANK SYSTEM v2.1",
                  "TELLER AUTHENTICATION: APPROVED",
                  "",
                  "Ready for customer service"
                ]);
                playSound('button_click');
              }}
              style={{
                background: 'rgba(255, 0, 0, 0.3)',
                border: '2px solid #ff0000',
                color: '#ff0000',
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '5px',
                fontFamily: 'monospace'
              }}
            >
              START NEW SHIFT
            </button>
          </div>
        </div>
      )}

      {/* Arrest Animation Sequence */}
      {showArrestAnimation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#000000',
          zIndex: 3000,
          animation: 'fadeInArrest 0.5s ease-in-out',
          fontFamily: 'monospace'
        }}>
          {/* CRT Scanlines */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
            pointerEvents: 'none'
          }} />
          
          {/* Bank Scene with Arrest Animation */}
          <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            background: 'linear-gradient(180deg, #001100 0%, #002200 100%)',
            overflow: 'hidden'
          }}>
            {/* Bank Floor */}
            <div style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
              right: '0px',
              height: '60px',
              background: 'linear-gradient(180deg, #003300 0%, #001100 100%)',
              border: '2px solid #00ff00',
              borderBottom: 'none'
            }} />
            
            {/* Teller Counter */}
            <div style={{
              position: 'absolute',
              bottom: '60px',
              left: '50px',
              width: '250px',
              height: '80px',
              background: 'linear-gradient(180deg, #004400 0%, #002200 100%)',
              border: '2px solid #00ff00'
            }} />
            
            {/* Customer Being Arrested */}
            <div style={{
              position: 'absolute',
              bottom: '140px',
              left: '400px',
              fontSize: '60px',
              color: '#ffaa00',
              animation: 'customerArrest 4s linear forwards'
            }}>
              🧑‍💼
            </div>
            
            {/* Police Officer 1 */}
            <div style={{
              position: 'absolute',
              bottom: '140px',
              right: '200px',
              fontSize: '60px',
              color: '#0088ff',
              animation: 'officer1Approach 2s linear forwards'
            }}>
              👮‍♂️
            </div>
            
            {/* Police Officer 2 */}
            <div style={{
              position: 'absolute',
              bottom: '140px',
              right: '600px',
              fontSize: '60px',
              color: '#0088ff',
              animation: 'officer2Approach 2.5s linear forwards'
            }}>
              👮‍♀️
            </div>
            
            {/* Handcuffs Animation */}
            <div style={{
              position: 'absolute',
              bottom: '180px',
              left: '420px',
              fontSize: '30px',
              color: '#cccccc',
              animation: 'handcuffsApply 6s linear forwards',
              opacity: 0
            }}>
              🔗
            </div>
            
            {/* Police Car Outside */}
            <div style={{
              position: 'absolute',
              bottom: '140px',
              right: '-200px',
              fontSize: '40px',
              color: '#0066cc',
              animation: 'policeCarArrive 1.5s linear forwards'
            }}>
              🚔
            </div>
            
            {/* Arrest Text Sequence */}
            <div style={{
              position: 'absolute',
              top: '50px',
              left: '50px',
              color: '#ff0000',
              fontSize: '18px',
              fontWeight: 'bold',
              animation: 'arrestDialog 6s linear forwards'
            }}>
              <div style={{ animation: 'textStep1 6s linear forwards' }}>
                "You're under arrest for attempted fraud"
              </div>
              <div style={{ animation: 'textStep2 6s linear forwards', animationDelay: '2s' }}>
                "You have the right to remain silent"
              </div>
              <div style={{ animation: 'textStep3 6s linear forwards', animationDelay: '4s' }}>
                "Customer escorted to police vehicle"
              </div>
            </div>
            
            {/* Success Message */}
            <div style={{
              position: 'absolute',
              bottom: '50px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#00ff00',
              fontSize: '24px',
              fontWeight: 'bold',
              textAlign: 'center',
              animation: 'finalMessage 6s linear forwards',
              opacity: 0
            }}>
              FRAUD SUSPECT ARRESTED<br/>
              EXCELLENT DETECTIVE WORK
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0px);
            opacity: 1;
          }
        }
        
        @keyframes fadeInArrest {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes customerArrest {
          0% { transform: translateX(0px) rotate(0deg); }
          25% { transform: translateX(-10px) rotate(-5deg); }
          50% { transform: translateX(-20px) rotate(-10deg); }
          75% { transform: translateX(-30px) rotate(-15deg); }
          100% { transform: translateX(-40px) rotate(-20deg); }
        }
        
        @keyframes officer1Approach {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-150px); }
        }
        
        @keyframes officer2Approach {
          0% { transform: translateX(0px); }
          100% { transform: translateX(400px); }
        }
        
        @keyframes handcuffsApply {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 0; transform: scale(0); }
          60% { opacity: 1; transform: scale(1.5) rotate(180deg); }
          100% { opacity: 1; transform: scale(1) rotate(360deg); }
        }
        
        @keyframes policeCarArrive {
          0% { transform: translateX(0px); }
          100% { transform: translateX(150px); }
        }
        
        @keyframes textStep1 {
          0% { opacity: 0; }
          10% { opacity: 1; }
          30% { opacity: 1; }
          35% { opacity: 0; }
          100% { opacity: 0; }
        }
        
        @keyframes textStep2 {
          0% { opacity: 0; }
          35% { opacity: 0; }
          40% { opacity: 1; }
          65% { opacity: 1; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        
        @keyframes textStep3 {
          0% { opacity: 0; }
          70% { opacity: 0; }
          75% { opacity: 1; }
          100% { opacity: 1; }
        }
        
        @keyframes finalMessage {
          0% { opacity: 0; }
          80% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes errorPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default App;