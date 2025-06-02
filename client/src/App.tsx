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
  const [punchStatus, setPunchStatus] = useState('');
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
  const [shiftStartTime, setShiftStartTime] = useState<number>(0);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [showManagerWarning, setShowManagerWarning] = useState(false);
  const [managerMessage, setManagerMessage] = useState('');
  const [mobileTab, setMobileTab] = useState<'terminal' | 'customer' | 'docs'>('terminal');

  // Enhanced error tracking and scoring system
  const addCorrectTransaction = () => {
    setGameScore(prev => ({
      ...prev,
      score: prev.score + 100,
      correctTransactions: prev.correctTransactions + 1,
      consecutiveErrors: 0 // Reset consecutive errors on correct transaction
    }));
  };

  const handleTransactionError = (errorType: string) => {
    setGameScore(prev => {
      const newErrors = prev.errors + 1;
      const newConsecutiveErrors = prev.consecutiveErrors + 1;
      const newErrorDetails = [...prev.errorDetails, errorType];
      
      // Check if we need to show manager warning (every 3 consecutive errors)
      if (newConsecutiveErrors >= 3) {
        setManagerMessage(`⚠️ BANK MANAGER NOTIFICATION ⚠️\n\nEmployee Warning: ${newConsecutiveErrors} consecutive errors detected!\n\nRecent violations:\n• ${newErrorDetails.slice(-3).join('\n• ')}\n\nRemaining errors before termination: ${6 - newConsecutiveErrors}\n\nPlease review bank procedures carefully.\n\n- Management`);
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
  };
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    accountNotFound: false,
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
  const inputRef = useRef<HTMLInputElement>(null);

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
          // Enhanced mechanical keyboard with medium hardness ASMR
          createTone(1200 + Math.random() * 400, 0.015, 0.04);
          createTone(800 + Math.random() * 200, 0.008, 0.025);
          createNoise(0.012, 0.015);
          setTimeout(() => createTone(600, 0.006, 0.015), 8);
          setTimeout(() => createNoise(0.004, 0.008), 12);
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
          // Enhanced ASMR dot matrix printer with authentic mechanical sounds
          for (let i = 0; i < 25; i++) {
            setTimeout(() => {
              // Main printer head impact
              createTone(1600 + (i % 4) * 150, 0.025, 0.04);
              createTone(1200 + (i % 3) * 100, 0.015, 0.03);
              // Mechanical noise and paper feed
              createNoise(0.018, 0.025);
              // Carriage movement
              if (i % 8 === 0) createTone(800, 0.008, 0.02);
            }, i * 60);
          }
          // Paper tear sound at the end
          setTimeout(() => {
            createNoise(0.15, 0.08);
            createTone(400, 0.06, 0.04);
            setTimeout(() => createNoise(0.08, 0.05), 80);
          }, 25 * 60 + 200);
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
        case 'punch_clock_in':
        case 'punch_clock_out':
          // Play authentic punch clock audio file
          const punchAudio = new Audio('/punch-clock.mp3');
          punchAudio.volume = 0.7;
          punchAudio.play().catch(e => console.log('Audio play failed:', e));
          break;
        case 'dot_matrix_print':
          // Play authentic dot matrix printer for 10 seconds
          const printerAudio = new Audio('/dot-matrix-printer.mp3');
          printerAudio.volume = 0.6;
          printerAudio.currentTime = 0;
          printerAudio.play().catch(e => console.log('Audio play failed:', e));
          // Stop after 10 seconds
          setTimeout(() => {
            printerAudio.pause();
            printerAudio.currentTime = 0;
          }, 10000);
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
        case 'cash_counting':
          // Cash counting machine sounds
          for (let i = 0; i < 15; i++) {
            setTimeout(() => {
              createTone(800 + (i % 3) * 100, 0.03, 0.04);
              createNoise(0.01, 0.02);
            }, i * 60);
          }
          break;
        case 'register_print':
          // Old check register printing with ASMR
          for (let i = 0; i < 20; i++) {
            setTimeout(() => {
              createTone(1600 + (i % 4) * 150, 0.02, 0.03);
              createNoise(0.008, 0.015);
            }, i * 45);
          }
          setTimeout(() => createTone(1200, 0.15, 0.06), 900);
          break;
        case 'balance_lookup':
          // Account balance lookup processing
          createTone(1400, 0.1, 0.05);
          setTimeout(() => createTone(1600, 0.08, 0.04), 100);
          setTimeout(() => createTone(1800, 0.06, 0.03), 200);
          break;
        case 'legacy_processing':
          // Legacy system processing with authentic terminal sounds
          for (let i = 0; i < 12; i++) {
            setTimeout(() => {
              createTone(1200 + (i % 4) * 200, 0.04, 0.06);
              createNoise(0.01, 0.02);
            }, i * 80);
          }
          setTimeout(() => createTone(1800, 0.15, 0.08), 960);
          break;
        case 'account_verification':
          // Account verification processing
          createTone(800, 0.1, 0.05);
          setTimeout(() => createTone(1000, 0.08, 0.04), 150);
          setTimeout(() => createTone(1200, 0.06, 0.03), 300);
          setTimeout(() => createTone(1400, 0.1, 0.05), 450);
          break;
        case 'wire_confirmation':
          // Wire transfer confirmation beeps
          createTone(1600, 0.1, 0.06);
          setTimeout(() => createTone(1800, 0.08, 0.05), 200);
          setTimeout(() => createTone(2000, 0.06, 0.04), 400);
          break;

        case 'dot_matrix_printer':
          // Authentic dot matrix printer with line feeds
          for (let i = 0; i < 30; i++) {
            setTimeout(() => {
              createTone(800 + Math.random() * 400, 0.02, 0.08);
              createNoise(0.01, 0.04);
              if (i % 5 === 0) {
                createTone(1200, 0.05, 0.03); // Line feed sound
              }
            }, i * 100);
          }
          break;
        case 'paper_tear':
          // Paper tearing sound
          createNoise(0.3, 0.15);
          setTimeout(() => createTone(200, 0.1, 0.05), 150);
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
      accountNotFound: false,
      signatureCompared: false,
      signatureFraud: false,
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
        
        playSound('account_verification');
        setTerminalOutput(prev => [...prev, "> " + command, "CONNECTING TO DATABASE...", "SEARCHING..."]);
        
        setTimeout(() => {
          playSound('legacy_processing');
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
      
      // Generate signatures for manual comparison
      const name = currentCustomer.name;
      const isFraudulent = Math.random() < 0.3; // 30% fraud rate distributed randomly
      
      // Bank signature (on file) - stylized versions  
      const bankSignatures: Record<string, string> = {
        "John Smith": "𝒥𝑜𝒽𝓃 𝒮𝓂𝒾𝓉𝒽",
        "Sarah Johnson": "𝒮𝒶𝓇𝒶𝒽 𝒥𝑜𝒽𝓃𝓈𝑜𝓃",
        "Mike Wilson": "𝑀𝒾𝓀𝑒 𝒲𝒾𝓁𝓈𝑜𝓃",
        "Lisa Parker": "𝐿𝒾𝓈𝒶 𝒫𝒶𝓇𝓀𝑒𝓇",
        "David Brown": "𝒟𝒶𝓋𝒾𝒹 𝐵𝓇𝑜𝓌𝓃",
        "Emily Davis": "𝐸𝓂𝒾𝓁𝓎 𝒟𝒶𝓋𝒾𝓈",
        "James Wilson": "𝒥𝒶𝓂𝑒𝓈 𝒲𝒾𝓁𝓈𝑜𝓃",
        "Jennifer Garcia": "𝒥𝑒𝓃𝓃𝒾𝒻𝑒𝓇 𝒢𝒶𝓇𝒸𝒾𝒶",
        "Michael Johnson": "𝑀𝒾𝒸𝒽𝒶𝑒𝓁 𝒥𝑜𝒽𝓃𝓈𝑜𝓃",
        "Ashley Martinez": "𝒜𝓈𝒽𝓁𝑒𝓎 𝑀𝒶𝓇𝓉𝒾𝓃𝑒𝓏",
        "Christopher Lee": "𝒞𝒽𝓇𝒾𝓈𝓉𝑜𝓅𝒽𝑒𝓇 𝐿𝑒𝑒",
        "Amanda Rodriguez": "𝒜𝓂𝒶𝓃𝒹𝒶 𝑅𝑜𝒹𝓇𝒾𝑔𝓊𝑒𝓏",
        "Matthew Taylor": "𝑀𝒶𝓉𝓉𝒽𝑒𝓌 𝒯𝒶𝓎𝓁𝑜𝓇",
        "Stephanie Thomas": "𝒮𝓉𝑒𝓅𝒽𝒶𝓃𝒾𝑒 𝒯𝒽𝑜𝓂𝒶𝓈",
        "Robert Thompson": "𝑅𝑜𝒷𝑒𝓇𝓉 𝒯𝒽𝑜𝓂𝓅𝓈𝑜𝓃"
      };
      
      const bankSignature = bankSignatures[name] || name;
      let customerSignature = bankSignature;
      
      if (isFraudulent) {
        // Fraudulent signatures - different but attempting to look similar
        const fraudVariations = [
          name.toUpperCase(),
          name.toLowerCase(),
          bankSignature.replace(/𝒶/g, 'a').replace(/𝑒/g, 'e').replace(/𝑜/g, 'o'),
          name.split(' ')[0] + " " + name.split(' ')[1].slice(0, 1) + ".",
          bankSignature.replace(/𝓃/g, 'n').replace(/𝓈/g, 's'),
          name + "son",
        ];
        customerSignature = fraudVariations[Math.floor(Math.random() * fraudVariations.length)];
      } else {
        // Authentic signatures with natural variations
        const naturalVariations = [
          bankSignature,
          bankSignature.replace(/𝒾/g, 'i'),
          bankSignature + ".",
          bankSignature.replace(/𝓈/g, 's'),
        ];
        customerSignature = naturalVariations[Math.floor(Math.random() * naturalVariations.length)];
      }
      
      setSignatureModal({
        isOpen: true, 
        bankSignature, 
        customerSignature
      });
      setTerminalOutput(prev => [...prev, "> " + command, "========== SIGNATURE COMPARISON ==========", "RETRIEVING SIGNATURE ON FILE...", "CUSTOMER SIGNING FRESH SIGNATURE...", "", "VISUAL COMPARISON REQUIRED", "EXAMINE BOTH SIGNATURES CAREFULLY", "LOOK FOR:", "- Letter formation differences", "- Spacing and flow variations", "- Pressure and pen strokes", "- Overall handwriting style", "", "USE YOUR JUDGMENT TO DETERMINE AUTHENTICITY", "========================================"]);
      playSound('paper_rustle');
    } else if (cmd.startsWith('DEPOSIT $')) {
      const amount = cmd.substring(9).trim();
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp || !verificationState.signatureCompared) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Complete verification first", "1. LOOKUP account", "2. COMPARE SIGNATURE"]);
        playSound('reject');
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING DEPOSIT...", "VALIDATING FUNDS...", "UPDATING ACCOUNT BALANCE..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== DEPOSIT PROCESSED ==========",
          `AMOUNT: $${amount}`,
          `ACCOUNT: ${currentCustomer.accountNumber}`,
          `NEW BALANCE: $${(accountBalance + parseFloat(amount)).toLocaleString()}`,
          "STATUS: READY FOR APPROVAL",
          "======================================"
        ]);
        playSound('register_print');
      }, 1500);
      
    } else if (cmd.startsWith('WITHDRAW $')) {
      const amount = cmd.substring(10).trim();
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp || !verificationState.signatureCompared) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Complete verification first"]);
        playSound('reject');
        return;
      }
      
      const withdrawAmount = parseFloat(amount);
      if (withdrawAmount > accountBalance) {
        playSound('reject');
        setTerminalOutput(prev => [...prev, "> " + command, "*** INSUFFICIENT FUNDS ***", `Requested: $${withdrawAmount.toLocaleString()}`, `Available: $${accountBalance.toLocaleString()}`, "TRANSACTION DENIED"]);
        handleError();
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING WITHDRAWAL...", "CHECKING AVAILABLE FUNDS...", "PREPARING CASH DISPENSING..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== WITHDRAWAL APPROVED ==========",
          `AMOUNT: $${amount}`,
          `ACCOUNT: ${currentCustomer.accountNumber}`,
          `REMAINING BALANCE: $${(accountBalance - withdrawAmount).toLocaleString()}`,
          "STATUS: READY FOR CASH DISPENSING",
          "========================================"
        ]);
        playSound('cash_counting');
        setTimeout(() => playSound('register_print'), 800);
      }, 1500);
      
    } else if (cmd.startsWith('WIRE $')) {
      const wireData = cmd.substring(6).trim();
      const parts = wireData.split(' TO ');
      const amount = parts[0];
      const destAccount = parts[1];
      
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp || !verificationState.signatureCompared) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Complete verification first"]);
        playSound('reject');
        return;
      }
      
      if (!destAccount || destAccount !== currentCustomer.destinationAccount) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Destination account mismatch", `Expected: ${currentCustomer.destinationAccount}`, `Entered: ${destAccount || 'NONE'}`, "WIRE TRANSFER DENIED"]);
        playSound('reject');
        handleError();
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING WIRE TRANSFER...", "VALIDATING DESTINATION ACCOUNT...", "CONFIRMING INTERNATIONAL ROUTING..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== WIRE TRANSFER READY ==========",
          `AMOUNT: $${amount}`,
          `FROM: ${currentCustomer.accountNumber}`,
          `TO: ${destAccount}`,
          `FEES: $25.00`,
          `TOTAL DEBIT: $${(parseFloat(amount) + 25).toLocaleString()}`,
          "STATUS: AWAITING FINAL APPROVAL",
          "========================================"
        ]);
        playSound('wire_confirmation');
      }, 2000);
      
    } else if (cmd === 'INQUIRY' || cmd === 'BALANCE INQUIRY') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (currentCustomer.transactionType !== 'INQUIRY') {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Customer not requesting balance inquiry"]);
        playSound('reject');
        return;
      }
      
      if (!verificationState.accountLookedUp || !verificationState.signatureCompared) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Complete verification first", "1. LOOKUP account", "2. COMPARE SIGNATURE"]);
        playSound('reject');
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING BALANCE INQUIRY...", "PREPARING BALANCE SLIP..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== BALANCE INQUIRY COMPLETE ==========",
          `CUSTOMER: ${currentCustomer.name}`,
          `ACCOUNT: ${currentCustomer.accountNumber}`,
          `CURRENT BALANCE: $${accountBalance.toLocaleString()}`,
          "STATUS: READY FOR SLIP PRINTING",
          "==========================================="
        ]);
        playSound('register_print');
      }, 1500);
      
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
    } else if (cmd === 'PUNCH OUT') {
      playSound('punch_clock_out');
      setTerminalOutput(prev => [...prev, "> " + command, "PUNCHING OUT...", "CALCULATING SHIFT TIME...", "UPDATING TIMESHEET..."]);
      
      setTimeout(() => {
        const shiftPerformance = gameScore.score > 500 ? 'EXCELLENT' : gameScore.score > 200 ? 'GOOD' : 'NEEDS IMPROVEMENT';
        const statusColor = gameScore.score > 500 ? 'green' : gameScore.score > 200 ? 'yellow' : 'red';
        
        setTerminalOutput(prev => [...prev, 
          "========== SHIFT COMPLETE ==========",
          `PERFORMANCE: ${shiftPerformance}`,
          `TRANSACTIONS: ${gameScore.correctTransactions}`,
          `SCORE: ${gameScore.score}`,
          `ERRORS: ${gameScore.errors}`,
          "RETURNING TO TIME CLOCK...",
          "===================================="
        ]);
        
        setTimeout(() => {
          // Play punch clock sound for clocking out
          const punchAudio = new Audio('/punch-clock.mp3');
          punchAudio.volume = 0.8;
          punchAudio.play().catch(e => console.log('Audio play failed:', e));
          
          setPunchStatus('ENDING SHIFT');
          setTimeout(() => {
            setGamePhase('punch_out');
            setCurrentCustomer(null);
            setTerminalOutput([]);
          }, 1500);
        }, 2000);
      }, 1500);
    } else if (cmd === 'HELP') {
      setTerminalOutput(prev => [...prev, "> " + command, "Manual Verification Commands:", "LOOKUP [account_number] - Get system data", "VERIFY NAME [name] - Compare signatures", "DEPOSIT $[amount] - Process deposit", "WITHDRAW $[amount] - Process withdrawal", "WIRE $[amount] TO [account] - Wire transfer", "PUNCH OUT - End shift", "APPROVE - Approve transaction", "REJECT - Reject transaction"]);
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



  const submitCommand = () => {
    if (inputRef.current) {
      const fullCommand = commandPrefix + inputRef.current.value;
      if (fullCommand.trim()) {
        playSound('terminal_confirm');
        setTerminalOutput(prev => [...prev, "COMMAND SUBMITTED: " + fullCommand]);
        handleCommand(fullCommand);
        inputRef.current.value = '';
        setCommandPrefix('');
        setShowFloatingInput(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitCommand();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!inputRef.current) return;
    
    // Prevent deletion of command prefix
    if (e.key === 'Backspace' && (inputRef.current.selectionStart || 0) <= 0 && commandPrefix) {
      e.preventDefault();
      return;
    }
    
    // Play typing sound for regular typing
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Space') {
      playSound('keypress');
    }
  };

  const setCommandWithPrefix = (prefix: string, placeholder: string = '') => {
    setCommandPrefix(prefix);
    setInputPrompt(placeholder);
    setShowFloatingInput(true);
    playSound('terminal_focus');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.placeholder = placeholder;
        inputRef.current.focus();
      }
    }, 100);
  };

  const closeFloatingInput = () => {
    setShowFloatingInput(false);
    setCommandPrefix('');
    setInputPrompt('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const checkAccountBalance = (accountNumber: string) => {
    // Generate realistic account balance
    const balance = Math.floor(Math.random() * 50000) + 1000;
    setAccountBalance(balance);
    return balance;
  };

  const processTransaction = () => {
    if (!currentCustomer) return;
    
    const transactionId = Date.now().toString().slice(-6);
    const timestamp = new Date().toLocaleString();
    
    const receipt = {
      transactionId,
      timestamp,
      customerName: currentCustomer.name,
      accountNumber: currentCustomer.accountNumber,
      transactionType: currentCustomer.transactionType,
      amount: currentCustomer.requestedAmount,
      balance: accountBalance,
      destinationAccount: currentCustomer.destinationAccount
    };
    
    setReceiptData(receipt);
    setShowReceipt(true);
    
    // Terminal feedback during printing
    setTerminalOutput(prev => [...prev, 
      "PROCESSING TRANSACTION...",
      "PRINTING RECEIPT...",
      "DOT MATRIX PRINTER ACTIVE"
    ]);
    
    // Simulate dot matrix printer completion and tear-off after viewing
    setTimeout(() => {
      playSound('paper_tear');
      setShowReceipt(false);
      setReceiptData(null);
      resetVerificationState();
      setCurrentCustomer(null);
      setTerminalOutput(prev => [...prev, 
        "TRANSACTION COMPLETE",
        "RECEIPT PRINTED AND TORN OFF",
        "READY FOR NEXT CUSTOMER"
      ]);
    }, 5000);
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
    // Play your authentic punch clock audio immediately when card goes in
    const punchAudio = new Audio('/punch-clock.mp3');
    punchAudio.volume = 0.8;
    punchAudio.play().catch(e => console.log('Audio play failed:', e));
    
    // Show status after the punch sound
    setTimeout(() => {
      setPunchStatus('BEGIN SHIFT');
      setTimeout(() => punchIn(), 1000);
    }, 800);
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
            {/* Punch Status Display */}
            {punchStatus && (
              <div style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                textAlign: 'center',
                backgroundColor: punchStatus === 'BEGIN SHIFT' ? 'rgba(0, 255, 0, 0.3)' : 
                                punchStatus === 'ENDING SHIFT' ? 'rgba(255, 0, 0, 0.3)' : 
                                'rgba(255, 255, 0, 0.2)',
                color: punchStatus === 'BEGIN SHIFT' ? '#00ff00' : 
                       punchStatus === 'ENDING SHIFT' ? '#ff0000' : 
                       '#ffff00',
                border: `2px solid ${punchStatus === 'BEGIN SHIFT' ? '#00ff00' : 
                        punchStatus === 'ENDING SHIFT' ? '#ff0000' : '#ffff00'}`,
                textShadow: `0 0 15px ${punchStatus === 'BEGIN SHIFT' ? '#00ff00' : 
                            punchStatus === 'ENDING SHIFT' ? '#ff0000' : '#ffff00'}`,
                boxShadow: `0 0 20px ${punchStatus === 'BEGIN SHIFT' ? '#00ff00' : 
                           punchStatus === 'ENDING SHIFT' ? '#ff0000' : '#ffff00'}`,
                animation: 'statusGlow 1.5s ease-in-out infinite alternate'
              }}>
                {punchStatus === 'BEGIN SHIFT' && '🟢 BEGIN SHIFT'}
                {punchStatus === 'ENDING SHIFT' && '🔴 ENDING SHIFT'}
                {punchStatus !== 'BEGIN SHIFT' && punchStatus !== 'ENDING SHIFT' && punchStatus}
              </div>
            )}
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
        gap: window.innerWidth < 768 ? '4px' : '8px', 
        minHeight: 0,
        maxHeight: window.innerWidth < 768 ? 'none' : 'calc(100vh - 140px)',
        flexDirection: 'column',
        overflowY: window.innerWidth < 768 ? 'visible' : 'auto'
      }}>
        
        {/* Enhanced Documents Section - Clearly Visible */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(0, 60, 0, 0.95), rgba(0, 40, 0, 0.9))',
          border: '3px solid #ffff00',
          padding: window.innerWidth < 768 ? '6px' : '16px',
          borderRadius: '8px',
          marginBottom: window.innerWidth < 768 ? '6px' : '16px',
          minHeight: window.innerWidth < 768 ? '80px' : '240px',
          maxHeight: window.innerWidth < 768 ? '100px' : '320px',
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
              
              {/* Fraud Detection Comparison Panel - Only when account is looked up */}
              {verificationState.accountLookedUp && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(80, 0, 0, 0.3)',
                  border: '3px solid #ff0000',
                  borderRadius: '6px'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#ff0000',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    textAlign: 'center',
                    textShadow: '0 0 10px #ff0000'
                  }}>
                    🔍 FRAUD DETECTION - COMPARE RECORDS
                  </div>
                  
                  {/* Side-by-side comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    
                    {/* Bank System Records */}
                    <div style={{
                      background: 'rgba(0, 80, 0, 0.6)',
                      border: '2px solid #00ff00',
                      borderRadius: '4px',
                      padding: '8px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00ff00', marginBottom: '6px', textAlign: 'center' }}>
                        🏦 BANK SYSTEM
                      </div>
                      <div style={{ fontSize: '10px', color: '#ffffff', lineHeight: '1.4', fontFamily: 'monospace' }}>
                        <div><strong>NAME:</strong> {currentCustomer.name}</div>
                        <div><strong>ACCT:</strong> {currentCustomer.accountNumber}</div>
                        <div><strong>DOB:</strong> 1985-03-15</div>
                        <div><strong>ADDR:</strong> 123 Main St, Springfield, IL</div>
                        <div><strong>BAL:</strong> ${accountBalance.toLocaleString()}</div>
                        <div><strong>STATUS:</strong> ACTIVE</div>
                      </div>
                    </div>

                    {/* Customer Documents */}
                    <div style={{
                      background: 'rgba(80, 80, 0, 0.6)',
                      border: '2px solid #ffff00',
                      borderRadius: '4px',
                      padding: '8px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffff00', marginBottom: '6px', textAlign: 'center' }}>
                        📄 CUSTOMER DOCS
                      </div>
                      <div style={{ fontSize: '10px', color: '#ffffff', lineHeight: '1.4', fontFamily: 'monospace' }}>
                        <div><strong>ID NAME:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.name || 'N/A'}</div>
                        <div><strong>FORM ACCT:</strong> {currentCustomer.documents.find(d => d.type === 'SLIP')?.data.accountNumber || 'N/A'}</div>
                        <div><strong>ID DOB:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.dateOfBirth || 'N/A'}</div>
                        <div><strong>ID ADDR:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.address || 'N/A'}</div>
                        <div><strong>AMOUNT:</strong> ${currentCustomer.requestedAmount.toLocaleString()}</div>
                        <div><strong>SIGNATURE:</strong> {currentCustomer.documents.find(d => d.type === 'SIGNATURE')?.data.signature || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Detection Instructions */}
                  <div style={{
                    marginTop: '8px',
                    padding: '6px',
                    background: 'rgba(100, 0, 100, 0.3)',
                    border: '1px solid #ff00ff',
                    borderRadius: '4px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '9px', color: '#ff00ff', fontWeight: 'bold' }}>
                      LOOK FOR MISMATCHES - ANY DIFFERENCE = FRAUD
                    </div>
                    <div style={{ fontSize: '8px', color: '#cccccc', marginTop: '2px' }}>
                      Names, accounts, addresses, DOB must match exactly
                    </div>
                  </div>
                </div>
              )}
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
          padding: window.innerWidth < 768 ? '6px' : '12px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: window.innerWidth < 768 ? '120px' : 'auto'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#00ff00', fontSize: '18px' }}>BANK TERMINAL</h3>
          
          {/* Verification Controls - Above Customer Console */}
          {currentCustomer && (
            <div style={{
              marginBottom: window.innerWidth < 768 ? '6px' : '16px',
              padding: window.innerWidth < 768 ? '6px' : '12px',
              background: 'rgba(40, 0, 40, 0.4)',
              border: '2px solid #aa00aa',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: window.innerWidth < 768 ? '4px' : '12px', color: '#ff00ff', fontWeight: 'bold', textAlign: 'center' }}>
                🔍 VERIFICATION CONTROLS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
                <button
                  onClick={() => {
                    if (currentCustomer) {
                      playSound('button_click');
                      handleCommand('LOOKUP');
                    }
                  }}
                  disabled={!currentCustomer}
                  style={{
                    background: currentCustomer && verificationState.accountLookedUp ? 'rgba(0, 100, 0, 0.8)' : 
                               currentCustomer && verificationState.accountNotFound ? 'rgba(100, 0, 0, 0.8)' : 'rgba(100, 100, 0, 0.6)',
                    border: '2px solid ' + (currentCustomer && verificationState.accountLookedUp ? '#00ff00' : 
                                           currentCustomer && verificationState.accountNotFound ? '#ff0000' : '#ffff00'),
                    color: currentCustomer && verificationState.accountLookedUp ? '#00ff00' : 
                           currentCustomer && verificationState.accountNotFound ? '#ff0000' : '#ffff00',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: currentCustomer ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  {verificationState.accountLookedUp ? '✓ ACCOUNT VERIFIED' : 
                   verificationState.accountNotFound ? '✗ ACCOUNT NOT FOUND' : 'LOOKUP ACCOUNT'}
                </button>
                
                <button
                  onClick={() => {
                    if (currentCustomer) {
                      playSound('button_click');
                      handleCommand('COMPARE SIGNATURE');
                    }
                  }}
                  disabled={!currentCustomer}
                  style={{
                    background: currentCustomer && verificationState.signatureCompared ? 
                      (verificationState.signatureFraud ? 'rgba(100, 0, 0, 0.8)' : 'rgba(0, 100, 0, 0.8)') : 'rgba(100, 100, 0, 0.6)',
                    border: '2px solid ' + (currentCustomer && verificationState.signatureCompared ? 
                      (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : '#ffff00'),
                    color: currentCustomer && verificationState.signatureCompared ? 
                      (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : '#ffff00',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: currentCustomer ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  {verificationState.signatureCompared ? 
                    (verificationState.signatureFraud ? '✗ SIGNATURE FRAUD' : '✓ SIGNATURE OK') : 'COMPARE SIGNATURE'}
                </button>
              </div>
            </div>
          )}
          
          {/* Verification Status Bar - Right below controls */}
          {currentCustomer && (
            <div style={{
              marginBottom: '16px',
              padding: '8px',
              background: 'rgba(0, 0, 40, 0.4)',
              border: '2px solid #0088ff',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', color: '#00aaff', fontWeight: 'bold' }}>VERIFICATION STATUS:</div>
              <div style={{ fontSize: '11px', display: 'flex', gap: '12px' }}>
                <span style={{ color: verificationState.accountLookedUp ? '#00ff00' : '#888888' }}>
                  {verificationState.accountLookedUp ? '✓ ACCOUNT' : '○ ACCOUNT'}
                </span>
                <span style={{ color: verificationState.signatureCompared ? (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : '#888888' }}>
                  {verificationState.signatureCompared ? (verificationState.signatureFraud ? '✗ SIGNATURE' : '✓ SIGNATURE') : '○ SIGNATURE'}
                </span>
                <span style={{ color: verificationState.transactionProcessed ? '#00ff00' : '#888888' }}>
                  {verificationState.transactionProcessed ? '✓ PROCESSED' : '○ PROCESSED'}
                </span>
              </div>
            </div>
          )}
          
          {/* Customer Information Console */}
          {currentCustomer && (
            <div style={{
              marginBottom: '16px',
              padding: window.innerWidth < 768 ? '16px' : '20px',
              background: 'rgba(0, 0, 40, 0.4)',
              border: '3px solid #0088ff',
              borderRadius: '8px',
              cursor: 'default',
              minHeight: window.innerWidth < 768 ? '280px' : '320px'
            }}>
              <div style={{ 
                fontSize: window.innerWidth < 768 ? '16px' : '18px', 
                marginBottom: '16px', 
                color: '#00aaff', 
                fontWeight: 'bold', 
                textAlign: 'center',
                cursor: 'default'
              }}>
                CUSTOMER INFORMATION CONSOLE
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
                gap: '16px', 
                marginBottom: '16px' 
              }}>
                {/* Customer Request */}
                <div style={{
                  background: 'rgba(40, 40, 0, 0.6)',
                  border: '3px solid #ffff00',
                  borderRadius: '6px',
                  padding: window.innerWidth < 768 ? '12px' : '16px',
                  cursor: 'default'
                }}>
                  <div style={{ 
                    fontSize: window.innerWidth < 768 ? '14px' : '16px', 
                    fontWeight: 'bold', 
                    color: '#ffff00', 
                    marginBottom: '10px',
                    cursor: 'default'
                  }}>
                    📋 TRANSACTION REQUEST
                  </div>
                  <div style={{ 
                    fontSize: window.innerWidth < 768 ? '13px' : '15px', 
                    color: '#ffffff', 
                    lineHeight: '1.6', 
                    fontFamily: 'monospace',
                    cursor: 'default'
                  }}>
                    <div><strong>CUSTOMER:</strong> {currentCustomer.name}</div>
                    <div><strong>TYPE:</strong> {currentCustomer.transactionType}</div>
                    <div><strong>AMOUNT:</strong> ${currentCustomer.requestedAmount.toLocaleString()}</div>
                    {currentCustomer.destinationAccount && (
                      <div><strong>WIRE TO:</strong> {currentCustomer.destinationAccount}</div>
                    )}
                  </div>
                </div>

                {/* Account Status */}
                <div style={{
                  background: verificationState.accountLookedUp ? 'rgba(0, 40, 0, 0.6)' : 'rgba(40, 0, 0, 0.6)',
                  border: `3px solid ${verificationState.accountLookedUp ? '#00ff00' : '#ff0000'}`,
                  borderRadius: '6px',
                  padding: window.innerWidth < 768 ? '12px' : '16px',
                  cursor: 'default'
                }}>
                  <div style={{ 
                    fontSize: window.innerWidth < 768 ? '14px' : '16px', 
                    fontWeight: 'bold', 
                    color: verificationState.accountLookedUp ? '#00ff00' : '#ff0000', 
                    marginBottom: '10px',
                    cursor: 'default'
                  }}>
                    💳 ACCOUNT STATUS
                  </div>
                  {verificationState.accountLookedUp ? (
                    <div style={{ 
                      fontSize: window.innerWidth < 768 ? '13px' : '15px', 
                      color: '#ffffff', 
                      lineHeight: '1.6', 
                      fontFamily: 'monospace',
                      cursor: 'default'
                    }}>
                      <div><strong>VERIFIED:</strong> ✓ YES</div>
                      <div><strong>BALANCE:</strong> ${accountBalance.toLocaleString()}</div>
                      <div><strong>STATUS:</strong> ACTIVE</div>
                    </div>
                  ) : (
                    <div style={{ 
                      fontSize: window.innerWidth < 768 ? '13px' : '15px', 
                      color: '#ffffff', 
                      lineHeight: '1.6', 
                      fontFamily: 'monospace',
                      cursor: 'default'
                    }}>
                      <div><strong>STATUS:</strong> NOT VERIFIED</div>
                      <div><strong>ACTION:</strong> USE LOOKUP COMMAND</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank System Records - Only after account lookup */}
              {verificationState.accountLookedUp && (
                <div style={{
                  background: 'rgba(0, 40, 0, 0.6)',
                  border: '3px solid #00ff00',
                  borderRadius: '6px',
                  padding: window.innerWidth < 768 ? '12px' : '16px',
                  marginBottom: '8px',
                  cursor: 'default'
                }}>
                  <div style={{ 
                    fontSize: window.innerWidth < 768 ? '14px' : '16px', 
                    fontWeight: 'bold', 
                    color: '#00ff00', 
                    marginBottom: '12px',
                    cursor: 'default'
                  }}>
                    🏦 BANK SYSTEM RECORDS
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)', 
                    gap: '16px' 
                  }}>
                    {/* Personal Information */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '2px solid #00ff00',
                      padding: window.innerWidth < 768 ? '10px' : '12px',
                      borderRadius: '4px',
                      cursor: 'default'
                    }}>
                      <div style={{ 
                        fontSize: window.innerWidth < 768 ? '12px' : '14px', 
                        fontWeight: 'bold', 
                        color: '#00ff00', 
                        marginBottom: '8px',
                        cursor: 'default'
                      }}>
                        PERSONAL INFORMATION
                      </div>
                      <div style={{ 
                        fontSize: window.innerWidth < 768 ? '11px' : '12px', 
                        color: '#ffffff',
                        lineHeight: '1.5',
                        fontFamily: 'monospace',
                        cursor: 'default'
                      }}>
                        <div><strong>NAME:</strong> {currentCustomer.name}</div>
                        <div><strong>DOB:</strong> 1985-03-15</div>
                        <div><strong>ADDRESS:</strong> 123 Main Street, Springfield, IL 62701</div>
                        <div><strong>SSN:</strong> ***-**-1234</div>
                      </div>
                    </div>

                    {/* Account Information */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '2px solid #00ff00',
                      padding: window.innerWidth < 768 ? '10px' : '12px',
                      borderRadius: '4px',
                      cursor: 'default'
                    }}>
                      <div style={{ 
                        fontSize: window.innerWidth < 768 ? '12px' : '14px', 
                        fontWeight: 'bold', 
                        color: '#00ff00', 
                        marginBottom: '8px',
                        cursor: 'default'
                      }}>
                        ACCOUNT INFORMATION
                      </div>
                      <div style={{ 
                        fontSize: window.innerWidth < 768 ? '11px' : '12px', 
                        color: '#ffffff',
                        lineHeight: '1.5',
                        fontFamily: 'monospace',
                        cursor: 'default'
                      }}>
                        <div><strong>ACCOUNT:</strong> {currentCustomer.accountNumber}</div>
                        <div><strong>TYPE:</strong> CHECKING</div>
                        <div><strong>BALANCE:</strong> ${accountBalance.toLocaleString()}</div>
                        <div><strong>STATUS:</strong> ACTIVE</div>
                        <div><strong>OPENED:</strong> 2020-01-15</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}





          {/* Transaction Console */}
          {currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared && (
            <div style={{
              marginBottom: '12px',
              padding: '12px',
              background: 'rgba(40, 0, 40, 0.4)',
              border: '2px solid #aa00aa',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', color: '#ff00ff', fontWeight: 'bold' }}>
                TRANSACTION CONSOLE:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  onClick={() => {
                    playSound('button_click');
                    setCommandWithPrefix('DEPOSIT $', '1500.00');
                  }}
                  style={{
                    background: 'rgba(0, 120, 0, 0.8)',
                    border: '2px solid #00aa00',
                    color: '#00ff00',
                    padding: '12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  DEPOSIT
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    setCommandWithPrefix('WITHDRAW $', '500.00');
                  }}
                  style={{
                    background: 'rgba(120, 120, 0, 0.8)',
                    border: '2px solid #aaaa00',
                    color: '#ffff00',
                    padding: '12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  WITHDRAW
                </button>
                <button
                  onClick={() => {
                    playSound('button_click');
                    setCommandWithPrefix('WIRE $', '1000.00 TO 123456789');
                  }}
                  style={{
                    background: 'rgba(120, 0, 120, 0.8)',
                    border: '2px solid #aa00aa',
                    color: '#ff00ff',
                    padding: '12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  WIRE
                </button>
                <button
                  onClick={() => {
                    if (currentCustomer && currentCustomer.transactionType === 'INQUIRY') {
                      playSound('button_click');
                      setTerminalOutput(prev => [...prev, "> BALANCE INQUIRY", "Processing balance inquiry..."]);
                      handleCommand('INQUIRY');
                    } else {
                      setTerminalOutput(prev => [...prev, "ERROR: Customer not requesting balance inquiry"]);
                      playSound('reject');
                    }
                  }}
                  disabled={!currentCustomer || currentCustomer.transactionType !== 'INQUIRY'}
                  style={{
                    background: currentCustomer && currentCustomer.transactionType === 'INQUIRY' ? 'rgba(120, 120, 0, 0.8)' : 'rgba(50, 50, 50, 0.3)',
                    border: '2px solid #aaaa00',
                    color: currentCustomer && currentCustomer.transactionType === 'INQUIRY' ? '#ffff00' : '#666666',
                    padding: '12px',
                    fontSize: '12px',
                    cursor: currentCustomer && currentCustomer.transactionType === 'INQUIRY' ? 'pointer' : 'not-allowed',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  INQUIRY
                </button>
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
                if (verificationState.accountLookedUp && verificationState.signatureCompared) {
                  setTerminalOutput(prev => [...prev, "> TRANSACTION CONSOLE", "DEPOSIT, WITHDRAW, or WIRE commands available", "Use transaction buttons above or type commands directly"]);
                } else {
                  setTerminalOutput(prev => [...prev, "> TRANSACTION CONSOLE", "ERROR: Complete verification first", "1. LOOKUP account", "2. COMPARE SIGNATURE"]);
                  playSound('reject');
                }
                playSound('button_click');
              }}
              disabled={!currentCustomer}
              style={{
                background: currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared 
                  ? 'rgba(100, 0, 100, 0.6)' 
                  : currentCustomer 
                    ? 'rgba(80, 80, 0, 0.6)' 
                    : 'rgba(50, 50, 50, 0.3)',
                border: '2px solid #aa00aa',
                color: currentCustomer ? '#ff00ff' : '#666666',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: currentCustomer ? 'pointer' : 'not-allowed',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}
            >
              TRANSACTION CONSOLE
            </button>
            
            <button
              onClick={() => {
                if (verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed) {
                  playSound('dot_matrix_print');
                  processTransaction();
                } else {
                  setTerminalOutput(prev => [...prev, "ERROR: Complete all verification steps first"]);
                  playSound('reject');
                }
              }}
              disabled={!currentCustomer || !(verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed)}
              style={{
                background: currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed 
                  ? 'rgba(0, 150, 0, 0.8)' 
                  : 'rgba(50, 50, 50, 0.3)',
                border: '3px solid #00ff00',
                color: currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed 
                  ? '#00ff00' 
                  : '#666666',
                padding: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed 
                  ? 'pointer' 
                  : 'not-allowed',
                borderRadius: '6px',
                fontFamily: 'monospace',
                gridColumn: 'span 2'
              }}
            >
              🖨️ PROCESS TRANSACTION
            </button>
          </div>

          {/* Terminal Output */}
          <div 
            ref={(el) => {
              if (el) {
                el.scrollTop = el.scrollHeight;
              }
            }}
            style={{
              flex: 1,
              background: '#000000',
              border: '2px solid #00ff00',
              padding: '12px',
              borderRadius: '4px',
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
                color: line.includes('*** NO ACCOUNT EXISTS') || line.includes('ACCOUNT NUMBER:') && line.includes('INVALID') || line.includes('STATUS: NOT IN SYSTEM') ? '#ff0000' : '#00ff00'
              }}>
                {line.replace(/\x1b\[[0-9;]*m/g, '')}
              </div>
            ))}
          </div>




        </div>
      </div>

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
                fontSize: '28px',
                color: '#ff0000',
                fontWeight: 'bold',
                marginBottom: '16px',
                textShadow: '0 0 10px rgba(255, 0, 0, 0.5)'
              }}>
                ⚠️ MANAGEMENT WARNING ⚠️
              </div>
            </div>
            
            <div style={{
              background: '#000000',
              border: '2px solid #ff0000',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <pre style={{
                color: '#ff0000',
                fontSize: '14px',
                lineHeight: '1.6',
                margin: 0,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
              }}>
                {managerMessage}
              </pre>
            </div>
            
            <div style={{
              textAlign: 'center'
            }}>
              <button
                onClick={() => {
                  setShowManagerWarning(false);
                  playSound('button_click');
                }}
                style={{
                  background: 'rgba(255, 0, 0, 0.8)',
                  border: '2px solid #ff0000',
                  color: '#ffffff',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}
              >
                ACKNOWLEDGE WARNING
              </button>
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
                  {signatureModal.customerSignature}
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
                    {signatureModal.bankSignature}
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
              Make your determination based on visual comparison.
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: false}));
                  setSignatureModal({isOpen: false, bankSignature: '', customerSignature: ''});
                  setTerminalOutput(prev => [...prev, 
                    "========== SIGNATURE VERIFIED ==========",
                    "✓ SIGNATURES MATCH",
                    "✓ VISUAL COMPARISON: AUTHENTIC",
                    "✓ HANDWRITING ANALYSIS: CONSISTENT",
                    "STATUS: IDENTITY CONFIRMED",
                    "PROCEED WITH TRANSACTION",
                    "======================================"
                  ]);
                  playSound('approve');
                }}
                style={{
                  background: 'rgba(0, 120, 0, 0.8)',
                  border: '2px solid #00ff00',
                  color: '#00ff00',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                ✓ VALID
              </button>
              
              <button
                onClick={() => {
                  setSignatureModal({isOpen: false, bankSignature: '', customerSignature: ''});
                  setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: true}));
                  setTerminalOutput(prev => [...prev, 
                    "========== SIGNATURE REJECTED ==========",
                    "✗ SIGNATURES DO NOT MATCH",
                    "✗ VISUAL COMPARISON: INCONSISTENT",
                    "✗ HANDWRITING ANALYSIS: SUSPICIOUS",
                    "STATUS: IDENTITY NOT CONFIRMED",
                    "*** POTENTIAL FRAUD DETECTED ***",
                    "TELLER CAN PROCEED BUT WILL BE PENALIZED",
                    "======================================="
                  ]);
                  playSound('reject');
                }}
                style={{
                  background: 'rgba(120, 0, 0, 0.8)',
                  border: '2px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                ✗ FRAUD
              </button>
              
              <button
                onClick={() => {
                  setSignatureModal({isOpen: false, bankSignature: '', customerSignature: ''});
                  playSound('modal_close');
                }}
                style={{
                  background: 'rgba(60, 60, 60, 0.8)',
                  border: '2px solid #888888',
                  color: '#cccccc',
                  padding: '12px 24px',
                  fontSize: '14px',
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

      {/* Floating Input Panel */}
      {showFloatingInput && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(145deg, #001100, #002200)',
          border: '3px solid #00ff00',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.4)',
          zIndex: 2000,
          minWidth: window.innerWidth < 768 ? '90%' : '400px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <div style={{
              color: '#00ff00',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {commandPrefix ? `COMMAND: ${commandPrefix.trim()}` : 'COMMAND INPUT'}
            </div>
            <button
              onClick={closeFloatingInput}
              style={{
                background: 'none',
                border: '1px solid #ff4444',
                color: '#ff4444',
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '2px',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#000000',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid #00aa00'
          }}>
            <span style={{
              color: '#00ff00',
              fontWeight: 'bold',
              marginRight: '8px'
            }}>
              &gt;
            </span>
            {commandPrefix && (
              <span style={{
                color: '#00ff00',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                marginRight: '4px'
              }}>
                {commandPrefix}
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={inputPrompt}
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#00ff00',
                padding: '8px',
                fontSize: '16px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            <button
              onClick={submitCommand}
              style={{
                background: 'rgba(0, 150, 0, 0.8)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '4px',
                fontFamily: 'monospace',
                marginLeft: '8px'
              }}
            >
              SEND
            </button>
          </div>
        </div>
      )}

      {/* 80s Dot Matrix Receipt Printer Animation */}
      {showReceipt && receiptData && (
        <div style={{
          position: 'fixed',
          top: '10%',
          right: '5%',
          background: 'linear-gradient(145deg, #f8f8f8, #e0e0e0)',
          border: '3px solid #333333',
          borderRadius: '8px 8px 0 0',
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#000000',
          zIndex: 2000,
          width: '280px',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          animation: 'printReceipt 3s ease-out'
        }}>
          <div style={{
            borderBottom: '2px dashed #333333',
            paddingBottom: '10px',
            marginBottom: '10px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            FIRST NATIONAL BANK
          </div>
          
          <div style={{ lineHeight: '1.4' }}>
            <div>TRANSACTION ID: {receiptData.transactionId}</div>
            <div>DATE: {receiptData.timestamp}</div>
            <div style={{ margin: '8px 0', borderTop: '1px solid #333333', paddingTop: '8px' }}>
              CUSTOMER: {receiptData.customerName}
            </div>
            <div>ACCOUNT: {receiptData.accountNumber}</div>
            <div>TYPE: {receiptData.transactionType}</div>
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
              AMOUNT: ${receiptData.amount.toLocaleString()}
            </div>
            {receiptData.destinationAccount && (
              <div>TO ACCOUNT: {receiptData.destinationAccount}</div>
            )}
            <div style={{ margin: '8px 0', borderTop: '1px solid #333333', paddingTop: '8px' }}>
              NEW BALANCE: ${receiptData.balance.toLocaleString()}
            </div>
          </div>
          
          <div style={{
            marginTop: '15px',
            borderTop: '2px dashed #333333',
            paddingTop: '10px',
            textAlign: 'center',
            fontSize: '10px'
          }}>
            THANK YOU FOR YOUR BUSINESS
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333333',
            color: '#ffffff',
            padding: '4px 8px',
            fontSize: '9px',
            borderRadius: '0 0 4px 4px'
          }}>
            TEAR HERE
          </div>
        </div>
      )}

      {/* Bank Balance Withdrawal Window */}
      {showBalanceWindow && currentCustomer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1500
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #002200, #003300)',
            border: '3px solid #ffff00',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '90%',
            boxShadow: '0 0 30px rgba(255, 255, 0, 0.3)'
          }}>
            <h3 style={{
              color: '#ffff00',
              textAlign: 'center',
              marginBottom: '20px',
              fontSize: '20px'
            }}>
              💰 ACCOUNT BALANCE CHECK
            </h3>
            
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              padding: '20px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <div style={{ color: '#00cccc', marginBottom: '10px' }}>
                Account: {currentCustomer.accountNumber}
              </div>
              <div style={{ color: '#00cccc', marginBottom: '10px' }}>
                Customer: {currentCustomer.name}
              </div>
              <div style={{
                color: '#00ff00',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                padding: '10px',
                border: '1px solid #00aa00',
                borderRadius: '4px',
                background: 'rgba(0, 255, 0, 0.1)'
              }}>
                Available Balance: ${accountBalance.toLocaleString()}
              </div>
              <div style={{
                color: '#ffff00',
                marginTop: '10px',
                textAlign: 'center'
              }}>
                Requested Withdrawal: ${currentCustomer.requestedAmount.toLocaleString()}
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexDirection: window.innerWidth < 768 ? 'column' : 'row'
            }}>
              <button
                onClick={() => {
                  if (currentCustomer.requestedAmount <= accountBalance) {
                    playSound('cash_counting');
                    setTimeout(() => playSound('register_print'), 800);
                    setTimeout(() => {
                      setShowBalanceWindow(false);
                      setTerminalOutput(prev => [...prev, "FUNDS AVAILABLE", "Processing withdrawal...", "Cash counting in progress..."]);
                      handleCorrectTransaction();
                    }, 1500);
                  } else {
                    playSound('reject');
                    setShowBalanceWindow(false);
                    setTerminalOutput(prev => [...prev, "INSUFFICIENT FUNDS", "Withdrawal denied", "Customer must be rejected"]);
                    handleError();
                  }
                }}
                disabled={currentCustomer.requestedAmount > accountBalance}
                style={{
                  background: currentCustomer.requestedAmount <= accountBalance ? 'rgba(0, 255, 0, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                  border: '2px solid ' + (currentCustomer.requestedAmount <= accountBalance ? '#00ff00' : '#666666'),
                  color: currentCustomer.requestedAmount <= accountBalance ? '#00ff00' : '#666666',
                  padding: '15px 30px',
                  fontSize: '16px',
                  cursor: currentCustomer.requestedAmount <= accountBalance ? 'pointer' : 'not-allowed',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}
              >
                ✓ PROCESS WITHDRAWAL
              </button>
              
              <button
                onClick={() => {
                  playSound('reject');
                  setShowBalanceWindow(false);
                  setTerminalOutput(prev => [...prev, "WITHDRAWAL CANCELLED", "Transaction rejected"]);
                  handleError();
                }}
                style={{
                  background: 'rgba(255, 0, 0, 0.2)',
                  border: '2px solid #ff4444',
                  color: '#ff4444',
                  padding: '15px 30px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}
              >
                ✗ REJECT TRANSACTION
              </button>
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
      `}</style>
    </div>
  );
}

export default App;