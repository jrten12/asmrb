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
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);
  const [gameScore, setGameScore] = useState({
    score: 0,
    correctTransactions: 0,
    errors: 0,
    timeOnShift: 0,
    consecutiveErrors: 0,
    errorDetails: [] as string[]
  });

  const { playSound, isReady: soundReady, unlock: unlockAudio } = useMobileSound();
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<number>(0);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [showManagerWarning, setShowManagerWarning] = useState(false);
  const [managerMessage, setManagerMessage] = useState('');

  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    accountNotFound: false,
    nameVerified: false,
    dobVerified: false,
    signatureCompared: false,
    signatureFraud: false,
    transactionProcessed: false
  });

  const [signatureModal, setSignatureModal] = useState<{
    isOpen: boolean, 
    bankSignature: string,
    customerSignature: string
  }>({
    isOpen: false, 
    bankSignature: '',
    customerSignature: ''
  });

  const [showFloatingInput, setShowFloatingInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [commandPrefix, setCommandPrefix] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFirstInteraction = () => {
    if (!audioUnlocked && soundReady) {
      unlockAudio();
      setAudioUnlocked(true);
    }
  };

  const resetVerificationState = () => {
    setVerificationState({
      accountLookedUp: false,
      accountNotFound: false,
      nameVerified: false,
      dobVerified: false,
      signatureCompared: false,
      signatureFraud: false,
      transactionProcessed: false
    });
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

  const handleCommand = (command: string) => {
    const cmd = command.trim().toUpperCase();
    
    if (cmd === 'NEXT') {
      const customer = generateCustomer();
      setCurrentCustomer(customer);
      resetVerificationState();
      setTerminalOutput(prev => [...prev, "> " + command, "Customer " + customer.name + " approaching window...", "REQUEST: " + customer.transactionType + " $" + customer.requestedAmount, "Please verify identity before processing."]);
      console.log("Generated customer:", customer);
      playSound('paper_rustle');
    } else if (cmd === 'LOOKUP' || cmd.startsWith('LOOKUP ')) {
      if (cmd === 'LOOKUP') {
        setTerminalOutput(prev => [...prev, "> " + command, "Enter account number to verify:", "Usage: LOOKUP [account_number]"]);
        setCommandPrefix('LOOKUP ');
        setInputPrompt('Enter account number...');
        setShowFloatingInput(true);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      } else {
        const accountNum = cmd.replace('LOOKUP ', '');
        if (!currentCustomer) {
          setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
          return;
        }
        
        playSound('keyboard');
        setTerminalOutput(prev => [...prev, "> " + command, "CONNECTING TO DATABASE...", "SEARCHING..."]);
        
        setTimeout(() => {
          playSound('approve');
          setTimeout(() => {
            if (currentCustomer.isFraud) {
              setVerificationState(prev => ({...prev, accountLookedUp: false, accountNotFound: true}));
              setTerminalOutput(prev => [...prev, 
                "> LOOKUP " + accountNum,
                "❌❌❌ ACCOUNT NOT FOUND ❌❌❌",
                "STATUS: INVALID - NO RECORD IN SYSTEM",
                "WARNING: POTENTIAL FRAUD DETECTED",
                "ACTION: REJECT TRANSACTION IMMEDIATELY"
              ]);
              playSound('reject');
            } else if (accountNum === currentCustomer.accountNumber) {
              const balance = Math.floor(Math.random() * 50000) + 5000;
              setAccountBalance(balance);
              setVerificationState(prev => ({...prev, accountLookedUp: true, accountNotFound: false}));
              setTerminalOutput(prev => [...prev, 
                "> LOOKUP " + accountNum,
                "✓✓✓ ACCOUNT VERIFIED - RECORD FOUND ✓✓✓",
                "STATUS: ACTIVE CUSTOMER",
                "BALANCE: $" + balance.toLocaleString(),
                "BANK RECORDS NOW DISPLAYED BELOW"
              ]);
              playSound('approve');
            } else {
              setVerificationState(prev => ({...prev, accountLookedUp: false, accountNotFound: true}));
              setTerminalOutput(prev => [...prev, 
                "> LOOKUP " + accountNum,
                "✗ ACCOUNT MISMATCH",
                "CUSTOMER ACCOUNT DOES NOT MATCH"
              ]);
              playSound('reject');
            }
          }, 800);
        }, 1200);
      }
    } else if (cmd.startsWith('VERIFY NAME ')) {
      const enteredName = cmd.replace('VERIFY NAME ', '').trim();
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!enteredName) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Name required", "Usage: VERIFY NAME [full name]"]);
        playSound('reject');
        return;
      }
      
      playSound('keyboard');
      setTimeout(() => {
        if (currentCustomer.isFraud) {
          setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "========== FRAUD ALERT ==========", "*** NO CUSTOMER RECORD FOUND ***", "Name: '" + enteredName + "'", "SYSTEM STATUS: NOT IN DATABASE", "RECOMMENDATION: REJECT IMMEDIATELY", "SECURITY FLAG: POTENTIAL IDENTITY THEFT", "===============================", ""]);
          playSound('reject');
        } else {
          const isMatch = enteredName.toUpperCase() === currentCustomer.name.toUpperCase();
          if (isMatch) {
            setVerificationState(prev => ({...prev, nameVerified: true}));
            setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "========== VERIFICATION SUCCESS ==========", "✓ CUSTOMER NAME VERIFIED", "Input: " + enteredName, "System: " + currentCustomer.name, "STATUS: IDENTITY CONFIRMED", "NEXT STEP: VERIFY DATE OF BIRTH", "=======================================", ""]);
            playSound('approve');
          } else {
            setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "========== VERIFICATION FAILED ==========", "✗ NAME DOES NOT MATCH RECORDS", "You entered: " + enteredName, "System shows: " + currentCustomer.name, "STATUS: IDENTITY NOT CONFIRMED", "ACTION: RE-CHECK CUSTOMER DOCUMENTS", "====================================", ""]);
            playSound('reject');
          }
        }
      }, 1000);
    } else if (cmd.startsWith('VERIFY DOB ')) {
      const enteredDOB = cmd.replace('VERIFY DOB ', '').trim();
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!enteredDOB) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Date of birth required", "Usage: VERIFY DOB [YYYY-MM-DD]"]);
        playSound('reject');
        return;
      }
      
      playSound('keyboard');
      setTimeout(() => {
        const systemDOB = currentCustomer.documents.find(d => d.data.dateOfBirth)?.data.dateOfBirth || "1985-03-15";
        
        if (currentCustomer.isFraud) {
          setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "========== FRAUD ALERT ==========", "*** NO DATE OF BIRTH RECORD ***", "DOB: '" + enteredDOB + "'", "SYSTEM STATUS: NOT IN DATABASE", "RECOMMENDATION: REJECT TRANSACTION", "SECURITY FLAG: FRAUDULENT IDENTITY", "==============================", ""]);
          playSound('reject');
        } else if (enteredDOB === systemDOB) {
          setVerificationState(prev => ({...prev, dobVerified: true}));
          setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "========== VERIFICATION SUCCESS ==========", "✓ DATE OF BIRTH VERIFIED", "Input: " + enteredDOB, "System: " + systemDOB, "STATUS: DOB CONFIRMED", "NEXT STEP: COMPARE SIGNATURE", "=======================================", ""]);
          playSound('approve');
        } else {
          setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "========== VERIFICATION FAILED ==========", "✗ DATE OF BIRTH MISMATCH", "You entered: " + enteredDOB, "System shows: " + systemDOB, "STATUS: DOB NOT CONFIRMED", "ACTION: RE-CHECK CUSTOMER ID", "====================================", ""]);
          playSound('reject');
        }
      }, 1000);
    } else if (cmd === 'COMPARE SIGNATURE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const bankSig = currentCustomer.name.split(' ')[0] + " " + currentCustomer.name.split(' ')[currentCustomer.name.split(' ').length - 1];
      const customerSig = currentCustomer.documents.find(d => d.type === 'SIGNATURE')?.data.signature as string;
      
      setSignatureModal({
        isOpen: true,
        bankSignature: bankSig,
        customerSignature: customerSig
      });
      
      setTerminalOutput(prev => [...prev, "> " + command, "SIGNATURE COMPARISON OPENED", "Compare bank signature with customer signature"]);
    } else if (cmd === 'PROCESS' && verificationState.accountLookedUp) {
      processTransaction();
    } else if (cmd === 'REJECT') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (currentCustomer.isFraud) {
        setGameScore(prev => ({ 
          ...prev, 
          score: prev.score + 150, 
          correctTransactions: prev.correctTransactions + 1 
        }));
        setTerminalOutput(prev => [...prev, "> " + command, "✓ CORRECT FRAUD DETECTION +150 points", "Transaction rejected successfully"]);
      } else {
        setGameScore(prev => ({ ...prev, errors: prev.errors + 1 }));
        setTerminalOutput(prev => [...prev, "> " + command, "✗ FALSE FRAUD ALERT - Customer was legitimate", "Error recorded"]);
      }
      
      setTimeout(() => {
        setCurrentCustomer(null);
        setTerminalOutput(prev => [...prev, "", "Ready for next customer"]);
      }, 2000);
      
      playSound('reject');
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "Unknown command. Available commands:", "NEXT - Call next customer", "LOOKUP [account] - Look up account", "VERIFY NAME [name] - Verify customer name", "VERIFY DOB [YYYY-MM-DD] - Verify date of birth", "COMPARE SIGNATURE - Compare signatures", "PROCESS - Process transaction", "REJECT - Reject transaction"]);
    }
  };

  const handleSignatureComparison = (isMatch: boolean) => {
    setSignatureModal({ isOpen: false, bankSignature: '', customerSignature: '' });
    
    if (isMatch) {
      setVerificationState(prev => ({ ...prev, signatureCompared: true }));
      setTerminalOutput(prev => [
        ...prev,
        `✓ SIGNATURES MATCH`,
        "Customer identity verified",
        "Ready to process transaction",
        "Type: PROCESS to execute"
      ]);
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
      "Type 'NEXT' to call first customer"
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
      padding: '20px',
      display: 'flex',
      gap: '20px'
    }}>
      
      <div style={{ flex: '1' }}>
        
        <div style={{
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

        {currentCustomer && (
          <div style={{
            background: 'rgba(0, 60, 0, 0.8)',
            border: '3px solid #ffff00',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '12px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <h2 style={{ 
              color: '#ffff00', 
              margin: '0 0 16px 0', 
              textAlign: 'center'
            }}>
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
              <h3 style={{ 
                color: '#ffff00', 
                fontSize: '16px', 
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
                  padding: '16px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(255, 255, 0, 0.3)'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '8px', 
                    fontSize: '16px',
                    color: '#ffff00',
                    textAlign: 'center',
                    borderBottom: '1px solid #ffff00',
                    paddingBottom: '4px'
                  }}>
                    📋 {doc.title}
                  </div>
                  {Object.entries(doc.data).map(([key, value]) => (
                    <div key={key} style={{ 
                      fontSize: '13px',
                      marginBottom: '6px',
                      padding: '4px 8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '3px',
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '8px'
                    }}>
                      <span style={{ 
                        color: '#00dddd', 
                        fontWeight: 'bold',
                        minWidth: '120px'
                      }}>
                        {key}:
                      </span>
                      <span style={{ color: '#ffffff' }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <div style={{ fontSize: '12px' }}>
              <div style={{ color: verificationState.accountLookedUp ? '#00ff00' : '#888888' }}>
                {verificationState.accountLookedUp ? '✓' : '○'} Account Lookup
              </div>
              <div style={{ color: verificationState.nameVerified ? '#00ff00' : '#888888' }}>
                {verificationState.nameVerified ? '✓' : '○'} Name Verification
              </div>
              <div style={{ color: verificationState.dobVerified ? '#00ff00' : '#888888' }}>
                {verificationState.dobVerified ? '✓' : '○'} DOB Verification
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
          fontSize: '12px',
          height: '600px',
          overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ff00' }}>
            BANK TERMINAL
          </h3>
          {terminalOutput.map((line, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>
              {line}
            </div>
          ))}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter command..."
          onKeyPress={(e) => {
            if (e.key !== 'Enter') {
              handleFirstInteraction();
              playSound('keyboard');
            }
            if (e.key === 'Enter') {
              handleCommand(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '8px',
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            background: '#001100',
            border: '1px solid #00ff00',
            color: '#00ff00',
            borderRadius: '4px'
          }}
        />
      </div>

      {showFloatingInput && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
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
            fontSize: '16px', 
            fontWeight: 'bold' 
          }}>
            💻 TELLER TERMINAL INPUT
          </div>
          <div style={{ marginBottom: '8px', color: '#ffff00' }}>
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
                handleCommand(e.currentTarget.value);
                setShowFloatingInput(false);
                e.currentTarget.value = '';
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
        </div>
      )}

      {signatureModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 80, 0, 0.95)',
          border: '3px solid #ffff00',
          borderRadius: '8px',
          padding: '20px',
          zIndex: 1000,
          width: '500px'
        }}>
          <h3 style={{ 
            color: '#ffff00', 
            textAlign: 'center', 
            marginBottom: '16px'
          }}>
            SIGNATURE COMPARISON
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', color: '#ffff00' }}>
              Bank Signature:
            </div>
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
            <div style={{ marginBottom: '8px', color: '#ffff00' }}>
              Customer Signature:
            </div>
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
          
          <div style={{ 
            display: 'flex', 
            gap: '10px'
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
                fontSize: '16px',
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
                fontSize: '16px',
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