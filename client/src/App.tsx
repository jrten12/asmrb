import React, { useState, useRef } from 'react';
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

  const { playSound, isReady: soundReady, unlock: unlockAudio } = useMobileSound();
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const handleFirstInteraction = () => {
    if (!audioUnlocked && soundReady) {
      unlockAudio();
      setAudioUnlocked(true);
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
    
    const isFraud = Math.random() < 0.3;
    const fraudType = Math.floor(Math.random() * 4);
    
    const systemName = name;
    const systemAccountNumber = baseAccountNumber;
    const systemDOB = "1985-03-15";
    const systemAddress = "123 Main Street, Springfield, IL 62701";
    const systemSignature = name.split(' ')[0] + " " + name.split(' ')[name.split(' ').length - 1];
    
    let documentName = systemName;
    let documentAccountNumber = systemAccountNumber;
    let documentDOB = systemDOB;
    let documentAddress = systemAddress;
    let documentSignature = systemSignature;
    
    if (isFraud) {
      switch (fraudType) {
        case 0:
          documentName = name.replace(/Sarah/g, 'Sara').replace(/Michael/g, 'Mike').replace(/Jennifer/g, 'Jenny');
          break;
        case 1:
          documentAddress = "456 Oak Avenue, Springfield, IL 62702";
          break;
        case 2:
          documentSignature = name.split(' ')[0] + "nie " + name.split(' ')[name.split(' ').length - 1];
          break;
        case 3:
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
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    handleFirstInteraction();
    playSound('paper_rustle');
  };

  const processCommand = (input: string) => {
    if (!currentCustomer) return;
    
    const command = input.toUpperCase().trim();
    
    if (waitingForInput === 'account_lookup') {
      const accountNumber = command.replace('LOOKUP ', '').trim();
      
      if (accountNumber === currentCustomer.accountNumber) {
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
        playSound('error');
      }
    } else if (waitingForInput === 'signature_check') {
      if (command === 'SIGNATURE') {
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
      
      if (currentCustomer && currentCustomer.isFraud) {
        setGameScore(prev => ({ 
          ...prev, 
          score: prev.score + 150, 
          correctTransactions: prev.correctTransactions + 1 
        }));
        setTerminalOutput(prev => [...prev, "✓ CORRECT FRAUD DETECTION +150 points"]);
      } else {
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
    
    handleFirstInteraction();
    playSound('receipt');
    
    setVerificationState(prev => ({ ...prev, transactionProcessed: true }));
    
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
    
    setTimeout(() => {
      if (currentCustomer.isFraud) {
        setGameScore(prev => ({ ...prev, errors: prev.errors + 2 }));
        setTerminalOutput(prev => [...prev, "", "⚠️ SECURITY ALERT: Fraudulent transaction approved", "Major compliance violation"]);
        playSound('reject');
      } else {
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
    handleFirstInteraction();
    playSound('button_click');
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
    handleFirstInteraction();
    playSound('button_click');
    const timeWorked = Math.floor((Date.now() - shiftStartTime) / 1000);
    setGameScore(prev => ({ ...prev, timeOnShift: timeWorked }));
    
    if (gameScore.errors >= 5) {
      setGamePhase('punch_out');
    } else {
      setGamePhase('leaderboard');
    }
  };

  const isMobile = window.innerWidth < 768;

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
        <div style={{
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
            onTouchStart={handleFirstInteraction}
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001100 0%, #003300 50%, #001100 100%)',
      color: '#00ff00',
      fontFamily: 'Courier New, monospace',
      padding: isMobile ? '10px' : '20px',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '10px' : '20px'
    }}>
      
      <div style={{ 
        flex: '1',
        marginBottom: isMobile ? '120px' : '0'
      }}>
        
        <div style={{
          background: 'rgba(0, 50, 0, 0.8)',
          border: '2px solid #00ff00',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px' }}>🏦 TELLER'S WINDOW</h1>
          <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#ffff00' }}>
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

        {!currentCustomer ? (
          <div style={{
            background: 'rgba(0, 30, 0, 0.6)',
            border: '2px solid #888888',
            borderRadius: '6px',
            padding: '20px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#888888', margin: '0 0 16px 0', fontSize: isMobile ? '16px' : '18px' }}>NO CUSTOMER PRESENT</h2>
            <button 
              onClick={() => {
                handleFirstInteraction();
                playSound('button_click');
                callCustomer();
              }}
              style={{
                minHeight: '44px',
                padding: '12px 16px',
                fontSize: isMobile ? '14px' : '16px',
                fontFamily: 'Courier New, monospace',
                border: '2px solid #00ff00',
                backgroundColor: 'rgba(0, 100, 0, 0.3)',
                color: '#00ff00',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              📞 CALL NEXT CUSTOMER
            </button>
          </div>
        ) : (
          <div style={{
            background: 'rgba(0, 60, 0, 0.8)',
            border: '3px solid #ffff00',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '12px',
            maxHeight: isMobile ? '400px' : '600px',
            overflowY: 'auto'
          }}>
            <h2 style={{ 
              color: '#ffff00', 
              margin: '0 0 16px 0', 
              textAlign: 'center',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              📋 CUSTOMER: {currentCustomer.name}
            </h2>
            
            <div style={{ marginBottom: '16px', textAlign: 'center', fontSize: isMobile ? '12px' : '14px' }}>
              <div><strong>Transaction:</strong> {currentCustomer.transactionType}</div>
              <div><strong>Amount:</strong> ${currentCustomer.requestedAmount.toLocaleString()}</div>
              <div><strong>Account:</strong> {currentCustomer.accountNumber}</div>
              {currentCustomer.destinationAccount && (
                <div><strong>To Account:</strong> {currentCustomer.destinationAccount}</div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                color: '#ffff00', 
                fontSize: isMobile ? '14px' : '16px', 
                marginBottom: '12px', 
                textAlign: 'center' 
              }}>
                📄 Customer Documents:
              </h3>
              {currentCustomer.documents.map((doc, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 0, 0.15)',
                  border: '2px solid #ffff00',
                  borderRadius: '6px',
                  padding: isMobile ? '12px' : '16px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(255, 255, 0, 0.3)'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '8px', 
                    fontSize: isMobile ? '13px' : '16px',
                    color: '#ffff00',
                    textAlign: 'center',
                    borderBottom: '1px solid #ffff00',
                    paddingBottom: '4px'
                  }}>
                    📋 {doc.title}
                  </div>
                  {Object.entries(doc.data).map(([key, value]) => (
                    <div key={key} style={{ 
                      fontSize: isMobile ? '11px' : '13px',
                      marginBottom: '6px',
                      padding: '4px 8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '3px',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '4px'
                    }}>
                      <span style={{ 
                        color: '#00dddd', 
                        fontWeight: 'bold',
                        minWidth: isMobile ? 'auto' : '120px'
                      }}>
                        {key}:
                      </span>
                      <span style={{ color: '#ffffff' }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <div style={{ fontSize: isMobile ? '10px' : '12px' }}>
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
      </div>

      <div style={{ flex: '1' }}>
        <div style={{
          background: 'rgba(0, 30, 0, 0.4)',
          border: '2px solid #00ff00',
          borderRadius: '4px',
          padding: '12px',
          fontFamily: 'Courier New, monospace',
          fontSize: isMobile ? '10px' : '12px',
          height: isMobile ? '200px' : '600px',
          overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: isMobile ? '12px' : '14px' }}>
            BANK TERMINAL
          </h3>
          {terminalOutput.map((line, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {showFloatingInput && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: isMobile ? '10px' : '50%',
          right: isMobile ? '10px' : 'auto',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          width: isMobile ? 'auto' : '500px',
          background: 'rgba(0, 100, 0, 0.98)',
          border: '3px solid #ffff00',
          borderRadius: '8px',
          padding: '16px',
          zIndex: 9999,
          boxShadow: '0 -4px 20px rgba(255, 255, 0, 0.5)'
        }}>
          <div style={{ 
            marginBottom: '8px', 
            color: '#ffff00', 
            fontSize: isMobile ? '14px' : '16px', 
            fontWeight: 'bold' 
          }}>
            💻 TELLER TERMINAL INPUT
          </div>
          <div style={{ marginBottom: '8px', color: '#ffff00', fontSize: isMobile ? '12px' : '14px' }}>
            {inputPrompt}
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder={commandPrefix}
            onKeyPress={(e) => {
              if (e.key !== 'Enter') {
                handleFirstInteraction();
                playSound('keyboard');
              }
              if (e.key === 'Enter') {
                processCommand(e.currentTarget.value);
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: isMobile ? '14px' : '16px',
              fontFamily: 'Courier New, monospace',
              background: '#001100',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={() => {
              handleFirstInteraction();
              playSound('button_click');
              if (inputRef.current) {
                processCommand(inputRef.current.value);
              }
            }}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '8px',
              fontSize: isMobile ? '14px' : '16px',
              fontFamily: 'Courier New, monospace',
              background: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            EXECUTE
          </button>
        </div>
      )}

      {signatureModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: isMobile ? '10px' : '50%',
          left: isMobile ? '10px' : '50%',
          right: isMobile ? '10px' : 'auto',
          transform: isMobile ? 'none' : 'translate(-50%, -50%)',
          background: 'rgba(0, 80, 0, 0.95)',
          border: '3px solid #ffff00',
          borderRadius: '8px',
          padding: '20px',
          zIndex: 1000,
          width: isMobile ? 'auto' : '500px',
          maxHeight: isMobile ? '80vh' : 'auto',
          overflowY: isMobile ? 'auto' : 'visible'
        }}>
          <h3 style={{ 
            color: '#ffff00', 
            textAlign: 'center', 
            marginBottom: '16px',
            fontSize: isMobile ? '14px' : '16px'
          }}>
            SIGNATURE COMPARISON
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', color: '#ffff00', fontSize: isMobile ? '12px' : '14px' }}>
              Bank Signature:
            </div>
            <div style={{
              background: '#001100',
              border: '1px solid #00ff00',
              padding: '12px',
              borderRadius: '4px',
              fontSize: isMobile ? '14px' : '18px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              {signatureModal.bankSignature}
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '8px', color: '#ffff00', fontSize: isMobile ? '12px' : '14px' }}>
              Customer Signature:
            </div>
            <div style={{
              background: '#001100',
              border: '1px solid #00ff00',
              padding: '12px',
              borderRadius: '4px',
              fontSize: isMobile ? '14px' : '18px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              {signatureModal.customerSignature}
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            flexDirection: isMobile ? 'column' : 'row' 
          }}>
            <button
              onClick={() => {
                handleFirstInteraction();
                playSound('approve');
                handleSignatureComparison(true);
              }}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: isMobile ? '14px' : '16px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                borderRadius: '4px',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              ✓ SIGNATURES MATCH
            </button>
            <button
              onClick={() => {
                handleFirstInteraction();
                playSound('reject');
                handleSignatureComparison(false);
              }}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: isMobile ? '14px' : '16px',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '2px solid #ff0000',
                color: '#ff0000',
                borderRadius: '4px',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              ✗ FRAUD DETECTED
            </button>
          </div>
        </div>
      )}

      {showReceipt && receiptData && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #000000',
          borderRadius: '6px',
          padding: '20px',
          color: '#000000',
          fontFamily: 'monospace',
          zIndex: 1000,
          fontSize: isMobile ? '12px' : '14px',
          maxWidth: isMobile ? '300px' : '400px',
          animation: 'slideDown 0.5s ease-out'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <strong>FIRST NATIONAL BANK</strong><br/>
            Transaction Receipt
          </div>
          <div>
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
    </div>
  );
}

export default App;