import React, { useState, useEffect, useRef } from 'react';

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

interface BankRecord {
  name: string;
  dob: string;
  address: string;
  signature: string;
  balance: number;
  photo: string;
  accountStatus: string;
}

function App() {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "========================================",
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "FRAUD DETECTION: ACTIVE",
    "========================================",
    "",
    "SYSTEM READY - AWAITING CUSTOMER",
    "Type HELP for commands"
  ]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [gameState, setGameState] = useState({
    score: 0,
    transactions: 0,
    correctDecisions: 0,
    totalDecisions: 0
  });
  const [bankDatabase] = useState<Record<string, BankRecord>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    }
  };

  // Sound effects with Web Audio API
  const createTypewriterSound = async (frequency = 800, duration = 0.1) => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency + Math.random() * 200, audioContextRef.current.currentTime);
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (e) {
      // Silent fail for audio
    }
  };

  const playStampSound = async () => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.3);
    } catch (e) {
      // Silent fail
    }
  };

  const playBuzzerSound = async () => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(150, audioContextRef.current.currentTime);
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
    } catch (e) {
      // Silent fail
    }
  };

  // Customer generation data
  const firstNames = ['John', 'Mary', 'Robert', 'Patricia', 'James', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark'];
  const streets = ['Main St', 'Oak Ave', 'Pine St', 'Elm Dr', 'Cedar Ln', 'Maple Rd', 'Birch St', 'Willow Ave', 'Cherry St', 'Poplar Dr'];

  const generateCustomer = (): Customer => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const accountNumber = String(Math.floor(Math.random() * 900000000) + 100000000);
    
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const street = streets[Math.floor(Math.random() * streets.length)];
    const address = `${streetNumber} ${street}, Springfield`;
    
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - (Math.floor(Math.random() * 50) + 21);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const dob = `${birthYear}-${month}-${day}`;
    
    const transactionTypes = ['WITHDRAWAL', 'DEPOSIT', 'WIRE TRANSFER', 'CASHIERS CHECK'];
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    
    let amount;
    switch (transactionType) {
      case 'WITHDRAWAL':
        amount = Math.floor(Math.random() * 2000) + 50;
        break;
      case 'DEPOSIT':
        amount = Math.floor(Math.random() * 5000) + 100;
        break;
      case 'WIRE TRANSFER':
        amount = Math.floor(Math.random() * 25000) + 1000;
        break;
      case 'CASHIERS CHECK':
        amount = Math.floor(Math.random() * 10000) + 500;
        break;
      default:
        amount = 100;
    }
    
    const correctSignature = name;
    const signatureVariations = [
      name + ' Jr',
      firstName + ' ' + lastName.slice(0, -1) + 'z',
      firstName.charAt(0) + '. ' + lastName,
      name + ' Sr',
      firstName + ' ' + lastName + ' II'
    ];
    
    const isFraud = Math.random() < 0.3;
    const fraudType = isFraud ? Math.floor(Math.random() * 3) : -1;
    
    // Store in bank database
    bankDatabase[accountNumber] = {
      name: name,
      dob: dob,
      address: address,
      signature: correctSignature,
      balance: Math.floor(Math.random() * 50000) + 1000,
      photo: `[Photo of ${firstName}, ${currentYear - birthYear} years old]`,
      accountStatus: 'ACTIVE'
    };
    
    const documents: Document[] = [];
    
    let formSignature = correctSignature;
    let formAmount = amount;
    let formAccount = accountNumber;
    
    if (fraudType === 0) {
      formSignature = signatureVariations[Math.floor(Math.random() * signatureVariations.length)];
    } else if (fraudType === 1) {
      formAmount = amount + Math.floor(Math.random() * 500) + 50;
    } else if (fraudType === 2) {
      formAccount = String(Math.floor(Math.random() * 900000000) + 100000000);
    }
    
    documents.push({
      type: 'TRANSACTION_FORM',
      title: `${transactionType} REQUEST FORM`,
      data: {
        customerName: name,
        accountNumber: formAccount,
        transactionType: transactionType,
        amount: formAmount,
        signature: formSignature,
        date: '2024-06-01'
      }
    });
    
    documents.push({
      type: 'DRIVERS_LICENSE',
      title: 'DRIVERS LICENSE',
      data: {
        name: name,
        dob: dob,
        address: address,
        licenseNumber: 'DL-' + Math.floor(Math.random() * 99999).toString().padStart(5, '0'),
        expiration: '2026-12-31'
      }
    });
    
    if (transactionType === 'WIRE TRANSFER') {
      documents.push({
        type: 'PASSPORT',
        title: 'US PASSPORT',
        data: {
          name: name,
          dob: dob,
          passportNumber: 'US' + Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
          issued: '2020-01-01',
          expiration: '2030-01-01'
        }
      });
    }
    
    documents.push({
      type: 'SIGNATURE',
      title: 'SIGNATURE VERIFICATION',
      data: {
        signature: formSignature
      }
    });
    
    return {
      name,
      accountNumber,
      transactionType,
      requestedAmount: amount,
      documents,
      isFraud,
      fraudType
    };
  };

  const typeMessage = (text: string) => {
    let i = 0;
    const outputElement = document.createElement('div');
    setTerminalOutput(prev => [...prev, '']);
    
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        outputElement.textContent += text.charAt(i);
        if (Math.random() > 0.7) {
          createTypewriterSound();
        }
        i++;
        
        setTerminalOutput(prev => {
          const newOutput = [...prev];
          newOutput[newOutput.length - 1] = outputElement.textContent || '';
          return newOutput;
        });
      } else {
        clearInterval(typeInterval);
      }
    }, 30 + Math.random() * 40);
  };

  const processCommand = (command: string) => {
    const parts = command.trim().toUpperCase().split(' ');
    const action = parts[0];
    const parameter = parts.slice(1).join(' ');
    
    setTerminalOutput(prev => [...prev, `BANK> ${command}`]);
    
    setTimeout(() => {
      switch (action) {
        case 'LOOKUP':
          if (parameter) {
            lookupAccount(parameter);
          } else {
            typeMessage('ERROR: Specify account number');
            playBuzzerSound();
          }
          break;
        case 'EXAMINE':
          if (parameter) {
            examineDocument(parameter);
          } else if (selectedDocument !== null) {
            examineDocument('SELECTED');
          } else {
            typeMessage('ERROR: Specify document type or select document');
            playBuzzerSound();
          }
          break;
        case 'VERIFY':
          if (parameter) {
            verifyAmount(parseInt(parameter));
          } else {
            typeMessage('ERROR: Specify amount to verify');
            playBuzzerSound();
          }
          break;
        case 'APPROVE':
          approveTransaction();
          break;
        case 'REJECT':
          rejectTransaction();
          break;
        case 'HELP':
          showHelp();
          break;
        case 'NEXT':
          loadNextCustomer();
          break;
        default:
          typeMessage('UNKNOWN COMMAND. Type HELP for available commands.');
          playBuzzerSound();
      }
    }, 200);
  };

  const lookupAccount = (accountNumber: string) => {
    typeMessage('Accessing bank database...');
    
    setTimeout(() => {
      const record = bankDatabase[accountNumber];
      if (record) {
        typeMessage('=== CUSTOMER RECORD ===');
        setTimeout(() => typeMessage(`NAME: ${record.name}`), 300);
        setTimeout(() => typeMessage(`DOB: ${record.dob}`), 600);
        setTimeout(() => typeMessage(`ADDRESS: ${record.address}`), 900);
        setTimeout(() => typeMessage(`PHOTO: ${record.photo}`), 1200);
        setTimeout(() => typeMessage(`SIGNATURE ON FILE: ${record.signature}`), 1500);
        setTimeout(() => typeMessage(`BALANCE: $${record.balance}`), 1800);
        setTimeout(() => typeMessage(`STATUS: ${record.accountStatus}`), 2100);
        setTimeout(() => typeMessage('=== END RECORD ==='), 2400);
      } else {
        typeMessage('ACCOUNT NOT FOUND');
        playBuzzerSound();
      }
    }, 800);
  };

  const examineDocument = (docType: string) => {
    if (!currentCustomer) {
      typeMessage('No customer present');
      return;
    }
    
    let doc;
    if (docType === 'SELECTED' && selectedDocument !== null) {
      doc = currentCustomer.documents[selectedDocument];
    } else {
      doc = currentCustomer.documents.find(d => 
        d.type === docType || d.title.includes(docType)
      );
    }
    
    if (!doc) {
      typeMessage('Document not found');
      playBuzzerSound();
      return;
    }
    
    createTypewriterSound(400, 0.3);
    typeMessage(`=== EXAMINING: ${doc.title} ===`);
    
    let delay = 400;
    Object.entries(doc.data).forEach(([key, value]) => {
      setTimeout(() => {
        const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
        typeMessage(`${label}: ${value}`);
      }, delay);
      delay += 300;
    });
    
    setTimeout(() => typeMessage('=== END DOCUMENT ==='), delay);
  };

  const verifyAmount = (amount: number) => {
    typeMessage(`VERIFYING AMOUNT: $${amount}`);
    createTypewriterSound(600, 0.5);
    
    setTimeout(() => {
      typeMessage('Amount verification complete');
      playStampSound();
    }, 1000);
  };

  const approveTransaction = () => {
    if (!currentCustomer) {
      typeMessage('No customer present');
      return;
    }
    
    playStampSound();
    typeMessage('TRANSACTION APPROVED');
    typeMessage('Processing...');
    
    setTimeout(() => {
      const isCorrect = !currentCustomer.isFraud;
      
      setGameState(prev => ({
        ...prev,
        transactions: prev.transactions + 1,
        totalDecisions: prev.totalDecisions + 1,
        score: prev.score + (isCorrect ? 100 : -50),
        correctDecisions: prev.correctDecisions + (isCorrect ? 1 : 0)
      }));
      
      if (isCorrect) {
        typeMessage('✓ CORRECT DECISION - Valid transaction approved');
      } else {
        typeMessage('✗ INCORRECT DECISION - Fraudulent transaction approved!');
        playBuzzerSound();
      }
      
      setTimeout(() => {
        typeMessage('Customer leaves. Type NEXT for next customer.');
      }, 2000);
    }, 2000);
  };

  const rejectTransaction = () => {
    if (!currentCustomer) {
      typeMessage('No customer present');
      return;
    }
    
    playBuzzerSound();
    typeMessage('TRANSACTION REJECTED');
    typeMessage('Notifying security...');
    
    setTimeout(() => {
      const isCorrect = currentCustomer.isFraud;
      
      setGameState(prev => ({
        ...prev,
        transactions: prev.transactions + 1,
        totalDecisions: prev.totalDecisions + 1,
        score: prev.score + (isCorrect ? 100 : -50),
        correctDecisions: prev.correctDecisions + (isCorrect ? 1 : 0)
      }));
      
      if (isCorrect) {
        typeMessage('✓ CORRECT DECISION - Fraudulent transaction rejected');
      } else {
        typeMessage('✗ INCORRECT DECISION - Valid transaction rejected!');
      }
      
      setTimeout(() => {
        typeMessage('Customer leaves. Type NEXT for next customer.');
      }, 2000);
    }, 2000);
  };

  const showHelp = () => {
    typeMessage('=== BANK TELLER COMMANDS ===');
    setTimeout(() => typeMessage('LOOKUP [account] - Look up customer in database'), 200);
    setTimeout(() => typeMessage('EXAMINE [document] - Examine document details'), 400);
    setTimeout(() => typeMessage('VERIFY [amount] - Verify transaction amount'), 600);
    setTimeout(() => typeMessage('APPROVE - Approve the transaction'), 800);
    setTimeout(() => typeMessage('REJECT - Reject the transaction'), 1000);
    setTimeout(() => typeMessage('NEXT - Load next customer'), 1200);
    setTimeout(() => typeMessage('HELP - Show this help'), 1400);
  };

  const loadNextCustomer = () => {
    const customer = generateCustomer();
    setCurrentCustomer(customer);
    setSelectedDocument(null);
    
    typeMessage('NEW CUSTOMER APPROACHING WINDOW');
    setTimeout(() => {
      typeMessage(`Customer requests: "${customer.transactionType} of $${customer.requestedAmount}"`);
    }, 1000);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = e.currentTarget.value;
      if (command.trim()) {
        await initAudio(); // Initialize audio on first interaction
        processCommand(command);
        e.currentTarget.value = '';
      }
    }
  };

  const handleDocumentClick = async (index: number) => {
    await initAudio();
    setSelectedDocument(index);
    createTypewriterSound(600, 0.2);
    typeMessage(`Document selected: ${currentCustomer?.documents[index].title}`);
  };

  useEffect(() => {
    setTimeout(() => {
      loadNextCustomer();
    }, 2000);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const accuracy = gameState.totalDecisions > 0 ? 
    Math.round((gameState.correctDecisions / gameState.totalDecisions) * 100) : 100;

  return (
    <div style={{
      fontFamily: 'Courier New, monospace',
      background: 'radial-gradient(circle, #002200 0%, #000 100%)',
      color: '#00ff00',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
      overflow: 'hidden'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '10px',
        border: '2px solid #00ff00',
        padding: '8px',
        background: 'rgba(0, 50, 0, 0.3)',
        fontSize: '14px'
      }}>
        <h3 style={{ margin: 0 }}>FIRST NATIONAL BANK - TELLER STATION #3</h3>
        <div>SYSTEM VERSION 2.1 - FRAUD DETECTION ENABLED</div>
      </div>
      
      <div style={{ display: 'flex', flex: 1, gap: '10px', minHeight: 0 }}>
        <div style={{
          flex: 1,
          border: '2px solid #00ff00',
          padding: '10px',
          background: 'rgba(0, 40, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>CUSTOMER WINDOW</h4>
          <div style={{
            background: 'rgba(0, 60, 0, 0.3)',
            border: '1px solid #006600',
            padding: '8px',
            marginBottom: '10px',
            fontSize: '12px'
          }}>
            {currentCustomer ? (
              <>
                <strong>CUSTOMER:</strong> {currentCustomer.name}<br/>
                <strong>REQUEST:</strong> {currentCustomer.transactionType}<br/>
                <strong>AMOUNT:</strong> ${currentCustomer.requestedAmount}<br/>
                <strong>ACCOUNT:</strong> {currentCustomer.accountNumber}
              </>
            ) : (
              <div>Waiting for next customer...</div>
            )}
          </div>
          
          <h5 style={{ margin: '0 0 8px 0' }}>DOCUMENTS PROVIDED:</h5>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {currentCustomer?.documents.map((doc, index) => (
              <div
                key={index}
                style={{
                  background: selectedDocument === index ? 'rgba(0, 120, 0, 0.5)' : 'rgba(0, 50, 0, 0.2)',
                  border: selectedDocument === index ? '1px solid #00aa00' : '1px solid #005500',
                  padding: '6px',
                  margin: '3px 0',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontSize: '11px'
                }}
                onClick={() => handleDocumentClick(index)}
              >
                <strong>{doc.title}</strong><br/>
                <small>Click to select - Type EXAMINE to view details</small>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{
          flex: 1,
          border: '2px solid #00ff00',
          padding: '10px',
          background: 'rgba(0, 40, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>BANK TERMINAL</h4>
          <div style={{
            flex: 1,
            background: '#001100',
            border: '1px solid #004400',
            padding: '8px',
            overflowY: 'auto',
            marginBottom: '8px',
            fontSize: '12px',
            lineHeight: '1.3'
          }}>
            {terminalOutput.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#001100',
            border: '1px solid #004400',
            padding: '6px',
            fontSize: '12px'
          }}>
            <span style={{ marginRight: '8px', color: '#00ff00' }}>BANK&gt;</span>
            <input
              ref={inputRef}
              type="text"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#00ff00',
                fontFamily: 'inherit',
                fontSize: '12px',
                outline: 'none'
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              placeholder="Type commands here..."
            />
          </div>
          
          <div style={{
            fontSize: '10px',
            color: '#00aa00',
            marginTop: '5px',
            padding: '3px'
          }}>
            COMMANDS: HELP | LOOKUP [account] | EXAMINE [doc] | VERIFY [amount] | APPROVE | REJECT | NEXT
          </div>
        </div>
      </div>
      
      <div style={{
        background: 'rgba(0, 60, 0, 0.8)',
        border: '1px solid #006600',
        padding: '5px',
        marginTop: '5px',
        textAlign: 'center',
        fontSize: '11px'
      }}>
        Score: {gameState.score} | Transactions: {gameState.transactions} | Accuracy: {accuracy}% | Time: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default App;
