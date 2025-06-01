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
  const [documentModal, setDocumentModal] = useState<{ isOpen: boolean; docIndex: number | null }>({ isOpen: false, docIndex: null });
  const [signatureModal, setSignatureModal] = useState<{ isOpen: boolean; customerSig: string; fileSig: string }>({ isOpen: false, customerSig: '', fileSig: '' });
  const [gameState, setGameState] = useState({
    score: 0,
    transactions: 0,
    correctDecisions: 0,
    totalDecisions: 0
  });
  const [bankDatabase] = useState<Record<string, BankRecord>>({
    "720997541": {
      name: "Jennifer M. Rodriguez",
      dob: "1975-01-06",
      address: "4521 Oak Street, Springfield, IL 62701",
      signature: "Jennifer Rodriguez",
      balance: 12650.00,
      photo: "Photo ID: Female, Brown hair, Green eyes",
      accountStatus: "ACTIVE"
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    }
  };

  // ASMR Sound Effects - Fixed Implementation
  const playTypingSound = async () => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(800 + Math.random() * 200, audioContextRef.current.currentTime);
      oscillator.type = 'triangle';
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.12);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.12);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const playPaperRustleSound = async () => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const whiteNoise = audioContextRef.current.createBufferSource();
      const buffer = audioContextRef.current.createBuffer(1, 2205, audioContextRef.current.sampleRate);
      const output = buffer.getChannelData(0);
      
      for (let i = 0; i < 2205; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.08;
      }
      
      whiteNoise.buffer = buffer;
      const gainNode = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, audioContextRef.current.currentTime);
      filter.Q.setValueAtTime(0.8, audioContextRef.current.currentTime);
      
      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      gainNode.gain.setValueAtTime(0.12, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.25);
      
      whiteNoise.start();
      whiteNoise.stop(audioContextRef.current.currentTime + 0.25);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Proper ASMR sound effects
  const playApprovalStamp = () => {
    console.log('Approval stamp sound');
    // Create a brief mechanical stamp sound
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.frequency.setValueAtTime(80, audioContextRef.current.currentTime);
        osc.type = 'square';
        gain.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.3);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.3);
      } catch (e) {}
    }
  };

  const playRejectBuzz = () => {
    console.log('Reject buzz sound');
    // Create a low mechanical buzz
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.frequency.setValueAtTime(150, audioContextRef.current.currentTime);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.4);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.4);
      } catch (e) {}
    }
  };

  const playSoftClick = () => {
    console.log('Soft click sound');
    // Create a gentle page turn/click
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.frequency.setValueAtTime(1200, audioContextRef.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioContextRef.current.currentTime + 0.05);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.1);
      } catch (e) {}
    }
  };

  const playTerminalEnter = () => {
    // Soft terminal enter ping
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.06, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.15);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.15);
      } catch (e) {}
    }
  };

  const playDataBeep = () => {
    // Faint data beep for successful lookups
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.frequency.setValueAtTime(1000, audioContextRef.current.currentTime);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.2);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.2);
      } catch (e) {}
    }
  };

  const playGlitchTone = () => {
    // Short glitch tone for invalid commands
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
        osc.frequency.setValueAtTime(300, audioContextRef.current.currentTime + 0.05);
        osc.type = 'square';
        gain.gain.setValueAtTime(0.07, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.1);
      } catch (e) {}
    }
  };

  const playPaperRustle = () => {
    // Gentle paper rustle for opening documents
    if (audioContextRef.current) {
      try {
        const noise = audioContextRef.current.createBufferSource();
        const buffer = audioContextRef.current.createBuffer(1, 1102, audioContextRef.current.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < 1102; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.05;
        }
        
        noise.buffer = buffer;
        const gain = audioContextRef.current.createGain();
        const filter = audioContextRef.current.createBiquadFilter();
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, audioContextRef.current.currentTime);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioContextRef.current.destination);
        
        gain.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.3);
        
        noise.start();
        noise.stop(audioContextRef.current.currentTime + 0.3);
      } catch (e) {}
    }
  };

  const playKeyClick = () => {
    // Light mechanical key click
    if (audioContextRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        const filter = audioContextRef.current.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContextRef.current.destination);
        
        osc.frequency.setValueAtTime(1000 + Math.random() * 300, audioContextRef.current.currentTime);
        osc.type = 'triangle';
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(500, audioContextRef.current.currentTime);
        
        gain.gain.setValueAtTime(0.04, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.08);
        
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.08);
      } catch (e) {}
    }
  };

  const playRejectBuzzSound = async () => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(180, audioContextRef.current.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(120, audioContextRef.current.currentTime + 0.3);
      oscillator.type = 'square';
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.6);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.6);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const playMagneticClickSound = async () => {
    await initAudio();
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(1500, audioContextRef.current.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContextRef.current.currentTime + 0.05);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.08);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.08);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Generate random customer
  const generateCustomer = (): Customer => {
    const names = ['Jennifer M. Rodriguez', 'Michael K. Thompson', 'Sarah L. Williams', 'David R. Johnson'];
    const accounts = ['720997541', '820441562', '910332874', '651447890'];
    const transactions = ['WITHDRAWAL', 'DEPOSIT', 'TRANSFER'];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const accountNumber = accounts[Math.floor(Math.random() * accounts.length)];
    const transactionType = transactions[Math.floor(Math.random() * transactions.length)];
    const requestedAmount = Math.floor(Math.random() * 5000) + 100;
    
    const isFraud = Math.random() < 0.3;
    
    const documents: Document[] = [
      {
        type: 'ID',
        title: 'Driver\'s License',
        data: {
          name: isFraud ? 'Jane Smith' : name,
          licenseNumber: 'DL-' + Math.floor(Math.random() * 100000),
          dateOfBirth: isFraud ? '1980-05-15' : '1975-01-06',
          address: '4521 Oak Street, Springfield, IL 62701'
        }
      },
      {
        type: 'SLIP',
        title: 'Transaction Slip',
        data: {
          accountNumber: accountNumber,
          amount: requestedAmount,
          transactionType: transactionType,
          date: new Date().toLocaleDateString()
        }
      },
      {
        type: 'SIGNATURE',
        title: 'Signature Card',
        data: {
          signature: isFraud ? 'Jane Smith' : 'Jennifer Rodriguez'
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
      fraudType: isFraud ? Math.floor(Math.random() * 3) + 1 : 0
    };
  };

  // Enhanced terminal typing with sound
  const typeMessage = (text: string) => {
    let i = 0;
    const outputElement = document.createElement('div');
    setTerminalOutput(prev => [...prev, '']);
    
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        outputElement.textContent += text.charAt(i);
        // Add subtle key click sound occasionally
        if (Math.random() > 0.8) {
          playKeyClick();
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

  const checkDocuments = () => {
    if (!currentCustomer) {
      typeMessage('No customer present');
      playGlitchTone();
      return;
    }
    
    typeMessage('SCANNING DOCUMENTS...');
    playDataBeep();
    
    setTimeout(() => {
      const docs = currentCustomer.documents;
      typeMessage(`FOUND ${docs.length} DOCUMENTS:`);
      docs.forEach((doc, index) => {
        setTimeout(() => {
          typeMessage(`${index + 1}. ${doc.title} (${doc.type})`);
        }, 300 * (index + 1));
      });
      
      setTimeout(() => {
        typeMessage('DOCUMENT SCAN COMPLETE');
      }, 300 * (docs.length + 2));
    }, 1000);
  };

  // Command processing
  const processCommand = (command: string) => {
    const parts = command.trim().toUpperCase().split(' ');
    const action = parts[0];
    const parameter = parts.slice(1).join(' ');
    
    setTerminalOutput(prev => [...prev, `BANK> ${command}`]);
    playTerminalEnter();
    
    setTimeout(() => {
      switch (action) {
        case 'LOOKUP':
          if (parameter) {
            lookupAccount(parameter);
          } else {
            typeMessage('ERROR: Specify account number');
            playGlitchTone();
          }
          break;
        case 'EXAMINE':
          if (parameter) {
            examineDocument(parameter);
          } else if (selectedDocument !== null) {
            examineDocument('SELECTED');
          } else {
            typeMessage('ERROR: Specify document type or select document');
            playGlitchTone();
          }
          break;
        case 'VERIFY':
          if (parameter === 'NAME') {
            compareField('NAME');
          } else if (parameter === 'DOB') {
            compareField('DOB');
          } else if (parameter === 'SIGNATURE') {
            compareField('SIGNATURE');
          } else if (parameter && !isNaN(parseInt(parameter))) {
            verifyAmount(parseInt(parameter));
          } else {
            typeMessage('ERROR: Specify NAME, DOB, SIGNATURE, or amount');
            playGlitchTone();
          }
          break;
        case 'SEND':
          const sendParts = parameter.split(' TO ');
          if (sendParts.length === 2) {
            const amount = parseInt(sendParts[0]);
            const account = sendParts[1];
            typeMessage(`WIRE TRANSFER: $${amount} to account ${account}`);
            typeMessage('Wire transfer initiated...');
            playDataBeep();
          } else {
            typeMessage('ERROR: Use format SEND [amount] TO [account]');
            playGlitchTone();
          }
          break;
        case 'DEPOSIT':
          if (parameter && !isNaN(parseInt(parameter))) {
            typeMessage(`DEPOSIT TRANSACTION: $${parameter}`);
            playDataBeep();
          } else {
            typeMessage('ERROR: Specify deposit amount');
            playGlitchTone();
          }
          break;
        case 'WITHDRAW':
          if (parameter && !isNaN(parseInt(parameter))) {
            typeMessage(`WITHDRAWAL TRANSACTION: $${parameter}`);
            playDataBeep();
          } else {
            typeMessage('ERROR: Specify withdrawal amount');
            playGlitchTone();
          }
          break;
        case 'CHECK':
          if (parameter === 'FORM') {
            checkDocuments();
          } else {
            typeMessage('ERROR: Use CHECK FORM to scan documents');
            playGlitchTone();
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
          playGlitchTone();
      }
    }, 200);
  };

  const lookupAccount = (accountNumber: string) => {
    typeMessage(`LOOKING UP ACCOUNT: ${accountNumber}`);
    
    setTimeout(() => {
      const record = bankDatabase[accountNumber];
      if (record) {
        typeMessage('=== ACCOUNT RECORD FOUND ===');
        setTimeout(() => typeMessage(`NAME: ${record.name}`), 400);
        setTimeout(() => typeMessage(`DOB: ${record.dob}`), 800);
        setTimeout(() => typeMessage(`ADDRESS: ${record.address}`), 1200);
        setTimeout(() => typeMessage(`PHOTO: ${record.photo}`), 1600);
        setTimeout(() => typeMessage(`SIGNATURE ON FILE: ${record.signature}`), 2000);
        setTimeout(() => typeMessage(`BALANCE: $${record.balance}`), 2400);
        setTimeout(() => typeMessage(`STATUS: ${record.accountStatus}`), 2800);
        setTimeout(() => typeMessage('=== END RECORD ==='), 3200);
      } else {
        typeMessage('ACCOUNT NOT FOUND');
        playRejectBuzzSound();
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
      playRejectBuzzSound();
      return;
    }
    
    playPaperRustleSound();
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

  const compareField = (field: string) => {
    if (!currentCustomer) {
      typeMessage('No customer present');
      playRejectBuzzSound();
      return;
    }

    const accountRecord = bankDatabase[currentCustomer.accountNumber];
    if (!accountRecord) {
      typeMessage('Account record not loaded. Use LOOKUP first.');
      playRejectBuzzSound();
      return;
    }
    
    switch (field.toUpperCase()) {
      case 'DOB':
        const idDoc = currentCustomer.documents.find(d => d.type === 'ID');
        if (idDoc && idDoc.data.dateOfBirth) {
          typeMessage('=== DOB COMPARISON ===');
          setTimeout(() => typeMessage(`DOCUMENT: ${idDoc.data.dateOfBirth}`), 300);
          setTimeout(() => typeMessage(`ON FILE: ${accountRecord.dob}`), 600);
          setTimeout(() => {
            const match = idDoc.data.dateOfBirth === accountRecord.dob;
            typeMessage(`MATCH: ${match ? 'YES' : 'NO'}`);
            if (!match) playRejectBuzzSound();
          }, 900);
        } else {
          typeMessage('No ID document with DOB found');
        }
        break;

      case 'NAME':
        typeMessage('=== NAME COMPARISON ===');
        setTimeout(() => typeMessage(`CUSTOMER: ${currentCustomer.name}`), 300);
        setTimeout(() => typeMessage(`ON FILE: ${accountRecord.name}`), 600);
        setTimeout(() => {
          const match = currentCustomer.name === accountRecord.name;
          typeMessage(`MATCH: ${match ? 'YES' : 'NO'}`);
          if (!match) playRejectBuzzSound();
        }, 900);
        break;

      case 'SIGNATURE':
        const sigDoc = currentCustomer.documents.find(d => d.type === 'SIGNATURE');
        if (sigDoc && sigDoc.data.signature) {
          openSignatureComparison();
        } else {
          typeMessage('No signature document found');
        }
        break;

      default:
        typeMessage('Unknown field. Valid: DOB, NAME, SIGNATURE');
        playRejectBuzzSound();
    }
  };

  const verifyAmount = (amount: number) => {
    typeMessage(`VERIFYING AMOUNT: $${amount}`);
    
    setTimeout(() => {
      if (currentCustomer && amount === currentCustomer.requestedAmount) {
        typeMessage(`AMOUNT VERIFIED: $${amount} matches request`);
        playApprovalStamp();
      } else {
        typeMessage(`AMOUNT MISMATCH: Expected $${currentCustomer?.requestedAmount}, got $${amount}`);
        playRejectBuzz();
      }
    }, 1000);
  };

  const approveTransaction = () => {
    if (!currentCustomer) {
      typeMessage('No customer present');
      return;
    }
    
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
        playRejectBuzzSound();
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
    
    playRejectBuzzSound();
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
        playRejectBuzzSound();
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
    setTimeout(() => typeMessage('COMPARE [field] - Compare DOB, NAME, or SIGNATURE'), 600);
    setTimeout(() => typeMessage('VERIFY [amount] - Verify transaction amount'), 800);
    setTimeout(() => typeMessage('APPROVE - Approve the transaction'), 1000);
    setTimeout(() => typeMessage('REJECT - Reject the transaction'), 1200);
    setTimeout(() => typeMessage('NEXT - Load next customer'), 1400);
    setTimeout(() => typeMessage('HELP - Show this help'), 1600);
  };

  const loadNextCustomer = () => {
    console.log('Loading next customer...');
    try {
      const customer = generateCustomer();
      console.log('Generated customer:', customer);
      setCurrentCustomer(customer);
      setSelectedDocument(null);
      
      typeMessage('NEW CUSTOMER APPROACHING WINDOW');
      setTimeout(() => {
        typeMessage(`Customer requests: "${customer.transactionType} of $${customer.requestedAmount}"`);
      }, 1000);
    } catch (error) {
      console.error('Error generating customer:', error);
      typeMessage('ERROR: Could not generate customer');
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = e.currentTarget.value;
      if (command.trim()) {
        await initAudio();
        processCommand(command);
        e.currentTarget.value = '';
      }
    } else {
      // Play key click sound for typing
      if (Math.random() > 0.7) {
        await initAudio();
        playKeyClick();
      }
    }
  };

  const handleDocumentClick = async (index: number) => {
    await initAudio();
    setSelectedDocument(index);
    playPaperRustleSound();
    setDocumentModal({ isOpen: true, docIndex: index });
    typeMessage(`Document selected: ${currentCustomer?.documents[index].title}`);
  };

  const openSignatureComparison = () => {
    if (!currentCustomer) return;
    const customerDoc = currentCustomer.documents.find(d => d.type === 'SIGNATURE');
    const accountRecord = bankDatabase[currentCustomer.accountNumber];
    
    if (customerDoc && accountRecord) {
      setSignatureModal({
        isOpen: true,
        customerSig: customerDoc.data.signature as string,
        fileSig: accountRecord.signature
      });
    }
  };

  const accuracy = gameState.totalDecisions > 0 ? 
    Math.round((gameState.correctDecisions / gameState.totalDecisions) * 100) : 100;

  return (
    <div className="crt-effect" style={{
      fontFamily: 'Courier New, monospace',
      background: 'radial-gradient(circle, #002200 0%, #000 100%)',
      color: '#00ff00',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
      overflow: 'hidden',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '8px',
        border: '2px solid #00ff00',
        padding: '12px',
        background: 'rgba(0, 50, 0, 0.3)',
        fontSize: '18px'
      }}>
        <h3 style={{ margin: 0, fontSize: '20px' }}>FIRST NATIONAL BANK - TELLER STATION #3</h3>
        <div style={{ fontSize: '16px' }}>SYSTEM VERSION 2.1 - FRAUD DETECTION ENABLED</div>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        padding: '8px',
        background: 'rgba(0, 40, 0, 0.3)',
        border: '1px solid #00ff00',
        fontSize: '14px'
      }}>
        <span>SCORE: {gameState.score}</span>
        <span>TRANSACTIONS: {gameState.transactions}</span>
        <span>ACCURACY: {accuracy}%</span>
      </div>
      
      {/* Main Content Area */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        gap: '4px', 
        minHeight: 0,
        flexDirection: window.innerWidth < 768 ? 'column' : 'row'
      }}>
        {/* Customer Area */}
        <div style={{
          width: window.innerWidth < 768 ? '100%' : '35%',
          height: window.innerWidth < 768 ? '25vh' : 'auto',
          border: '2px solid #00ff00',
          padding: '8px',
          background: 'rgba(0, 40, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>CUSTOMER WINDOW</h4>
          
          {/* Customer Info */}
          <div style={{
            background: 'rgba(0, 60, 0, 0.3)',
            border: '1px solid #006600',
            padding: '8px',
            marginBottom: '8px',
            fontSize: '12px',
            lineHeight: '1.3'
          }}>
            {currentCustomer ? (
              <>
                <strong>CUSTOMER:</strong> {currentCustomer.name}<br/>
                <strong>REQUEST:</strong> {currentCustomer.transactionType}<br/>
                <strong>AMOUNT:</strong> ${currentCustomer.requestedAmount}<br/>
                <strong>ACCOUNT:</strong> {currentCustomer.accountNumber}
              </>
            ) : (
              <div>Click NEXT for customer...</div>
            )}
          </div>
          
          {/* Documents */}
          <h5 style={{ margin: '0 0 8px 0' }}>DOCUMENTS PROVIDED:</h5>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {currentCustomer?.documents.map((doc, index) => (
              <div
                key={index}
                style={{
                  background: selectedDocument === index ? 'rgba(0, 120, 0, 0.5)' : 'rgba(0, 50, 0, 0.2)',
                  border: selectedDocument === index ? '2px solid #00aa00' : '1px solid #005500',
                  padding: '16px',
                  margin: '8px 0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '15px',
                  borderRadius: '6px',
                  minHeight: '48px'
                }}
                onClick={() => handleDocumentClick(index)}
              >
                <strong style={{ fontSize: '16px' }}>{doc.title}</strong><br/>
                <small style={{ color: '#00cc00', fontSize: '13px' }}>Tap to open document viewer</small>
              </div>
            ))}
          </div>
        </div>
        
        {/* Terminal Area */}
        <div style={{
          width: window.innerWidth < 768 ? '100%' : '65%',
          border: '2px solid #00ff00',
          padding: '8px',
          background: 'rgba(0, 40, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>BANK TERMINAL</h4>
          
          {/* Panel 1: Account Summary */}
          {currentCustomer && bankDatabase[currentCustomer.accountNumber] && (
            <div style={{
              background: 'rgba(0, 60, 0, 0.4)',
              border: '2px solid #006600',
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '4px'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#00ff00' }}>ACCOUNT SUMMARY</h5>
              <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                <strong>NAME:</strong> {bankDatabase[currentCustomer.accountNumber].name}<br/>
                <strong>DOB:</strong> {bankDatabase[currentCustomer.accountNumber].dob}<br/>
                <strong>ACCOUNT:</strong> {currentCustomer.accountNumber}<br/>
                <strong>SIGNATURE:</strong> <span 
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={openSignatureComparison}
                >
                  {bankDatabase[currentCustomer.accountNumber].signature} (click to view)
                </span><br/>
                <strong>BALANCE:</strong> ${bankDatabase[currentCustomer.accountNumber].balance}
              </div>
            </div>
          )}

          {/* Panel 2: Verification Actions */}
          {currentCustomer && (
            <div style={{
              background: 'rgba(0, 50, 0, 0.3)',
              border: '2px solid #005500',
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '4px'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#00ff00' }}>VERIFICATION ACTIONS</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    compareField('NAME');
                  }}
                  style={{
                    background: 'rgba(0, 80, 0, 0.5)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    minHeight: '40px'
                  }}
                >
                  Compare Name
                </button>
                <button
                  onClick={() => compareField('DOB')}
                  style={{
                    background: 'rgba(0, 80, 0, 0.5)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    minHeight: '40px'
                  }}
                >
                  Compare DOB
                </button>
                <button
                  onClick={() => compareField('SIGNATURE')}
                  style={{
                    background: 'rgba(0, 80, 0, 0.5)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    minHeight: '40px'
                  }}
                >
                  Compare Signature
                </button>
                <button
                  onClick={() => verifyAmount(currentCustomer.requestedAmount)}
                  style={{
                    background: 'rgba(0, 80, 0, 0.5)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    minHeight: '40px'
                  }}
                >
                  Verify Amount
                </button>
                <button
                  onClick={() => lookupAccount(currentCustomer.accountNumber)}
                  style={{
                    background: 'rgba(0, 80, 0, 0.5)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    minHeight: '40px'
                  }}
                >
                  Lookup Account
                </button>
                <button
                  onClick={() => examineDocument('SELECTED')}
                  style={{
                    background: 'rgba(0, 80, 0, 0.5)',
                    border: '1px solid #00aa00',
                    color: '#00ff00',
                    padding: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    minHeight: '40px'
                  }}
                >
                  Examine Doc
                </button>
              </div>
            </div>
          )}

          {/* Terminal Output */}
          <div style={{
            flex: 1,
            background: '#001100',
            border: '2px solid #004400',
            padding: '15px',
            overflowY: 'auto',
            marginBottom: '8px',
            fontSize: '14px',
            lineHeight: '1.4',
            fontWeight: 'bold'
          }}>
            {terminalOutput.map((line, index) => (
              <div key={index} style={{ marginBottom: '2px' }}>{line}</div>
            ))}
          </div>

          {/* Panel 3: Decision Zone */}
          <div style={{
            background: 'rgba(0, 40, 0, 0.5)',
            border: '2px solid #004400',
            padding: '12px',
            borderRadius: '4px'
          }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('APPROVE clicked');
                  playApprovalStamp();
                  approveTransaction();
                }}
                disabled={!currentCustomer}
                style={{
                  background: currentCustomer ? 'rgba(0, 150, 0, 0.7)' : 'rgba(80, 80, 80, 0.3)',
                  border: '2px solid #00aa00',
                  color: currentCustomer ? '#00ff00' : '#666',
                  padding: '16px 24px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: currentCustomer ? 'pointer' : 'not-allowed',
                  borderRadius: '6px',
                  minHeight: '48px',
                  flex: 1,
                  outline: 'none',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                APPROVE
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('REJECT clicked');
                  playRejectBuzz();
                  rejectTransaction();
                }}
                disabled={!currentCustomer}
                style={{
                  background: currentCustomer ? 'rgba(150, 0, 0, 0.7)' : 'rgba(80, 80, 80, 0.3)',
                  border: '2px solid #aa0000',
                  color: currentCustomer ? '#ff4444' : '#666',
                  padding: '16px 24px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: currentCustomer ? 'pointer' : 'not-allowed',
                  borderRadius: '6px',
                  minHeight: '48px',
                  flex: 1,
                  outline: 'none',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                REJECT
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('NEXT clicked');
                  playSoftClick();
                  loadNextCustomer();
                }}
                style={{
                  background: 'rgba(0, 0, 150, 0.7)',
                  border: '2px solid #0088ff',
                  color: '#00aaff',
                  padding: '16px 24px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  minHeight: '48px',
                  flex: 1,
                  outline: 'none',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                NEXT
              </button>
            </div>
          </div>

          {/* Command Input (smaller) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#001100',
            border: '1px solid #004400',
            padding: '8px',
            fontSize: '14px',
            marginTop: '8px',
            minHeight: '36px'
          }}>
            <span style={{ marginRight: '8px', color: '#00ff00', fontSize: '14px' }}>CMD&gt;</span>
            <input
              ref={inputRef}
              type="text"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#00ff00',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none'
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              placeholder="Optional commands..."
            />
          </div>
        </div>
      </div>
      
      {/* Half-Screen Document Modal */}
      {documentModal.isOpen && currentCustomer && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55vh',
          background: 'linear-gradient(135deg, #001100 0%, #003300 100%)',
          border: '3px solid #00ff00',
          borderTop: '3px solid #00ff00',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          color: '#00ff00',
          fontFamily: 'Courier New, monospace',
          transform: 'translateY(0)',
          transition: 'transform 0.3s ease-in-out'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px 20px',
            borderBottom: '2px solid #00ff00',
            background: 'rgba(0, 50, 0, 0.5)'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>
              DOCUMENT VIEWER - {currentCustomer.documents[documentModal.docIndex!].title}
            </h3>
            <button
              onClick={() => {
                playMagneticClickSound();
                setDocumentModal({ isOpen: false, docIndex: null });
              }}
              style={{
                background: 'rgba(255, 0, 0, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 18px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                minHeight: '44px'
              }}
            >
              CLOSE [ESC]
            </button>
          </div>
          
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            fontSize: '16px'
          }}>
            <div style={{
              background: 'rgba(0, 60, 0, 0.3)',
              border: '2px solid #006600',
              padding: '20px',
              borderRadius: '6px',
              fontSize: '16px',
              lineHeight: '1.6'
            }}>
              {Object.entries(currentCustomer.documents[documentModal.docIndex!].data).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '16px', borderBottom: '1px solid #004400', paddingBottom: '12px' }}>
                  <strong style={{ color: '#00aa00', fontSize: '18px' }}>
                    {key.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                  </strong>
                  <br/>
                  <span style={{ fontSize: '20px', marginLeft: '8px', fontWeight: 'bold' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signature Comparison Modal */}
      {signatureModal.isOpen && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(0, 40, 0, 0.95)',
            border: '3px solid #00ff00',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>SIGNATURE VERIFICATION</h3>
              <button
                onClick={() => {
                  playMagneticClickSound();
                  setSignatureModal({ isOpen: false, customerSig: '', fileSig: '' });
                }}
                style={{
                  background: 'rgba(255, 0, 0, 0.3)',
                  border: '1px solid #ff4444',
                  color: '#ff4444',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                CLOSE
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: '#00aa00', marginBottom: '12px' }}>CUSTOMER PROVIDED:</h4>
                <div style={{
                  background: 'rgba(0, 60, 0, 0.3)',
                  border: '2px solid #006600',
                  padding: '30px',
                  borderRadius: '4px',
                  fontSize: '24px',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {signatureModal.customerSig}
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ color: '#00aa00', marginBottom: '12px' }}>ON FILE:</h4>
                <div style={{
                  background: 'rgba(0, 60, 0, 0.3)',
                  border: '2px solid #006600',
                  padding: '30px',
                  borderRadius: '4px',
                  fontSize: '24px',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {signatureModal.fileSig}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', marginBottom: '12px', color: '#00aa00' }}>
                MANUAL VERIFICATION REQUIRED - COMPARE SIGNATURES CAREFULLY
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setSignatureModal({ isOpen: false, customerSig: '', fileSig: '' });
                    playApprovalStamp();
                    typeMessage('SIGNATURE VERIFIED - MATCH CONFIRMED');
                  }}
                  style={{
                    background: 'rgba(0, 150, 0, 0.5)',
                    border: '2px solid #00aa00',
                    color: '#00ff00',
                    padding: '12px 24px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                >
                  SIGNATURES MATCH
                </button>
                <button
                  onClick={() => {
                    setSignatureModal({ isOpen: false, customerSig: '', fileSig: '' });
                    playRejectBuzzSound();
                    typeMessage('SIGNATURE MISMATCH FLAGGED');
                  }}
                  style={{
                    background: 'rgba(150, 0, 0, 0.5)',
                    border: '2px solid #aa0000',
                    color: '#ff4444',
                    padding: '12px 24px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                >
                  SIGNATURES DON'T MATCH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;