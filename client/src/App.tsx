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
    signatureChecked: false,
    accountLookedUp: false,
    destinationVerified: false,
    balanceConfirmed: false,
    identityVerified: false
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
    // Sound effect placeholder
    console.log("Playing sound:", type);
  };

  const resetVerificationState = () => {
    setVerificationState({
      signatureChecked: false,
      accountLookedUp: false,
      destinationVerified: false,
      balanceConfirmed: false,
      identityVerified: false
    });
  };

  const handleCommand = (command: string) => {
    const cmd = command.trim().toUpperCase();
    playSound('keypress');
    
    if (cmd === 'NEXT') {
      const customer = generateCustomer();
      setCurrentCustomer(customer);
      resetVerificationState();
      setTerminalOutput(prev => [...prev, "> " + command, "Customer " + customer.name + " approaching window...", "Transaction Type: " + customer.transactionType]);
      console.log("Generated customer:", customer);
      playSound('customer_approach');
    } else if (cmd === 'LOOKUP' || cmd.startsWith('LOOKUP ')) {
      if (cmd === 'LOOKUP') {
        setTerminalOutput(prev => [...prev, "> " + command, "LOOKUP initiated.", "Enter: LOOKUP [account_number]"]);
      } else {
        const accountNum = cmd.replace('LOOKUP ', '');
        setVerificationState(prev => ({...prev, accountLookedUp: true, identityVerified: true}));
        setTerminalOutput(prev => [...prev, "> " + command, "Looking up account: " + accountNum, "Account found - Customer verified", "SIGNATURE ON FILE: [Type SHOW SIGNATURE to view]", "Balance: $" + Math.floor(Math.random() * 50000)]);
        playSound('database_lookup');
      }
    } else if (cmd === 'SHOW SIGNATURE') {
      if (currentCustomer) {
        const signature = currentCustomer.documents.find(d => d.type === 'SIGNATURE')?.data.signature || 'No signature';
        setSignatureModal({isOpen: true, signature: signature as string});
        setVerificationState(prev => ({...prev, signatureChecked: true}));
        setTerminalOutput(prev => [...prev, "> " + command, "Displaying signature for comparison..."]);
        playSound('modal_open');
      }
    } else if (cmd.startsWith('SET DESTINATION ')) {
      const destination = cmd.replace('SET DESTINATION ', '');
      setVerificationState(prev => ({...prev, destinationVerified: true}));
      setTerminalOutput(prev => [...prev, "> " + command, "Destination account set: " + destination, "Destination verified and active"]);
      playSound('destination_set');
    } else if (cmd.startsWith('SEND ') && cmd.includes(' TO ')) {
      const parts = cmd.split(' TO ');
      const amountPart = parts[0].replace('SEND ', '');
      const destination = parts[1];
      setTerminalOutput(prev => [...prev, "> " + command, "Wire transfer prepared:", "Amount: " + amountPart, "Destination: " + destination, "Ready for processing"]);
      playSound('wire_prepared');
    } else if (cmd.startsWith('PROCESS ')) {
      const transactionPart = cmd.replace('PROCESS ', '');
      if (transactionPart.startsWith('WIRE ')) {
        const amount = transactionPart.replace('WIRE ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing wire transfer: $" + amount, "International routing confirmed", "Processing..."]);
      } else if (transactionPart.startsWith('DEPOSIT ')) {
        const amount = transactionPart.replace('DEPOSIT ', '');
        setVerificationState(prev => ({...prev, balanceConfirmed: true}));
        setTerminalOutput(prev => [...prev, "> " + command, "Processing deposit: $" + amount, "Funds available for immediate use"]);
      } else if (transactionPart.startsWith('WITHDRAWAL ')) {
        const amount = transactionPart.replace('WITHDRAWAL ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing withdrawal: $" + amount, "Sufficient funds confirmed"]);
      }
      playSound('processing');
    } else if (cmd === 'APPROVE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const required = getRequiredVerifications(currentCustomer.transactionType);
      const missing = required.filter(req => !verificationState[req as keyof typeof verificationState]);
      
      if (missing.length > 0) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Missing verifications:", ...missing.map(m => "- " + m.replace(/([A-Z])/g, ' $1').toUpperCase())]);
        playSound('error');
        return;
      }
      
      setTerminalOutput(prev => [...prev, "> " + command, "Transaction APPROVED", "All verifications complete", "Processing payment..."]);
      playSound('approve');
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "Customer served. Next customer please."]);
      }, 2000);
    } else if (cmd === 'REJECT') {
      setTerminalOutput(prev => [...prev, "> " + command, "Transaction REJECTED", "Fraud detected or insufficient documentation"]);
      playSound('reject');
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "Customer dismissed. Next customer please."]);
      }, 2000);
    } else if (cmd === 'HELP') {
      setTerminalOutput(prev => [...prev, "> " + command, "Available commands:", "LOOKUP [account] - Verify account", "SHOW SIGNATURE - View signature", "SET DESTINATION [account] - Set wire destination", "SEND [amount] TO [account] - Prepare wire", "PROCESS WIRE/DEPOSIT/WITHDRAWAL [amount]", "APPROVE - Approve transaction", "REJECT - Reject transaction"]);
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "Command processed"]);
    }
  };

  const getRequiredVerifications = (transactionType: Customer['transactionType']) => {
    switch (transactionType) {
      case 'WIRE_TRANSFER':
        return ['signatureChecked', 'accountLookedUp', 'destinationVerified', 'identityVerified'];
      case 'WITHDRAWAL':
        return ['signatureChecked', 'accountLookedUp', 'balanceConfirmed', 'identityVerified'];
      case 'DEPOSIT':
        return ['signatureChecked', 'accountLookedUp', 'identityVerified'];
      case 'ACCOUNT_UPDATE':
        return ['signatureChecked', 'accountLookedUp', 'identityVerified'];
      case 'INQUIRY':
        return ['accountLookedUp', 'identityVerified'];
      default:
        return ['accountLookedUp'];
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputRef.current) {
      const command = inputRef.current.value;
      if (command.trim()) {
        handleCommand(command);
        inputRef.current.value = '';
        inputRef.current.placeholder = "Enter command...";
      }
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
      padding: '8px',
      overflow: 'hidden',
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
        flexDirection: window.innerWidth < 768 ? 'column' : 'row'
      }}>
        
        {/* Documents Section */}
        <div style={{
          flex: 1,
          background: 'rgba(0, 30, 0, 0.4)',
          border: '2px solid #00ff00',
          padding: '8px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: window.innerWidth < 768 ? '200px' : 'auto'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>DOCUMENTS PROVIDED</h3>
          
          {currentCustomer && currentCustomer.documents && currentCustomer.documents.length > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {currentCustomer.documents.map((doc, index) => (
                <div
                  key={index}
                  style={{
                    background: selectedDocument === index ? 'rgba(0, 120, 0, 0.5)' : 'rgba(0, 50, 0, 0.3)',
                    border: selectedDocument === index ? '2px solid #00ff00' : '1px solid #005500',
                    padding: '16px',
                    margin: '8px 0',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                  onClick={() => setSelectedDocument(selectedDocument === index ? null : index)}
                >
                  <strong style={{ fontSize: '16px', color: '#00ff00' }}>{doc.title}</strong>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>
                    {Object.entries(doc.data).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: '4px' }}>
                        <span style={{ color: '#00ccff' }}>{key.toUpperCase()}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#888888',
              padding: '20px',
              fontSize: '16px'
            }}>
              No documents available
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
                    handleCommand('PROCESS DEPOSIT ' + (currentCustomer?.requestedAmount || ''));
                    playSound('button_click');
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
                  DEPOSIT
                </button>
                <button
                  onClick={() => {
                    handleCommand('PROCESS WITHDRAWAL ' + (currentCustomer?.requestedAmount || ''));
                    playSound('button_click');
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
                  WITHDRAW
                </button>
                <button
                  onClick={() => {
                    handleCommand('PROCESS WIRE ' + (currentCustomer?.requestedAmount || ''));
                    playSound('button_click');
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
                  WIRE
                </button>
                <button
                  onClick={() => {
                    handleCommand('SHOW SIGNATURE');
                    playSound('button_click');
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
                  SIGNATURE
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
                  {verificationState.accountLookedUp ? '✓' : '○'} ACCOUNT
                </div>
                <div style={{ color: verificationState.signatureChecked ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.signatureChecked ? '✓' : '○'} SIGNATURE
                </div>
                <div style={{ color: verificationState.identityVerified ? '#00ff00' : '#ffaa00' }}>
                  {verificationState.identityVerified ? '✓' : '○'} IDENTITY
                </div>
                {currentCustomer.transactionType === 'WIRE_TRANSFER' && (
                  <div style={{ color: verificationState.destinationVerified ? '#00ff00' : '#ffaa00' }}>
                    {verificationState.destinationVerified ? '✓' : '○'} DESTINATION
                  </div>
                )}
                {currentCustomer.transactionType === 'WITHDRAWAL' && (
                  <div style={{ color: verificationState.balanceConfirmed ? '#00ff00' : '#ffaa00' }}>
                    {verificationState.balanceConfirmed ? '✓' : '○'} BALANCE
                  </div>
                )}
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
                handleCommand('LOOKUP');
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
                handleCommand('APPROVE');
                playSound('button_click');
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
                handleCommand('REJECT');
                playSound('button_click');
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

          {/* Terminal Input */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>&gt;</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter command..."
              onKeyPress={handleKeyPress}
              style={{
                flex: 1,
                background: '#000000',
                border: '1px solid #00ff00',
                color: '#00ff00',
                padding: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none'
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