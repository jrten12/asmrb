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

interface Document {
  type: string;
  title: string;
  data: Record<string, string | number>;
}

function App() {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Tap CALL CUSTOMER to begin"
  ]);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    nameVerified: false,
    dobVerified: false,
    addressVerified: false,
    signatureCompared: false,
    transactionProcessed: false
  });
  const [signatureModal, setSignatureModal] = useState<{isOpen: boolean, signature: string}>({isOpen: false, signature: ''});
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const generateCustomer = (): Customer => {
    const names = ["Sarah L. Williams", "Michael Johnson", "Jennifer Rodriguez", "David Chen", "Emily Davis"];
    const transactionTypes: Customer['transactionType'][] = ["DEPOSIT", "WITHDRAWAL", "WIRE_TRANSFER", "ACCOUNT_UPDATE", "INQUIRY"];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const accountNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const requestedAmount = transactionType === 'INQUIRY' ? 0 : Math.floor(100 + Math.random() * 5000);
    const destinationAccount = transactionType === 'WIRE_TRANSFER' ? Math.floor(100000000 + Math.random() * 900000000).toString() : undefined;
    
    const documents: Document[] = [
      {
        type: "ID",
        title: "Driver's License",
        data: {
          name: name,
          licenseNumber: "DL-" + Math.floor(10000 + Math.random() * 90000),
          dateOfBirth: "1985-03-15",
          address: "123 Main Street, Springfield, IL 62701"
        }
      },
      {
        type: "SLIP",
        title: transactionType === 'WIRE_TRANSFER' ? "Wire Transfer Request" : 
               transactionType === 'ACCOUNT_UPDATE' ? "Account Update Form" :
               transactionType === 'INQUIRY' ? "Balance Inquiry Form" : "Transaction Slip",
        data: {
          accountNumber: accountNumber,
          amount: requestedAmount,
          transactionType: transactionType,
          destinationAccount: destinationAccount || '',
          date: new Date().toLocaleDateString()
        }
      },
      {
        type: "SIGNATURE",
        title: "Signature Card",
        data: {
          signature: name.split(' ')[0] + " " + name.split(' ')[name.split(' ').length - 1]
        }
      }
    ];

    return {
      name,
      accountNumber,
      transactionType,
      requestedAmount,
      destinationAccount,
      documents,
      isFraud: Math.random() < 0.3,
      fraudType: Math.floor(Math.random() * 5)
    };
  };

  const playSound = (type: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const createTone = (frequency: number, duration: number, volume: number = 0.1) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      };

      switch (type) {
        case 'keypress':
          createTone(800, 0.08, 0.04);
          break;
        case 'button_click':
          createTone(1200, 0.12, 0.08);
          setTimeout(() => createTone(900, 0.08, 0.04), 40);
          break;
        case 'terminal_confirm':
          createTone(1100, 0.15, 0.06);
          setTimeout(() => createTone(1300, 0.1, 0.04), 80);
          break;
        case 'customer_approach':
          createTone(600, 0.3, 0.08);
          setTimeout(() => createTone(700, 0.2, 0.06), 150);
          break;
        case 'database_lookup':
          createTone(1000, 0.2, 0.06);
          setTimeout(() => createTone(1100, 0.15, 0.04), 100);
          setTimeout(() => createTone(1200, 0.1, 0.03), 200);
          break;
        case 'approve':
          createTone(800, 0.15, 0.08);
          setTimeout(() => createTone(1000, 0.25, 0.1), 150);
          break;
        case 'reject':
          createTone(400, 0.25, 0.08);
          setTimeout(() => createTone(350, 0.2, 0.06), 150);
          break;
        case 'stamp':
          createTone(300, 0.05, 0.12);
          setTimeout(() => createTone(250, 0.08, 0.08), 40);
          break;
        case 'paper_rustle':
          createTone(1500, 0.03, 0.02);
          setTimeout(() => createTone(1400, 0.02, 0.015), 30);
          setTimeout(() => createTone(1600, 0.025, 0.018), 60);
          break;
        default:
          createTone(500, 0.1, 0.05);
      }
    } catch (error) {
      console.log("Audio not available:", error);
    }
  };

  const resetVerificationState = () => {
    setVerificationState({
      accountLookedUp: false,
      nameVerified: false,
      dobVerified: false,
      addressVerified: false,
      signatureCompared: false,
      transactionProcessed: false
    });
  };

  const handleCommand = (command: string) => {
    const cmd = command.trim().toUpperCase();
    playSound('keypress');
    
    if (cmd === 'NEXT') {
      const customer = generateCustomer();
      setCurrentCustomer(customer);
      resetVerificationState();
      setTerminalOutput(prev => [...prev, "> " + command, "Customer " + customer.name + " approaching window...", "REQUEST: " + customer.transactionType + " $" + customer.requestedAmount, "Please verify identity before processing."]);
      console.log("Generated customer:", customer);
      playSound('customer_approach');
    } else if (cmd === 'LOOKUP' || cmd.startsWith('LOOKUP ')) {
      if (cmd === 'LOOKUP') {
        setTerminalOutput(prev => [...prev, "> " + command, "Enter account number to verify:", "Usage: LOOKUP [account_number]"]);
      } else {
        const accountNum = cmd.replace('LOOKUP ', '');
        if (!currentCustomer) {
          setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
          return;
        }
        
        setVerificationState(prev => ({...prev, accountLookedUp: true}));
        setTerminalOutput(prev => [...prev, "> " + command, "Database lookup for account: " + accountNum, "Name on file: " + currentCustomer.name, "DOB on file: 1985-03-15", "Address: 123 Main Street, Springfield, IL", "Account status: ACTIVE", "Current balance: $" + Math.floor(Math.random() * 50000), "", "Use VERIFY commands to check customer data"]);
        playSound('database_lookup');
      }
    } else if (cmd.startsWith('VERIFY NAME ')) {
      const enteredName = cmd.replace('VERIFY NAME ', '');
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const isMatch = enteredName.toUpperCase() === currentCustomer.name.toUpperCase();
      if (isMatch) {
        setVerificationState(prev => ({...prev, nameVerified: true}));
        setTerminalOutput(prev => [...prev, "> " + command, "✓ NAME VERIFIED: " + enteredName, "Customer name matches system records"]);
        playSound('database_lookup');
      } else {
        setTerminalOutput(prev => [...prev, "> " + command, "✗ NAME MISMATCH:", "Entered: " + enteredName, "System: " + currentCustomer.name, "FRAUD ALERT: Name does not match"]);
        playSound('error');
      }
    } else if (cmd.startsWith('VERIFY DOB ')) {
      const enteredDOB = cmd.replace('VERIFY DOB ', '');
      const systemDOB = "1985-03-15";
      
      if (enteredDOB === systemDOB) {
        setVerificationState(prev => ({...prev, dobVerified: true}));
        setTerminalOutput(prev => [...prev, "> " + command, "✓ DOB VERIFIED: " + enteredDOB, "Date of birth matches system records"]);
        playSound('database_lookup');
      } else {
        setTerminalOutput(prev => [...prev, "> " + command, "✗ DOB MISMATCH:", "Entered: " + enteredDOB, "System: " + systemDOB, "FRAUD ALERT: Date of birth does not match"]);
        playSound('error');
      }
    } else if (cmd === 'COMPARE SIGNATURE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const signature = currentCustomer.documents.find(d => d.type === 'SIGNATURE')?.data.signature || 'No signature';
      setSignatureModal({isOpen: true, signature: signature as string});
      setVerificationState(prev => ({...prev, signatureCompared: true}));
      setTerminalOutput(prev => [...prev, "> " + command, "Displaying signatures for comparison...", "Compare customer signature with system signature"]);
      playSound('paper_rustle');
    } else if (cmd.startsWith('PROCESS ')) {
      const transactionPart = cmd.replace('PROCESS ', '');
      
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      setVerificationState(prev => ({...prev, transactionProcessed: true}));
      
      if (transactionPart.startsWith('DEPOSIT ')) {
        const amount = transactionPart.replace('DEPOSIT ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing deposit: $" + amount, "Transaction prepared for approval"]);
        playSound('cash_count');
      } else if (transactionPart.startsWith('WITHDRAWAL ')) {
        const amount = transactionPart.replace('WITHDRAWAL ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing withdrawal: $" + amount, "Transaction prepared for approval"]);
        playSound('cash_count');
      } else if (transactionPart.startsWith('WIRE ')) {
        const amount = transactionPart.replace('WIRE ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing wire transfer: $" + amount, "International routing confirmed", "Transaction prepared for approval"]);
        playSound('processing');
      }
    } else if (cmd === 'APPROVE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const required = ['accountLookedUp', 'nameVerified', 'dobVerified', 'signatureCompared', 'transactionProcessed'];
      const missing = required.filter(req => !verificationState[req as keyof typeof verificationState]);
      
      if (missing.length > 0) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Cannot approve without verification:", ...missing.map(m => "- " + m.replace(/([A-Z])/g, ' $1').toUpperCase())]);
        playSound('error');
        return;
      }
      
      setTerminalOutput(prev => [...prev, "> " + command, "TRANSACTION APPROVED", "All verifications complete", "Processing payment..."]);
      playSound('approve');
      setTimeout(() => playSound('stamp'), 300);
      setTimeout(() => playSound('receipt_print'), 600);
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "Customer served. Next customer please."]);
        playSound('paper_rustle');
      }, 2000);
    } else if (cmd === 'REJECT') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      setTerminalOutput(prev => [...prev, "> " + command, "TRANSACTION REJECTED", "Customer dismissed"]);
      playSound('reject');
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "Next customer please."]);
      }, 1500);
    } else if (cmd === 'HELP') {
      setTerminalOutput(prev => [...prev, "> " + command, "Manual Verification Commands:", "LOOKUP [account_number] - Get system data", "VERIFY NAME [full_name] - Check name", "VERIFY DOB [YYYY-MM-DD] - Check date of birth", "COMPARE SIGNATURE - View signatures", "PROCESS [DEPOSIT/WITHDRAWAL/WIRE] [amount]", "APPROVE - Approve after all verifications", "REJECT - Reject transaction"]);
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "Unknown command. Type HELP for available commands."]);
    }
  };



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputRef.current) {
      const command = inputRef.current.value;
      if (command.trim()) {
        playSound('terminal_confirm');
        handleCommand(command);
        inputRef.current.value = '';
        inputRef.current.placeholder = "Enter command...";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Play typing sound for regular typing
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Space') {
      playSound('keypress');
    }
  };

  return (
    <div style={{
      fontFamily: 'Courier New, monospace',
      background: 'radial-gradient(circle, #002200 0%, #000 100%)',
      color: '#00ff00',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      padding: '4px',
      overflow: 'auto',
      position: 'fixed',
      top: 0,
      left: 0,
      boxSizing: 'border-box'
    }}>
      
      {/* Customer Information */}
      {currentCustomer ? (
        <div style={{
          textAlign: 'center',
          marginBottom: '12px',
          border: '3px solid #ffff00',
          padding: '16px',
          background: 'rgba(255, 255, 0, 0.1)',
          borderRadius: '4px'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#ffff00' }}>
            CUSTOMER: {currentCustomer.name}
          </h1>
          <div style={{ color: '#ffffff', marginBottom: '4px', fontSize: '16px' }}>
            ACCOUNT: {currentCustomer.accountNumber}
          </div>
          <div style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '18px' }}>
            REQUEST: {currentCustomer.transactionType} ${currentCustomer.requestedAmount}
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          marginBottom: '12px',
          border: '2px solid #00ff00',
          padding: '16px',
          background: 'rgba(0, 50, 0, 0.3)',
          borderRadius: '4px'
        }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#888888' }}>NO CUSTOMER PRESENT</h1>
          <div style={{ fontSize: '14px', color: '#00aaff' }}>Tap CALL CUSTOMER to begin</div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        gap: '8px', 
        minHeight: 0,
        maxHeight: 'calc(100vh - 140px)',
        flexDirection: 'column'
      }}>
        
        {/* Documents Section - Always Visible and Fixed */}
        <div style={{
          background: 'rgba(0, 40, 0, 0.9)',
          border: '3px solid #ffff00',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '12px',
          height: '280px',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 10
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#ffff00', fontSize: '20px', textAlign: 'center' }}>📄 CUSTOMER DOCUMENTS</h3>
          
          {currentCustomer && currentCustomer.documents && currentCustomer.documents.length > 0 ? 
            currentCustomer.documents.map((doc, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 0, 0.15)',
                  border: '3px solid #ffff00',
                  padding: '20px',
                  margin: '8px 0',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontSize: '22px', color: '#ffff00', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '18px', lineHeight: '1.6' }}>
                  {Object.entries(doc.data).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,0,0.3)' }}>
                      <span style={{ color: '#00ffff', fontWeight: 'bold', fontSize: '16px' }}>{key.toUpperCase()}:</span>{' '}
                      <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '20px' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          : (
            <div style={{
              textAlign: 'center',
              color: '#ffaa00',
              padding: '40px',
              fontSize: '18px',
              border: '2px dashed #ffaa00',
              borderRadius: '8px'
            }}>
              No customer documents available<br/>
              <span style={{ fontSize: '14px' }}>Use NEXT command to call customer</span>
            </div>
          )}
        </div>

        {/* Terminal Section */}
        <div style={{
          flex: 1,
          background: 'rgba(0, 30, 0, 0.4)',
          border: '2px solid #00ff00',
          padding: '8px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: window.innerWidth < 768 ? '300px' : 'auto'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>TERMINAL</h3>
          
          {/* Transaction Type Selector */}
          {currentCustomer && (
            <div style={{
              marginBottom: '8px',
              padding: '8px',
              background: 'rgba(0, 40, 0, 0.3)',
              border: '1px solid #00aa00',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', color: '#00cccc' }}>QUICK COMMANDS:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'VERIFY NAME ';
                      inputRef.current.focus();
                    }
                  }}
                  style={{
                    background: 'rgba(0, 60, 0, 0.6)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    fontFamily: 'monospace'
                  }}
                >
                  VERIFY NAME
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'VERIFY DOB ';
                      inputRef.current.focus();
                    }
                  }}
                  style={{
                    background: 'rgba(60, 60, 0, 0.6)',
                    border: '1px solid #aaaa00',
                    color: '#ffff00',
                    padding: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    fontFamily: 'monospace'
                  }}
                >
                  VERIFY DOB
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'COMPARE SIGNATURE';
                      inputRef.current.focus();
                    }
                  }}
                  style={{
                    background: 'rgba(0, 0, 60, 0.6)',
                    border: '1px solid #0088ff',
                    color: '#00aaff',
                    padding: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    fontFamily: 'monospace'
                  }}
                >
                  SIGNATURE
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'PROCESS ' + (currentCustomer?.transactionType || '') + ' ';
                      inputRef.current.focus();
                    }
                  }}
                  style={{
                    background: 'rgba(60, 0, 60, 0.6)',
                    border: '1px solid #aa00aa',
                    color: '#ff00ff',
                    padding: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    fontFamily: 'monospace'
                  }}
                >
                  PROCESS
                </button>
              </div>
            </div>
          )}

          {/* Verification Status */}
          {currentCustomer && (
            <div style={{
              marginBottom: '8px',
              padding: '8px',
              background: 'rgba(40, 40, 0, 0.3)',
              border: '1px solid #ffaa00',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', color: '#ffaa00' }}>VERIFICATION STATUS:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', fontSize: '10px' }}>
                <div style={{ color: verificationState.accountLookedUp ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.accountLookedUp ? '✓' : '○'} LOOKUP
                </div>
                <div style={{ color: verificationState.nameVerified ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.nameVerified ? '✓' : '○'} NAME
                </div>
                <div style={{ color: verificationState.dobVerified ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.dobVerified ? '✓' : '○'} DOB
                </div>
                <div style={{ color: verificationState.signatureCompared ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.signatureCompared ? '✓' : '○'} SIGNATURE
                </div>
                <div style={{ color: verificationState.transactionProcessed ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.transactionProcessed ? '✓' : '○'} PROCESS
                </div>
              </div>
            </div>
          )}

          {/* Main Action Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button
              onClick={() => {
                handleCommand('NEXT');
                playSound('button_click');
              }}
              style={{
                background: currentCustomer ? 'rgba(100, 100, 0, 0.6)' : 'rgba(0, 100, 0, 0.6)',
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
              {currentCustomer ? 'NEXT CUSTOMER' : 'CALL CUSTOMER'}
            </button>
            
            <button
              onClick={() => {
                setTerminalOutput(prev => [...prev, "> LOOKUP", "Enter account number to verify:"]);
                if (inputRef.current) {
                  inputRef.current.focus();
                  inputRef.current.placeholder = "Type account number...";
                }
                playSound('button_click');
              }}
              disabled={!currentCustomer}
              style={{
                background: currentCustomer ? 'rgba(0, 80, 100, 0.6)' : 'rgba(50, 50, 50, 0.3)',
                border: '2px solid #00aaff',
                color: currentCustomer ? '#00aaff' : '#666666',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: currentCustomer ? 'pointer' : 'not-allowed',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}
            >
              LOOKUP ACCOUNT
            </button>
            
            <button
              onClick={() => {
                playSound('approve');
                handleCommand('APPROVE');
              }}
              disabled={!currentCustomer}
              style={{
                background: currentCustomer ? 'rgba(0, 100, 0, 0.6)' : 'rgba(50, 50, 50, 0.3)',
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
              APPROVE
            </button>
            
            <button
              onClick={() => {
                playSound('reject');
                handleCommand('REJECT');
              }}
              disabled={!currentCustomer}
              style={{
                background: currentCustomer ? 'rgba(100, 0, 0, 0.6)' : 'rgba(50, 50, 50, 0.3)',
                border: '2px solid #ff4444',
                color: currentCustomer ? '#ff4444' : '#666666',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: currentCustomer ? 'pointer' : 'not-allowed',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}
            >
              REJECT
            </button>
          </div>

          {/* Terminal Output */}
          <div style={{
            flex: 1,
            background: '#000000',
            border: '1px solid #00ff00',
            padding: '8px',
            borderRadius: '2px',
            overflow: 'auto',
            marginBottom: '8px',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}>
            {terminalOutput.map((line, index) => (
              <div key={index} style={{ marginBottom: '2px' }}>
                {line}
              </div>
            ))}
          </div>

          {/* Terminal Input - Fixed at Bottom */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            position: 'sticky',
            bottom: 0,
            background: '#000000',
            padding: '4px 0',
            borderTop: '1px solid #00ff00'
          }}>
            <span style={{ marginRight: '8px', color: '#00ff00', fontWeight: 'bold' }}>&gt;</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type verification commands here..."
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: '#000000',
                border: '2px solid #00ff00',
                color: '#00ff00',
                padding: '10px',
                fontSize: '16px',
                fontFamily: 'monospace',
                outline: 'none',
                borderRadius: '4px',
                minWidth: '300px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Signature Comparison Modal */}
      {signatureModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'radial-gradient(circle, #002200 0%, #000 100%)',
            border: '3px solid #00ff00',
            borderRadius: '8px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              color: '#00ff00', 
              textAlign: 'center',
              fontSize: '20px'
            }}>
              SIGNATURE COMPARISON
            </h2>
            
            <div style={{
              background: '#ffffff',
              border: '2px solid #00ff00',
              padding: '16px',
              borderRadius: '4px',
              marginBottom: '16px',
              textAlign: 'center',
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                color: '#000000',
                fontSize: '24px',
                fontFamily: 'cursive',
                fontWeight: 'bold'
              }}>
                {signatureModal.signature}
              </div>
            </div>
            
            <div style={{
              color: '#ffff00',
              fontSize: '14px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              Compare this signature with the customer's ID and signature card
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setSignatureModal({isOpen: false, signature: ''});
                  playSound('modal_close');
                }}
                style={{
                  background: 'rgba(0, 100, 0, 0.6)',
                  border: '2px solid #00ff00',
                  color: '#00ff00',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;