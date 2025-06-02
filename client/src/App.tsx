import React, { useState, useRef, useEffect } from 'react';
import { useMobileSound } from './hooks/useMobileSound';

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

interface Document {
  type: string;
  title: string;
  data: Record<string, string | number>;
}

function App() {
  const [gamePhase, setGamePhase] = useState<'punch_in' | 'working' | 'punch_out' | 'leaderboard'>('punch_in');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [gameScore, setGameScore] = useState({
    score: 0,
    correctTransactions: 0,
    errors: 0,
    timeOnShift: 0,
    consecutiveErrors: 0,
    errorDetails: [] as string[]
  });
  
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);
  
  // Verification workflow states
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    accountNotFound: false,
    signatureCompared: false,
    signatureFraud: false,
    transactionProcessed: false
  });
  
  const [currentStep, setCurrentStep] = useState<'lookup' | 'signature' | 'process' | 'approve'>('lookup');
  const [waitingForInput, setWaitingForInput] = useState<string>('');
  const [commandPrefix, setCommandPrefix] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [showFloatingInput, setShowFloatingInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [shiftStartTime, setShiftStartTime] = useState<number>(0);
  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean, 
    bankSignature: string,
    customerSignature: string
  }>({
    isOpen: false, 
    bankSignature: '',
    customerSignature: ''
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Mobile sound system with ASMR audio files
  const { playSound, isReady: soundReady, unlock: unlockAudio } = useMobileSound();
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Audio unlock handler for mobile browsers
  const handleFirstInteraction = () => {
    if (!audioUnlocked && soundReady) {
      unlockAudio();
      setAudioUnlocked(true);
      playSound('keyboard');
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
    
    // System records
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
    
    if (isFraud) {
      switch (fraudType) {
        case 0: // Name mismatch
          documentName = name.replace(/Sarah/g, 'Sara').replace(/Michael/g, 'Mike').replace(/Jennifer/g, 'Jenny');
          break;
        case 1: // Address mismatch
          documentAddress = "456 Oak Avenue, Springfield, IL 62702";
          break;
        case 2: // Signature mismatch
          documentSignature = name.split(' ')[0] + "nie " + name.split(' ')[name.split(' ').length - 1];
          break;
        case 3: // Account number mismatch
          documentAccountNumber = (parseInt(baseAccountNumber) - 50000).toString();
          break;
      }
    }

    const documents: Document[] = [
      {
        type: 'ID',
        title: 'Driver\'s License',
        data: {
          name: documentName,
          licenseNumber: `DL-${Math.floor(10000 + Math.random() * 90000)}`,
          dateOfBirth: documentDOB,
          address: documentAddress
        }
      },
      {
        type: 'SLIP',
        title: transactionType === 'WIRE_TRANSFER' ? 'Wire Transfer Request' : 'Transaction Slip',
        data: {
          accountNumber: documentAccountNumber,
          amount: requestedAmount,
          transactionType,
          destinationAccount: destinationAccount || '',
          date: new Date().toLocaleDateString()
        }
      },
      {
        type: 'SIGNATURE',
        title: 'Signature Card',
        data: {
          signature: documentSignature,
          accountNumber: systemAccountNumber
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

  const callCustomer = () => {
    const customer = generateCustomer();
    setCurrentCustomer(customer);
    setVerificationState({
      accountLookedUp: false,
      accountNotFound: false,
      signatureCompared: false,
      signatureFraud: false,
      transactionProcessed: false
    });
    setCurrentStep('lookup');
    setWaitingForInput('account_lookup');
    
    setTerminalOutput(prev => [
      ...prev,
      "",
      `> CUSTOMER ARRIVED: ${customer.name}`,
      `> TRANSACTION: ${customer.transactionType}`,
      `> AMOUNT: $${customer.requestedAmount.toLocaleString()}`,
      "",
      "Step 1: Look up customer account",
      "Type: LOOKUP [account_number]"
    ]);
    
    setCommandPrefix('LOOKUP ');
    setInputPrompt('Enter account number for lookup:');
    setShowFloatingInput(true);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    playSound('keyboard');
  };

  const processCommand = (input: string) => {
    if (!currentCustomer) return;
    
    const command = input.toUpperCase().trim();
    
    if (waitingForInput === 'account_lookup') {
      const accountNumber = command.replace('LOOKUP ', '').trim();
      
      if (accountNumber === currentCustomer.accountNumber) {
        // Successful lookup
        setAccountBalance(Math.floor(Math.random() * 50000) + 1000);
        setVerificationState(prev => ({ ...prev, accountLookedUp: true }));
        setTerminalOutput(prev => [
          ...prev,
          `> LOOKUP ${accountNumber}`,
          `✓ ACCOUNT FOUND`,
          `  Name: ${currentCustomer.name}`,
          `  Balance: $${accountBalance.toLocaleString()}`,
          `  Status: ACTIVE`,
          "",
          "Step 2: Compare signatures",
          "Type: SIGNATURE to open comparison"
        ]);
        setCurrentStep('signature');
        setWaitingForInput('signature_check');
        setCommandPrefix('SIGNATURE');
        setInputPrompt('Type SIGNATURE to compare signatures:');
        playSound('approve');
      } else {
        setTerminalOutput(prev => [
          ...prev,
          `> LOOKUP ${accountNumber}`,
          `✗ ACCOUNT NOT FOUND`,
          "Please verify account number"
        ]);
        playSound('reject');
      }
    } else if (waitingForInput === 'signature_check') {
      if (command === 'SIGNATURE') {
        // Open signature comparison modal
        const bankSig = currentCustomer.name.split(' ')[0] + " " + currentCustomer.name.split(' ')[currentCustomer.name.split(' ').length - 1];
        const customerSig = currentCustomer.documents.find(d => d.type === 'SIGNATURE')?.data.signature as string;
        
        setSignatureModal({
          isOpen: true,
          bankSignature: bankSig,
          customerSignature: customerSig
        });
        
        setTerminalOutput(prev => [
          ...prev,
          `> SIGNATURE COMPARISON OPENED`,
          "Compare bank signature with customer signature"
        ]);
      }
    } else if (waitingForInput === 'process_transaction') {
      if (command === 'PROCESS') {
        processTransaction();
      }
    }
    
    // Clear input
    setShowFloatingInput(false);
    setCommandPrefix('');
    setInputPrompt('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSignatureComparison = (isMatch: boolean) => {
    setSignatureModal({ isOpen: false, bankSignature: '', customerSignature: '' });
    
    if (isMatch) {
      setVerificationState(prev => ({ ...prev, signatureCompared: true }));
      setTerminalOutput(prev => [
        ...prev,
        `✓ SIGNATURES MATCH`,
        "",
        "Step 3: Process transaction",
        "Type: PROCESS to execute"
      ]);
      setCurrentStep('process');
      setWaitingForInput('process_transaction');
      setCommandPrefix('PROCESS');
      setInputPrompt('Type PROCESS to execute transaction:');
      setShowFloatingInput(true);
      playSound('approve');
    } else {
      setVerificationState(prev => ({ ...prev, signatureFraud: true }));
      setTerminalOutput(prev => [
        ...prev,
        `✗ SIGNATURE MISMATCH - FRAUD DETECTED`,
        "Transaction rejected - Call security"
      ]);
      
      // Handle fraud detection correctly
      if (currentCustomer.isFraud) {
        // Correct rejection of fraud
        setGameScore(prev => ({ 
          ...prev, 
          score: prev.score + 150, 
          correctTransactions: prev.correctTransactions + 1 
        }));
        setTerminalOutput(prev => [...prev, "✓ CORRECT FRAUD DETECTION +150 points"]);
      } else {
        // Incorrect rejection of legitimate customer
        setGameScore(prev => ({ ...prev, errors: prev.errors + 1 }));
        setTerminalOutput(prev => [...prev, "✗ FALSE FRAUD ALERT - Customer was legitimate"]);
      }
      
      setTimeout(() => {
        setCurrentCustomer(null);
        setTerminalOutput(prev => [...prev, "", "Ready for next customer"]);
      }, 3000);
      
      playSound('reject');
    }
  };

  const processTransaction = () => {
    if (!currentCustomer) return;
    
    playSound('printer');
    
    setVerificationState(prev => ({ ...prev, transactionProcessed: true }));
    
    // Generate receipt
    const receipt = {
      customerName: currentCustomer.name,
      accountNumber: currentCustomer.accountNumber,
      transactionType: currentCustomer.transactionType,
      amount: currentCustomer.requestedAmount,
      balance: accountBalance,
      date: new Date().toLocaleString(),
      destinationAccount: currentCustomer.destinationAccount
    };
    
    setReceiptData(receipt);
    setShowReceipt(true);
    
    setTerminalOutput(prev => [
      ...prev,
      `> PROCESSING ${currentCustomer.transactionType}...`,
      `✓ TRANSACTION COMPLETE`,
      `  Receipt #: ${Math.floor(Math.random() * 999999)}`,
      "Printing receipt..."
    ]);
    
    // Check if transaction was actually fraudulent
    setTimeout(() => {
      if (currentCustomer.isFraud) {
        // Approved fraudulent transaction - major error
        setGameScore(prev => ({ ...prev, errors: prev.errors + 2 }));
        setTerminalOutput(prev => [...prev, "", "⚠️ SECURITY ALERT: Fraudulent transaction approved", "Major compliance violation"]);
        playSound('reject');
      } else {
        // Correctly approved legitimate transaction
        setGameScore(prev => ({ 
          ...prev, 
          score: prev.score + 100, 
          correctTransactions: prev.correctTransactions + 1 
        }));
        setTerminalOutput(prev => [...prev, "✓ LEGITIMATE TRANSACTION +100 points"]);
        playSound('approve');
      }
      
      setShowReceipt(false);
      setReceiptData(null);
      setCurrentCustomer(null);
      setTerminalOutput(prev => [...prev, "", "Ready for next customer"]);
    }, 4000);
  };

  const startShift = () => {
    setGamePhase('working');
    setShiftStartTime(Date.now());
    playSound('printer');
    setTerminalOutput(prev => [
      ...prev,
      "",
      "🕐 SHIFT STARTED",
      "Welcome to your teller station",
      "",
      "Click 'Call Customer' to begin"
    ]);
  };

  const endShift = () => {
    playSound('printer');
    const timeWorked = Math.floor((Date.now() - shiftStartTime) / 1000);
    setGameScore(prev => ({ ...prev, timeOnShift: timeWorked }));
    
    if (gameScore.errors >= 5) {
      setGamePhase('punch_out');
    } else {
      setGamePhase('leaderboard');
    }
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
      
      {/* Header */}
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
        <button 
          onClick={endShift}
          style={{
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '12px',
            background: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid #ff0000',
            color: '#ff0000',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          END SHIFT
        </button>
      </div>

      {/* Customer Area */}
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
            {currentCustomer.destinationAccount && (
              <div><strong>To Account:</strong> {currentCustomer.destinationAccount}</div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: '#ffff00', fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>📄 Customer Documents:</h3>
            {currentCustomer.documents.map((doc, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 0, 0.15)',
                border: '2px solid #ffff00',
                borderRadius: '6px',
                padding: window.innerWidth < 768 ? '16px' : '12px',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(255, 255, 0, 0.3)'
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '8px', 
                  fontSize: window.innerWidth < 768 ? '16px' : '14px',
                  color: '#ffff00',
                  textAlign: 'center',
                  borderBottom: '1px solid #ffff00',
                  paddingBottom: '4px'
                }}>
                  📋 {doc.title}
                </div>
                {Object.entries(doc.data).map(([key, value]) => (
                  <div key={key} style={{ 
                    fontSize: window.innerWidth < 768 ? '15px' : '14px',
                    marginBottom: '6px',
                    padding: '4px 8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    display: 'flex',
                    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                    gap: window.innerWidth < 768 ? '2px' : '8px'
                  }}>
                    <span style={{ 
                      color: '#00dddd', 
                      fontWeight: 'bold',
                      minWidth: window.innerWidth < 768 ? 'auto' : '120px'
                    }}>
                      {key}:
                    </span>
                    <span style={{ color: '#ffffff' }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Verification Progress */}
          <div style={{ marginBottom: '16px', fontSize: '12px' }}>
            <div style={{ color: verificationState.accountLookedUp ? '#00ff00' : '#888888' }}>
              {verificationState.accountLookedUp ? '✓' : '○'} Account Lookup
            </div>
            <div style={{ color: verificationState.signatureCompared ? '#00ff00' : '#888888' }}>
              {verificationState.signatureCompared ? '✓' : '○'} Signature Verification
            </div>
            <div style={{ color: verificationState.transactionProcessed ? '#00ff00' : '#888888' }}>
              {verificationState.transactionProcessed ? '✓' : '○'} Transaction Processing
            </div>
          </div>
        </div>
      )}

      {/* Floating Input Panel */}
      {showFloatingInput && (
        <div className="mobile-panel" style={{
          background: 'rgba(0, 100, 0, 0.9)',
          border: '2px solid #ffff00',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '12px'
        }}>
          <div style={{ marginBottom: '8px', color: '#ffff00' }}>{inputPrompt}</div>
          <input
            ref={inputRef}
            type="text"
            placeholder={commandPrefix}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                processCommand(e.currentTarget.value);
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              background: '#001100',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={() => {
              if (inputRef.current) {
                processCommand(inputRef.current.value);
              }
            }}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              background: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            EXECUTE
          </button>
        </div>
      )}

      {/* Signature Comparison Modal */}
      {signatureModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          right: '10px',
          background: 'rgba(0, 80, 0, 0.95)',
          border: '3px solid #ffff00',
          borderRadius: '8px',
          padding: '20px',
          zIndex: 1000
        }}>
          <h3 style={{ color: '#ffff00', textAlign: 'center', marginBottom: '16px' }}>
            SIGNATURE COMPARISON
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', color: '#ffff00' }}>Bank Signature:</div>
            <div style={{
              background: '#001100',
              border: '1px solid #00ff00',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '18px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              {signatureModal.bankSignature}
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '8px', color: '#ffff00' }}>Customer Signature:</div>
            <div style={{
              background: '#001100',
              border: '1px solid #00ff00',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '18px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              {signatureModal.customerSignature}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleSignatureComparison(true)}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✓ SIGNATURES MATCH
            </button>
            <button
              onClick={() => handleSignatureComparison(false)}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '2px solid #ff0000',
                color: '#ff0000',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✗ FRAUD DETECTED
            </button>
          </div>
        </div>
      )}

      {/* Receipt Printer */}
      {showReceipt && receiptData && (
        <div className="mobile-panel" style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '2px solid #000000',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '12px',
          color: '#000000',
          fontFamily: 'monospace'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <strong>FIRST NATIONAL BANK</strong><br/>
            Transaction Receipt
          </div>
          <div style={{ fontSize: '12px' }}>
            Customer: {receiptData.customerName}<br/>
            Account: {receiptData.accountNumber}<br/>
            Type: {receiptData.transactionType}<br/>
            Amount: ${receiptData.amount.toLocaleString()}<br/>
            {receiptData.destinationAccount && (
              <>To Account: {receiptData.destinationAccount}<br/></>
            )}
            Balance: ${receiptData.balance.toLocaleString()}<br/>
            Date: {receiptData.date}<br/>
          </div>
        </div>
      )}

      {/* Terminal Output */}
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