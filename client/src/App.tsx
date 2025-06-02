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
    timeOnShift: 0
  });
  const [shiftStartTime, setShiftStartTime] = useState<number>(0);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    signatureCompared: false,
    transactionProcessed: false
  });
  const [signatureModal, setSignatureModal] = useState<{isOpen: boolean, signature: string}>({isOpen: false, signature: ''});
  const [currentStep, setCurrentStep] = useState<'lookup' | 'signature' | 'process' | 'approve'>('lookup');
  const [waitingForInput, setWaitingForInput] = useState<string>('');
  const [cardPosition, setCardPosition] = useState({ x: 50, y: 400 });
  const [cardInSlot, setCardInSlot] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const generateCustomer = (): Customer => {
    const names = ["Sarah L. Williams", "Michael Johnson", "Jennifer Rodriguez", "David Chen", "Emily Davis", "Robert Thompson", "Lisa Parker", "James Wilson", "Amanda Davis", "Christopher Lee"];
    const transactionTypes: Customer['transactionType'][] = ["DEPOSIT", "WITHDRAWAL", "WIRE_TRANSFER", "ACCOUNT_UPDATE", "INQUIRY"];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const baseAccountNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const requestedAmount = transactionType === 'INQUIRY' ? 0 : Math.floor(100 + Math.random() * 5000);
    const destinationAccount = transactionType === 'WIRE_TRANSFER' ? Math.floor(100000000 + Math.random() * 900000000).toString() : undefined;
    
    // 30% chance of fraud with subtle differences
    const isFraud = Math.random() < 0.3;
    const fraudType = Math.floor(Math.random() * 4); // 0: DOB, 1: address, 2: signature, 3: account
    
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
        case 0: // Wrong DOB - subtle date differences
          const fakeDOBs = ["1985-03-18", "1985-02-15", "1984-03-15", "1985-04-12", "1985-03-05"];
          documentDOB = fakeDOBs[Math.floor(Math.random() * fakeDOBs.length)];
          break;
        case 1: // Wrong address - similar but different
          const fakeAddresses = [
            "123 Main Street, Springfield, IL 62702", // Wrong zip
            "124 Main Street, Springfield, IL 62701", // Wrong number
            "123 Oak Street, Springfield, IL 62701",  // Wrong street
            "123 Main Street, Springfield, IN 62701"  // Wrong state
          ];
          documentAddress = fakeAddresses[Math.floor(Math.random() * fakeAddresses.length)];
          break;
        case 2: // Wrong signature - similar but slightly off
          const firstName = name.split(' ')[0];
          const lastName = name.split(' ')[name.split(' ').length - 1];
          const fakeSignatures = [
            firstName + " " + lastName.charAt(0) + ".",           // Last name abbreviated
            firstName.charAt(0) + ". " + lastName,               // First name abbreviated  
            firstName + " " + lastName + "son",                  // Extra letters
            firstName.slice(0, -1) + "ie " + lastName,          // Slightly different spelling
            firstName + " " + lastName.slice(0, -1) + "s"       // Modified last name
          ];
          documentSignature = fakeSignatures[Math.floor(Math.random() * fakeSignatures.length)];
          break;
        case 3: // Account number slightly off
          const accountDigits = systemAccountNumber.split('');
          const randomIndex = Math.floor(Math.random() * accountDigits.length);
          accountDigits[randomIndex] = Math.floor(Math.random() * 10).toString();
          documentAccountNumber = accountDigits.join('');
          break;
      }
    }
    
    const documents: Document[] = [
      {
        type: "ID",
        title: "Driver's License",
        data: {
          name: documentName,
          licenseNumber: "DL-" + Math.floor(10000 + Math.random() * 90000),
          dateOfBirth: documentDOB,
          address: documentAddress
        }
      },
      {
        type: "SLIP",
        title: transactionType === 'WIRE_TRANSFER' ? "Wire Transfer Request" : 
               transactionType === 'ACCOUNT_UPDATE' ? "Account Update Form" :
               transactionType === 'INQUIRY' ? "Balance Inquiry Form" : "Transaction Slip",
        data: {
          accountNumber: documentAccountNumber,
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
          signature: documentSignature
        }
      }
    ];

    return {
      name: systemName,           // System knows the real name
      accountNumber: systemAccountNumber, // System knows the real account
      transactionType,
      requestedAmount,
      destinationAccount,
      documents,                  // Documents may contain fraudulent info
      isFraud,
      fraudType
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
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      };

      const createNoise = (duration: number, volume: number = 0.05) => {
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        source.start(audioContext.currentTime);
      };

      switch (type) {
        case 'keypress':
          // Soft, satisfying keyboard click
          createTone(1800, 0.008, 0.03);
          createNoise(0.003, 0.008);
          setTimeout(() => createTone(1200, 0.006, 0.02), 2);
          break;
        case 'button_click':
          createTone(1200, 0.08, 0.1);
          setTimeout(() => createTone(800, 0.06, 0.08), 30);
          break;
        case 'terminal_confirm':
          createTone(1400, 0.12, 0.1);
          setTimeout(() => createTone(1600, 0.08, 0.06), 60);
          break;
        case 'customer_approach':
          createTone(600, 0.3, 0.08);
          setTimeout(() => createTone(700, 0.2, 0.06), 150);
          break;
        case 'database_lookup':
          createTone(1000, 0.15, 0.08);
          setTimeout(() => createTone(1100, 0.12, 0.06), 80);
          setTimeout(() => createTone(1200, 0.1, 0.04), 160);
          break;
        case 'approve':
          createTone(880, 0.2, 0.1);
          setTimeout(() => createTone(1100, 0.3, 0.12), 100);
          break;
        case 'reject':
          createTone(220, 0.3, 0.1);
          setTimeout(() => createTone(180, 0.25, 0.08), 150);
          break;
        case 'stamp':
          createNoise(0.05, 0.15);
          createTone(200, 0.08, 0.1);
          break;
        case 'paper_rustle':
          createNoise(0.2, 0.04);
          break;
        case 'dot_matrix_printer':
          // Authentic dot matrix printer sound for deposits
          for (let i = 0; i < 12; i++) {
            setTimeout(() => {
              createTone(1800 + (i % 3) * 200, 0.03, 0.06);
              createNoise(0.01, 0.02);
            }, i * 80);
          }
          break;
        case 'modal_close':
          createTone(800, 0.1, 0.05);
          break;
        case 'easter_melody':
          // Hidden melody Easter egg
          const melody = [440, 523, 659, 784, 659, 523, 440];
          melody.forEach((freq, i) => {
            setTimeout(() => createTone(freq, 0.3, 0.08), i * 200);
          });
          break;
        case 'retro_modem':
          // Classic dial-up modem sound
          createTone(1200, 0.5, 0.06);
          setTimeout(() => createTone(2400, 0.3, 0.04), 500);
          setTimeout(() => createNoise(0.8, 0.03), 800);
          break;
        case 'matrix_code':
          // Digital rain sound effect
          for (let i = 0; i < 20; i++) {
            setTimeout(() => {
              createTone(800 + Math.random() * 1000, 0.05, 0.03);
            }, i * 50);
          }
          break;
        case 'secret_unlock':
          // Secret unlock sound sequence
          createTone(659, 0.2, 0.08);
          setTimeout(() => createTone(880, 0.2, 0.08), 200);
          setTimeout(() => createTone(1108, 0.4, 0.1), 400);
          break;
        case 'card_insert':
          // Soft card insertion with friction
          createNoise(0.03, 0.1);
          createTone(1200, 0.05, 0.08);
          setTimeout(() => createTone(800, 0.04, 0.06), 50);
          break;
        case 'mechanical_whir':
          // Internal mechanism engaging
          createTone(400, 0.2, 0.12);
          setTimeout(() => createTone(450, 0.15, 0.1), 60);
          setTimeout(() => createTone(380, 0.1, 0.08), 120);
          break;
        case 'heavy_stamp':
          // Powerful stamp impact
          createTone(120, 0.4, 0.15);
          createNoise(0.2, 0.1);
          setTimeout(() => createTone(100, 0.3, 0.12), 40);
          break;
        case 'metal_clang':
          // Metal components settling
          createTone(800, 0.2, 0.08);
          setTimeout(() => createTone(600, 0.15, 0.06), 30);
          setTimeout(() => createTone(1000, 0.1, 0.04), 60);
          break;
        case 'spring_bounce':
          // Mechanical spring release
          createTone(600, 0.15, 0.05);
          setTimeout(() => createTone(700, 0.12, 0.04), 40);
          setTimeout(() => createTone(650, 0.08, 0.03), 80);
          break;
        case 'completion_bell':
          // Satisfying completion chime
          createTone(1200, 0.3, 0.2);
          setTimeout(() => createTone(1600, 0.25, 0.15), 100);
          setTimeout(() => createTone(2000, 0.2, 0.1), 200);
          break;
        case 'check_processing':
          // Enhanced ASMR check processing terminal sounds
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              createTone(1400 + (i % 2) * 300, 0.04, 0.05);
              createNoise(0.02, 0.01);
            }, i * 120);
          }
          setTimeout(() => createTone(1800, 0.2, 0.08), 1000);
          break;
        case 'terminal_focus':
          // Soft terminal focus sound
          createTone(1000, 0.05, 0.03);
          createTone(1200, 0.03, 0.02);
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
      signatureCompared: false,
      transactionProcessed: false
    });
    setCurrentStep('lookup');
    setWaitingForInput('');
  };

  const handleCommand = (command: string) => {
    const cmd = command.trim().toUpperCase();
    
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
        
        playSound('database_lookup');
        setTimeout(() => {
          if (currentCustomer.isFraud) {
            setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "*** ACCOUNT NOT FOUND ***", "Account number " + accountNum + " does not exist", "POSSIBLE FRAUD - REJECT TRANSACTION"]);
            playSound('reject');
          } else if (accountNum === currentCustomer.accountNumber) {
            setVerificationState(prev => ({...prev, accountLookedUp: true}));
            setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "✓ ACCOUNT VERIFIED: " + accountNum, "Name on file: " + currentCustomer.name, "DOB on file: 1985-03-15", "Address: 123 Main Street, Springfield, IL", "Account status: ACTIVE", "Current balance: $" + Math.floor(Math.random() * 50000), "", "Account verification complete"]);
            playSound('approve');
          } else {
            setTerminalOutput(prev => [...prev, "> " + command, "SEARCHING DATABASE...", "✗ ACCOUNT MISMATCH", "Entered: " + accountNum, "Expected: " + currentCustomer.accountNumber, "VERIFICATION FAILED"]);
            playSound('reject');
          }
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
      
      playSound('database_lookup');
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
      
      playSound('database_lookup');
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
      
      const signature = currentCustomer.documents.find(d => d.type === 'SIGNATURE')?.data.signature || 'No signature';
      setSignatureModal({isOpen: true, signature: signature as string});
      setVerificationState(prev => ({...prev, signatureCompared: true}));
      setTerminalOutput(prev => [...prev, "> " + command, "========== SIGNATURE VERIFICATION ==========", "STEP 1: Customer signing pad activated", "STEP 2: Ask customer to sign their name", "STEP 3: Compare fresh signature with card on file", "ANALYSIS POINTS:", "- Signature flow and speed", "- Letter formation style", "- Pressure points and spacing", "- Overall handwriting consistency", "Manual verification required - use visual judgment", "=========================================", ""]);
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
        setTerminalOutput(prev => [...prev, "> " + command, "Processing deposit: $" + amount, "Printing deposit receipt...", "Transaction prepared for approval"]);
        playSound('dot_matrix_printer');
      } else if (transactionPart.startsWith('WITHDRAWAL ')) {
        const amount = transactionPart.replace('WITHDRAWAL ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing withdrawal: $" + amount, "Counting cash...", "Transaction prepared for approval"]);
        playSound('paper_rustle');
        setTimeout(() => playSound('stamp'), 800);
      } else if (transactionPart.startsWith('WIRE ')) {
        const amount = transactionPart.replace('WIRE ', '');
        setTerminalOutput(prev => [...prev, "> " + command, "Processing wire transfer: $" + amount, "International routing confirmed", "Transaction prepared for approval"]);
        playSound('database_lookup');
      }
    } else if (cmd === 'APPROVE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const required = ['accountLookedUp', 'signatureCompared'];
      const missing = required.filter(req => !verificationState[req as keyof typeof verificationState]);
      
      if (missing.length > 0) {
        setTerminalOutput(prev => [...prev, "> " + command, "========== APPROVAL BLOCKED ==========", "ERROR: Missing required verifications:", ...missing.map(m => "- " + m.replace(/([A-Z])/g, ' $1').toUpperCase()), "Complete all verification steps before approval", "====================================", ""]);
        playSound('reject');
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
      setTerminalOutput(prev => [...prev, "> " + command, "Manual Verification Commands:", "LOOKUP [account_number] - Get system data", "COMPARE SIGNATURE - View signatures", "PROCESS [DEPOSIT/WITHDRAWAL/WIRE] [amount]", "APPROVE - Approve after all verifications", "REJECT - Reject transaction"]);
    } else if (cmd === 'KONAMI' || cmd === 'UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A') {
      setTerminalOutput(prev => [...prev, "> " + command, "=== EASTER EGG ACTIVATED ===", "You found the classic code!", "30 lives granted... wait, wrong system!", "=========================="]);
      playSound('easter_melody');
    } else if (cmd === 'MATRIX' || cmd === 'WAKE UP NEO') {
      setTerminalOutput(prev => [...prev, "> " + command, "Follow the white rabbit...", "The Matrix has you...", "Unfortunately, no one can be told what the Matrix is."]);
      playSound('matrix_code');
    } else if (cmd === 'DIAL' || cmd === 'MODEM') {
      setTerminalOutput(prev => [...prev, "> " + command, "Connecting to BBS...", "CARRIER DETECTED", "Welcome to 1995!"]);
      playSound('retro_modem');
    } else if (cmd === 'SECRET' || cmd === 'ADMIN' || cmd === 'ROOT') {
      setTerminalOutput(prev => [...prev, "> " + command, "Access Level: SUPERVISOR", "Hidden features unlocked", "You are now in developer mode"]);
      playSound('secret_unlock');
    } else if (cmd === 'PLAY MUSIC' || cmd === 'JUKEBOX') {
      setTerminalOutput(prev => [...prev, "> " + command, "Now playing: Bank Teller Blues", "♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫"]);
      playSound('easter_melody');
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Command not recognized", "Type HELP for available commands", "Check spelling and try again"]);
      playSound('reject');
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

  const punchIn = () => {
    playSound('punch_clock');
    setShiftStartTime(Date.now());
    setGamePhase('working');
    setTerminalOutput([
      "SHIFT STARTED - " + new Date().toLocaleTimeString(),
      "Welcome to First National Bank",
      "Ready for customer service",
      "",
      "Type HELP for commands or click CALL CUSTOMER"
    ]);
  };

  const punchOut = () => {
    playSound('punch_clock');
    const timeWorked = Math.floor((Date.now() - shiftStartTime) / 60000);
    setGameScore(prev => ({ ...prev, timeOnShift: timeWorked }));
    
    if (gameScore.score >= getMinScoreForLeaderboard()) {
      setGamePhase('leaderboard');
    } else {
      setGamePhase('punch_in');
      resetGame();
    }
  };

  const resetGame = () => {
    setGameScore({ score: 0, correctTransactions: 0, errors: 0, timeOnShift: 0 });
    setCurrentCustomer(null);
    resetVerificationState();
    setTerminalOutput([
      "SHIFT ENDED",
      "Thank you for your service",
      "",
      "Ready for next shift"
    ]);
  };

  const getMinScoreForLeaderboard = (): number => {
    const leaderboard = getLeaderboard();
    return leaderboard.length >= 10 ? leaderboard[9].score : 0;
  };

  const getLeaderboard = (): LeaderboardEntry[] => {
    const stored = localStorage.getItem('bankTellerLeaderboard');
    return stored ? JSON.parse(stored) : [];
  };

  const addToLeaderboard = (name: string) => {
    const leaderboard = getLeaderboard();
    const newEntry: LeaderboardEntry = {
      name,
      score: gameScore.score,
      date: new Date().toLocaleDateString()
    };
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.splice(10);
    localStorage.setItem('bankTellerLeaderboard', JSON.stringify(leaderboard));
    setGamePhase('punch_in');
    resetGame();
  };

  const handleCorrectTransaction = () => {
    setGameScore(prev => ({
      ...prev,
      score: prev.score + 100,
      correctTransactions: prev.correctTransactions + 1
    }));
  };

  const handleError = () => {
    const newErrors = gameScore.errors + 1;
    setGameScore(prev => ({ ...prev, errors: newErrors }));
    
    if (newErrors >= 3) {
      setTerminalOutput(prev => [...prev, "*** THREE STRIKES - YOU'RE FIRED! ***", "Shift terminated", "Better luck next time"]);
      setTimeout(() => punchOut(), 2000);
    }
  };

  const getCustomerResponse = (wasCorrect: boolean): string[] => {
    if (wasCorrect) {
      return ["Thank you for your service!", "Have a great day!"];
    } else {
      const responses = [
        ["What do you mean rejected?!", "I've been banking here for years!", "This is ridiculous!"],
        ["Are you kidding me?", "I need to speak to your manager!", "This is unacceptable!"],
        ["You've got to be joking!", "Check again!", "I know this is right!"],
        ["This is absurd!", "I demand to see the supervisor!", "You're making a mistake!"],
        ["What kind of operation is this?", "I'm taking my business elsewhere!", "Incompetent!"]
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const handleCardClick = () => {
    if (!cardInSlot) {
      // Animate card to slot
      setCardPosition({ x: 200, y: 280 });
      setTimeout(() => {
        setCardInSlot(true);
        playTimeclockPunch();
      }, 500);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cardInSlot) {
      setIsDragging(true);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !cardInSlot) {
      setCardPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
      
      // Check if near slot (auto-snap)
      if (Math.abs(e.clientX - 350) < 50 && Math.abs(e.clientY - 320) < 50) {
        setCardPosition({ x: 200, y: 280 });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      
      // Check if dropped in slot area
      if (Math.abs(e.clientX - 350) < 60 && Math.abs(e.clientY - 320) < 60) {
        setCardPosition({ x: 200, y: 280 });
        setTimeout(() => {
          setCardInSlot(true);
          playTimeclockPunch();
        }, 200);
      }
    }
  };

  const playTimeclockPunch = () => {
    // Enhanced multi-layered time clock punch sound sequence
    playSound('card_insert');
    setTimeout(() => playSound('mechanical_whir'), 150);
    setTimeout(() => playSound('heavy_stamp'), 300);
    setTimeout(() => playSound('metal_clang'), 350);
    setTimeout(() => playSound('spring_bounce'), 450);
    setTimeout(() => playSound('completion_bell'), 600);
    setTimeout(() => punchIn(), 1000);
  };

  const getSmartPlaceholder = (): string => {
    if (!currentCustomer) {
      return "Type NEXT to call customer...";
    }
    
    if (!verificationState.accountLookedUp) {
      return `Type LOOKUP ${currentCustomer.accountNumber}`;
    }
    
    if (!verificationState.signatureCompared) {
      return "Type COMPARE SIGNATURE";
    }
    
    if (!verificationState.transactionProcessed) {
      return `Type PROCESS ${currentCustomer.transactionType} ${currentCustomer.requestedAmount}`;
    }
    
    return "Type APPROVE or REJECT";
  };

  // Punch Clock Interface
  if (gamePhase === 'punch_in') {

    return (
      <div 
        style={{
          height: '100vh',
          width: '100vw',
          background: 'linear-gradient(135deg, #001100 0%, #002200 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'monospace',
          color: '#00ff00',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Time Clock Machine */}
        <div style={{
          background: 'linear-gradient(145deg, #333333, #1a1a1a)',
          border: '4px solid #666666',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          maxWidth: '500px',
          position: 'relative'
        }}>
          {/* Clock Display */}
          <div style={{
            background: '#000000',
            border: '3px inset #666666',
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ 
              color: '#00ff00', 
              fontSize: '24px', 
              fontWeight: 'bold',
              textShadow: '0 0 10px #00ff00',
              fontFamily: 'monospace'
            }}>
              {new Date().toLocaleTimeString()}
            </div>
            <div style={{ color: '#00cccc', fontSize: '14px', marginTop: '5px' }}>
              FIRST NATIONAL BANK
            </div>
          </div>

          {/* Card Slot */}
          <div style={{
            background: 'linear-gradient(145deg, #2a2a2a, #0f0f0f)',
            border: '3px inset #555555',
            padding: '25px',
            marginBottom: '20px',
            borderRadius: '8px',
            position: 'relative',
            boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ 
              fontSize: '16px', 
              marginBottom: '15px', 
              color: '#cccccc',
              fontWeight: 'bold'
            }}>
              INSERT PUNCH CARD
            </div>
            
            {/* Slot Opening */}
            <div style={{
              width: '180px',
              height: '60px',
              background: 'linear-gradient(180deg, #000000, #111111)',
              border: '2px solid #333333',
              margin: '0 auto',
              borderRadius: '4px',
              position: 'relative',
              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cardInSlot ? (
                <div style={{
                  width: '160px',
                  height: '40px',
                  background: 'linear-gradient(145deg, #e8e8e8, #d0d0d0)',
                  border: '1px solid #999999',
                  borderRadius: '2px',
                  animation: 'punchAnimation 0.5s ease-out'
                }} />
              ) : (
                <div style={{ 
                  color: '#666666', 
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  SLOT
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div style={{
            fontSize: '14px',
            color: '#999999',
            marginBottom: '20px',
            lineHeight: '1.4'
          }}>
            Click or drag your punch card to the slot<br/>
            to begin your banking shift
          </div>
        </div>

        {/* Punch Card */}
        {!cardInSlot && (
          <div
            style={{
              position: 'absolute',
              left: cardPosition.x + 'px',
              top: cardPosition.y + 'px',
              width: '160px',
              height: '100px',
              background: 'linear-gradient(145deg, #f5f5f5, #e0e0e0)',
              border: '2px solid #cccccc',
              borderRadius: '4px',
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: isDragging ? 'none' : 'all 0.5s ease-out',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)',
              zIndex: 1000
            }}
            onMouseDown={handleMouseDown}
            onClick={handleCardClick}
          >
            {/* Card Content */}
            <div style={{
              padding: '8px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#333333',
              fontFamily: 'monospace'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                EMPLOYEE ID: 001
              </div>
              <div>
                TELLER WORKSTATION<br/>
                FIRST NATIONAL BANK
              </div>
              <div style={{ 
                borderTop: '1px solid #999999', 
                paddingTop: '4px',
                fontSize: '8px'
              }}>
                AUTHORIZED PERSONNEL ONLY
              </div>
            </div>
          </div>
        )}

        {/* Punch Animation Keyframes */}
        <style>{`
          @keyframes punchAnimation {
            0% { transform: translateY(20px); opacity: 0; }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Leaderboard Interface
  if (gamePhase === 'leaderboard') {
    const leaderboard = getLeaderboard();
    
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #001100 0%, #002200 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'monospace',
        color: '#00ff00',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'rgba(0, 40, 0, 0.4)',
          border: '3px solid #00ff00',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
          maxWidth: '600px',
          width: '90%'
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>
            HIGH SCORE ACHIEVED!
          </h1>
          
          <div style={{ marginBottom: '30px' }}>
            <div>Final Score: {gameScore.score}</div>
            <div>Transactions: {gameScore.correctTransactions}</div>
            <div>Time on Shift: {gameScore.timeOnShift} min</div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Enter your name for leaderboard"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                background: '#001100',
                border: '2px solid #00aa00',
                color: '#00ff00',
                padding: '12px',
                fontSize: '16px',
                fontFamily: 'monospace',
                textAlign: 'center',
                width: '250px',
                outline: 'none'
              }}
              maxLength={20}
            />
          </div>
          
          <button
            onClick={() => addToLeaderboard(playerName || 'Anonymous')}
            style={{
              background: 'rgba(0, 255, 0, 0.2)',
              border: '2px solid #00ff00',
              color: '#00ff00',
              padding: '15px 30px',
              fontSize: '18px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              borderRadius: '6px'
            }}
          >
            SAVE TO LEADERBOARD
          </button>
          
          {leaderboard.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>TOP TELLERS</h3>
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div key={index} style={{ 
                  padding: '8px',
                  borderBottom: '1px solid #00aa00',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{index + 1}. {entry.name}</span>
                  <span>{entry.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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
      paddingBottom: '20px',
      overflow: 'auto',
      position: 'fixed',
      top: 0,
      left: 0,
      boxSizing: 'border-box'
    }}>
      
      {/* CRT Scanline Effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.2), transparent)',
        animation: 'scanline 15s linear infinite',
        zIndex: 1000,
        pointerEvents: 'none'
      }} />
      
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-2px); opacity: 0.3; }
          25% { opacity: 0.5; }
          50% { opacity: 0.4; }
          75% { opacity: 0.6; }
          100% { transform: translateY(100vh); opacity: 0.2; }
        }
      `}</style>
      
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
        
        {/* Enhanced Documents Section - Clearly Visible */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(0, 60, 0, 0.95), rgba(0, 40, 0, 0.9))',
          border: '3px solid #ffff00',
          padding: window.innerWidth < 768 ? '12px' : '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          minHeight: window.innerWidth < 768 ? '200px' : '240px',
          maxHeight: window.innerWidth < 768 ? '300px' : '320px',
          overflowY: 'auto',
          boxShadow: '0 0 20px rgba(255, 255, 0, 0.3)',
          WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
        }}>
          <div style={{ 
            color: '#ffff00', 
            fontSize: window.innerWidth < 768 ? '16px' : '18px', 
            fontWeight: 'bold', 
            marginBottom: '12px', 
            textAlign: 'center',
            textShadow: '0 0 10px #ffff00'
          }}>
            📋 CUSTOMER DOCUMENTS
          </div>
          
          {currentCustomer && currentCustomer.documents && currentCustomer.documents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentCustomer.documents.map((doc, index) => (
                <div
                  key={index}
                  onClick={() => playSound('paper_rustle')}
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 0, 0.2), rgba(255, 255, 0, 0.1))',
                    border: '2px solid #ffff00',
                    padding: window.innerWidth < 768 ? '12px' : '14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 0, 0.3), rgba(255, 255, 0, 0.2))';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 0, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 0, 0.2), rgba(255, 255, 0, 0.1))';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  <div style={{ 
                    color: '#ffff00', 
                    fontSize: window.innerWidth < 768 ? '14px' : '16px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px', 
                    textAlign: 'center',
                    borderBottom: '1px solid #ffff00',
                    paddingBottom: '4px'
                  }}>
                    📄 {doc.title}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gap: '4px',
                    fontSize: window.innerWidth < 768 ? '12px' : '14px'
                  }}>
                    {Object.entries(doc.data).map(([key, value]) => (
                      <div key={key} style={{ 
                        padding: '4px 8px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                        gap: window.innerWidth < 768 ? '0' : '8px'
                      }}>
                        <span style={{ 
                          color: '#00dddd', 
                          fontSize: window.innerWidth < 768 ? '10px' : '12px',
                          fontWeight: 'bold',
                          minWidth: window.innerWidth < 768 ? 'auto' : '100px'
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                        </span>
                        <span style={{ 
                          color: '#ffffff', 
                          fontWeight: 'bold', 
                          fontSize: window.innerWidth < 768 ? '12px' : '14px',
                          fontFamily: 'monospace',
                          background: 'rgba(255, 255, 255, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Quick Reference System Data */}
              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(0, 100, 200, 0.2)',
                border: '1px solid #0088ff',
                borderRadius: '4px'
              }}>
                <div style={{ 
                  fontSize: window.innerWidth < 768 ? '10px' : '11px', 
                  color: '#00aaff',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  💻 SYSTEM VERIFICATION DATA
                </div>
                <div style={{ 
                  fontSize: window.innerWidth < 768 ? '9px' : '10px', 
                  color: '#cccccc', 
                  lineHeight: '1.3',
                  fontFamily: 'monospace'
                }}>
                  Account: {currentCustomer.accountNumber}<br/>
                  Type: {currentCustomer.transactionType}<br/>
                  Amount: ${currentCustomer.requestedAmount}<br/>
                  {currentCustomer.destinationAccount && (
                    <>Wire To: {currentCustomer.destinationAccount}<br/></>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#999999',
              padding: window.innerWidth < 768 ? '20px' : '40px',
              fontSize: window.innerWidth < 768 ? '14px' : '16px'
            }}>
              📭 No customer present<br/>
              <span style={{ color: '#ffaa00', fontSize: window.innerWidth < 768 ? '12px' : '14px' }}>
                Call customer to view documents
              </span>
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
              <div style={{ fontSize: '12px', marginBottom: '4px', color: '#00cccc' }}>ESSENTIAL COMMANDS:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'LOOKUP ';
                      inputRef.current.focus();
                    }
                  }}
                  disabled={!currentCustomer}
                  style={{
                    background: currentCustomer ? 'rgba(0, 80, 80, 0.8)' : 'rgba(30, 30, 30, 0.5)',
                    border: '1px solid #00aaaa',
                    color: currentCustomer ? '#00ffff' : '#666666',
                    padding: '10px',
                    fontSize: '12px',
                    cursor: currentCustomer ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  LOOKUP ACCOUNT
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'COMPARE SIGNATURE';
                      inputRef.current.focus();
                    }
                  }}
                  disabled={!currentCustomer}
                  style={{
                    background: currentCustomer ? 'rgba(0, 0, 80, 0.8)' : 'rgba(30, 30, 30, 0.5)',
                    border: '1px solid #0088ff',
                    color: currentCustomer ? '#00aaff' : '#666666',
                    padding: '10px',
                    fontSize: '12px',
                    cursor: currentCustomer ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  SIGNATURE CHECK
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
              <div style={{ fontSize: '12px', marginBottom: '6px', color: '#ffaa00' }}>VERIFICATION CHECKLIST:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '11px' }}>
                <div style={{ color: verificationState.accountLookedUp ? '#00ff00' : '#ffaa00', padding: '2px' }}>
                  {verificationState.accountLookedUp ? '✓' : '○'} ACCOUNT LOOKUP
                </div>
                <div style={{ color: verificationState.signatureCompared ? '#00ff00' : '#ffaa00', padding: '2px' }}>
                  {verificationState.signatureCompared ? '✓' : '○'} SIGNATURE CHECK
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

          {/* Quick Command Buttons Above Input */}
          {currentCustomer && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(0, 40, 0, 0.3)',
              border: '1px solid #00aa00',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', color: '#00cccc' }}>ESSENTIAL COMMANDS:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'LOOKUP ';
                      inputRef.current.focus();
                    }
                  }}
                  disabled={!currentCustomer}
                  style={{
                    background: currentCustomer ? 'rgba(0, 80, 80, 0.8)' : 'rgba(30, 30, 30, 0.5)',
                    border: '1px solid #00aaaa',
                    color: currentCustomer ? '#00ffff' : '#666666',
                    padding: '10px',
                    fontSize: '12px',
                    cursor: currentCustomer ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  LOOKUP ACCOUNT
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    if (inputRef.current) {
                      inputRef.current.value = 'COMPARE SIGNATURE';
                      inputRef.current.focus();
                    }
                  }}
                  disabled={!currentCustomer}
                  style={{
                    background: currentCustomer ? 'rgba(0, 0, 80, 0.8)' : 'rgba(30, 30, 30, 0.5)',
                    border: '1px solid #0088ff',
                    color: currentCustomer ? '#00aaff' : '#666666',
                    padding: '10px',
                    fontSize: '12px',
                    cursor: currentCustomer ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  SIGNATURE CHECK
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Terminal Input with Smart Prompts */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginTop: '8px',
            background: 'linear-gradient(145deg, #000000, #001100)',
            padding: window.innerWidth < 768 ? '10px' : '12px',
            border: '2px solid #00ff00',
            borderRadius: '6px',
            boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
          }}>
            <span style={{ 
              marginRight: '8px', 
              color: '#00ff00', 
              fontWeight: 'bold',
              fontSize: window.innerWidth < 768 ? '14px' : '16px'
            }}>
              &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder={getSmartPlaceholder()}
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyDown}
              onFocus={() => playSound('terminal_focus')}
              style={{
                flex: 1,
                background: 'rgba(0, 20, 0, 0.8)',
                border: 'none',
                color: '#00ff00',
                padding: window.innerWidth < 768 ? '10px' : '12px',
                fontSize: window.innerWidth < 768 ? '14px' : '16px',
                fontFamily: 'monospace',
                outline: 'none',
                borderRadius: '4px'
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
              fontSize: '18px'
            }}>
              SIGNATURE VERIFICATION REQUIRED
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#ffff00', fontSize: '12px', marginBottom: '8px' }}>
                CUSTOMER PROVIDED SIGNATURE:
              </div>
              <div style={{
                background: '#ffffff',
                border: '2px solid #ffff00',
                padding: '20px',
                borderRadius: '4px',
                textAlign: 'center',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  color: '#000000',
                  fontSize: '26px',
                  fontFamily: 'cursive',
                  fontWeight: 'bold'
                }}>
                  {signatureModal.signature}
                </div>
              </div>
            </div>

            {currentCustomer && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#00ccff', fontSize: '12px', marginBottom: '8px' }}>
                  SYSTEM SIGNATURE ON FILE:
                </div>
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #00ccff',
                  padding: '20px',
                  borderRadius: '4px',
                  textAlign: 'center',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    color: '#000000',
                    fontSize: '26px',
                    fontFamily: 'cursive',
                    fontWeight: 'bold'
                  }}>
                    {currentCustomer.name.split(' ')[0] + " " + currentCustomer.name.split(' ')[currentCustomer.name.split(' ').length - 1]}
                  </div>
                </div>
              </div>
            )}
            
            <div style={{
              color: '#ffaa00',
              fontSize: '11px',
              textAlign: 'center',
              marginBottom: '16px',
              lineHeight: '1.3'
            }}>
              Compare signatures carefully for differences in letter formation, spacing, and style.<br/>
              Use APPROVE/REJECT buttons after comparison.
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