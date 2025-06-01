import React, { useState, useRef } from 'react';

interface Customer {
  name: string;
  accountNumber: string;
  transactionType: string;
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
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Type NEXT to call customer"
  ]);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateCustomer = (): Customer => {
    const names = ["Sarah L. Williams", "Michael Johnson", "Jennifer Rodriguez", "David Chen", "Emily Davis"];
    const transactionTypes = ["DEPOSIT", "WITHDRAWAL", "TRANSFER"];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const accountNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const requestedAmount = Math.floor(100 + Math.random() * 5000);
    
    const documents: Document[] = [
      {
        type: "ID",
        title: "Driver's License",
        data: {
          name: name,
          licenseNumber: `DL-${Math.floor(10000 + Math.random() * 90000)}`,
          dateOfBirth: "1985-03-15",
          address: "123 Main Street, Springfield, IL 62701"
        }
      },
      {
        type: "SLIP",
        title: "Transaction Slip",
        data: {
          accountNumber: accountNumber,
          amount: requestedAmount,
          transactionType: transactionType,
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
      documents,
      isFraud: Math.random() < 0.3,
      fraudType: Math.floor(Math.random() * 5)
    };
  };

  const handleCommand = (command: string) => {
    const cmd = command.trim().toUpperCase();
    
    if (cmd === 'NEXT') {
      const customer = generateCustomer();
      setCurrentCustomer(customer);
      setTerminalOutput(prev => [...prev, `> ${command}`, `Customer ${customer.name} approaching window...`]);
      console.log("Generated customer:", customer);
    } else if (cmd === 'HELP') {
      setTerminalOutput(prev => [...prev, `> ${command}`, "Available commands:", "NEXT - Call next customer", "LOOKUP - Check account", "APPROVE - Approve transaction", "REJECT - Reject transaction"]);
    } else {
      setTerminalOutput(prev => [...prev, `> ${command}`, "Command executed"]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputRef.current) {
      const command = inputRef.current.value;
      if (command.trim()) {
        handleCommand(command);
        inputRef.current.value = '';
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
      
      {/* Customer Information - Top Priority */}
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
          <div style={{ fontSize: '14px', color: '#00aaff' }}>Type NEXT to call customer</div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, gap: '12px', minHeight: 0 }}>
        
        {/* Documents Section */}
        <div style={{
          flex: 1,
          background: 'rgba(0, 30, 0, 0.4)',
          border: '2px solid #00ff00',
          padding: '12px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#00ff00' }}>DOCUMENTS PROVIDED</h3>
          
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
          padding: '12px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#00ff00' }}>TERMINAL</h3>
          
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

          {/* Command Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button
              onClick={() => handleCommand('NEXT')}
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
              onClick={() => handleCommand('LOOKUP')}
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
              onClick={() => handleCommand('APPROVE')}
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
              onClick={() => handleCommand('REJECT')}
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
    </div>
  );
}

export default App;