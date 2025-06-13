import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeSignature, generateCustomer, generateDocuments } from './lib/customers';
import { getDocumentRenderer } from './lib/documents';
import type { Customer, Document as GameDocument } from './types/game';
import BannerAd from './components/BannerAd';

declare global {
  interface Window {
    gameAudioContext?: AudioContext;
  }
}

interface GameScore {
  score: number;
  correctTransactions: number;
  errors: number;
  timeOnShift: number;
  fraudulentApprovals: number;
  consecutiveErrors: number;
  errorDetails: string[];
  customersCalledWithoutService: number;
  dismissalWarningGiven: boolean;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

interface LegacyDocument {
  type: string;
  title: string;
  data: Record<string, string | number>;
  isValid?: boolean;
  hasError?: string;
}

function App() {
  const [gamePhase, setGamePhase] = useState<'punch_in' | 'working' | 'leaderboard' | 'game_over' | 'punch_out' | 'supervisor' | 'police_arrest'>('punch_in');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<GameDocument | null>(null);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [showArrestAnimation, setShowArrestAnimation] = useState(false);
  const [arrestStage, setArrestStage] = useState(0);
  const [policeUnits, setPoliceUnits] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const [sirenFlash, setSirenFlash] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([
    "TELLER WORKSTATION v1.2",
    "WESTRIDGE NATIONAL BANK",
    "PUNCH IN TO BEGIN SHIFT",
    "",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);
  
  const [gameScore, setGameScore] = useState<GameScore>({
    score: 0,
    correctTransactions: 0,
    errors: 0,
    timeOnShift: 0,
    fraudulentApprovals: 0,
    consecutiveErrors: 0,
    errorDetails: [],
    customersCalledWithoutService: 0,
    dismissalWarningGiven: false
  });
  
  // Background music and sound management
  const [musicMuted, setMusicMuted] = useState(false);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  
  // Account lookup state (no automatic fraud detection)
  const [accountBalance, setAccountBalance] = useState(0);
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    signatureCompared: false
  });

  // Sound effects
  const playSound = (soundType: string) => {
    try {
      let audio: HTMLAudioElement;
      switch (soundType) {
        case 'typing':
          audio = new Audio('/dot-matrix-printer.mp3');
          audio.volume = 0.3;
          break;
        case 'punch_clock':
          audio = new Audio('/punch-clock.mp3');
          audio.volume = 0.5;
          break;
        case 'cash':
          audio = new Audio('/dot-matrix-printer.mp3');
          audio.volume = 0.4;
          break;
        case 'reject':
          audio = new Audio('/dot-matrix-printer.mp3');
          audio.volume = 0.6;
          break;
        case 'customer_approach':
          audio = new Audio('/dot-matrix-printer.mp3');
          audio.volume = 0.2;
          break;
        default:
          return;
      }
      audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (e) {
      console.log("Sound error:", e);
    }
  };

  // Initialize background music
  useEffect(() => {
    if (!musicMuted) {
      if (!backgroundMusicRef.current) {
        backgroundMusicRef.current = new Audio('/The Currency Hypnosis.mp3');
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.volume = 0.15;
      }
      
      backgroundMusicRef.current.addEventListener('canplaythrough', () => {
        if (!musicMuted && backgroundMusicRef.current) {
          backgroundMusicRef.current.play().catch(e => {
            console.log("Auto-play prevented:", e);
          });
        }
      });
      
      if (musicMuted && backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    }
    
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
    };
  }, [musicMuted]);

  // Generate customer with proper fraud mechanics
  const generateCustomerLocal = (): Customer => {
    const customer = generateCustomer(1);
    console.log("Generated customer:", customer);
    return customer;
  };

  // Account lookup function - NEVER automatically flags fraud
  const lookupAccount = (accountNumber: string) => {
    if (!currentCustomer) return;
    
    setTerminalOutput(prev => [...prev, 
      `> LOOKUP ${accountNumber}`,
      "Searching bank records...",
      "Accessing customer database..."
    ]);
    
    // Always return valid account information - player must compare manually
    const balance = Math.floor(Math.random() * 50000) + 1000;
    setAccountBalance(balance);
    setVerificationState(prev => ({ ...prev, accountLookedUp: true }));
    
    setTimeout(() => {
      setTerminalOutput(prev => [...prev, 
        "✓✓✓ ACCOUNT VERIFIED - RECORD FOUND ✓✓✓",
        "STATUS: ACTIVE CUSTOMER",
        `BALANCE: $${balance.toLocaleString()}`,
        "BANK RECORDS NOW DISPLAYED BELOW"
      ]);
      playSound('cash');
    }, 1500);
  };

  // Handle customer dismissal without service
  const handleCustomerDismissal = () => {
    if (!currentCustomer) return;
    
    const currentCount = gameScore.customersCalledWithoutService;
    const newCount = currentCount + 1;
    console.log("DISMISSAL DEBUG: Current count:", currentCount, "New count will be:", newCount, "Warning already given:", gameScore.dismissalWarningGiven);
    
    // Always clear customer and generate new one first
    setCurrentCustomer(null);
    setVerificationState({ accountLookedUp: false, signatureCompared: false });
    
    // Handle warning at exactly 2nd dismissal - WARNING ONLY, GAME CONTINUES
    if (newCount === 2 && !gameScore.dismissalWarningGiven) {
      setTerminalOutput(prev => [...prev,
        "",
        "⚠️ SUPERVISOR ALERT ⚠️",
        "WARNING: Customer service protocol violation",
        "You have dismissed 2 customers without service", 
        "This is your FIRST WARNING",
        "Two more dismissals will result in termination",
        "Please serve all customers properly",
        ""
      ]);
      playSound('reject');
      setGameScore(prev => ({ 
        ...prev, 
        customersCalledWithoutService: newCount, 
        dismissalWarningGiven: true 
      }));
      // Continue game with new customer - this is just a warning
      setTimeout(() => {
        setCurrentCustomer(generateCustomerLocal());
      }, 2000);
      return;
    }
    
    // Handle FINAL TERMINATION at exactly 4th dismissal - FIRED
    if (newCount === 4 && gameScore.dismissalWarningGiven) {
      setTerminalOutput(prev => [...prev,
        "",
        "🚨 YOU ARE FIRED 🚨",
        "FINAL TERMINATION: Excessive customer dismissals",
        "You have dismissed 4 customers without service",
        "You ignored the management warning",
        "You are terminated immediately",
        "Please collect your belongings and leave",
        ""
      ]);
      setGameScore(prev => ({ ...prev, customersCalledWithoutService: newCount }));
      // End game - YOU'RE FIRED
      setTimeout(() => setGamePhase('leaderboard'), 3000);
      return;
    }
    
    // Regular dismissal - just update count and continue
    setGameScore(prev => ({ ...prev, customersCalledWithoutService: newCount }));
    setTimeout(() => {
      setCurrentCustomer(generateCustomerLocal());
    }, 1000);
  };

  // Enhanced police arrest animation
  const triggerPoliceArrest = () => {
    setShowArrestAnimation(true);
    setArrestStage(0);
    
    // Create multiple police units
    const units = [
      { id: 1, x: -100, y: 50, delay: 0 },
      { id: 2, x: window.innerWidth + 100, y: 50, delay: 500 },
      { id: 3, x: -100, y: window.innerHeight - 150, delay: 1000 },
      { id: 4, x: window.innerWidth + 100, y: window.innerHeight - 150, delay: 1500 }
    ];
    setPoliceUnits(units);
    
    // Start siren flash effect
    setSirenFlash(true);
    const flashInterval = setInterval(() => {
      setSirenFlash(prev => !prev);
    }, 200);
    
    // Stage 1: Police units converge
    setTimeout(() => {
      setArrestStage(1);
      setTerminalOutput(prev => [...prev,
        "",
        "🚨 POLICE ALERT 🚨",
        "MULTIPLE UNITS RESPONDING",
        "SUSPECT DETAINED FOR QUESTIONING"
      ]);
    }, 2000);
    
    // Stage 2: Dramatic arrest sequence
    setTimeout(() => {
      setArrestStage(2);
      setTerminalOutput(prev => [...prev,
        "",
        "🚔 ARREST IN PROGRESS 🚔",
        "FRAUD INVESTIGATION UNIT ACTIVATED",
        "HANDCUFFS APPLIED - SUSPECT SECURED"
      ]);
    }, 4000);
    
    // Stage 3: Radio dispatch
    setTimeout(() => {
      setArrestStage(3);
      setTerminalOutput(prev => [...prev,
        "",
        "📻 DISPATCH: Unit 247 to Central",
        "📻 Suspect in custody for bank fraud",
        "📻 Requesting transport to county jail",
        "📻 Investigation ongoing - Case #FR-2024-891"
      ]);
    }, 6000);
    
    // Stage 4: Final transport
    setTimeout(() => {
      setArrestStage(4);
      clearInterval(flashInterval);
      setSirenFlash(false);
      setTerminalOutput(prev => [...prev,
        "",
        "🚨 CASE CLOSED 🚨",
        "FRAUD CONVICTION: 5-10 YEARS FEDERAL PRISON",
        "YOUR CRIMINAL CAREER IS OVER",
        ""
      ]);
    }, 8000);
    
    // End animation and go to game over
    setTimeout(() => {
      setShowArrestAnimation(false);
      setGamePhase('leaderboard');
    }, 10000);
  };

  const resetVerificationState = () => {
    setVerificationState({ accountLookedUp: false, signatureCompared: false });
  };

  const handleCorrectTransaction = () => {
    setGameScore(prev => ({
      ...prev,
      score: prev.score + 100,
      correctTransactions: prev.correctTransactions + 1,
      consecutiveErrors: 0
    }));
  };

  const handleIncorrectTransaction = (errorType: string) => {
    const newErrors = gameScore.errors + 1;
    const newConsecutiveErrors = gameScore.consecutiveErrors + 1;
    
    setGameScore(prev => ({
      ...prev,
      errors: newErrors,
      consecutiveErrors: newConsecutiveErrors,
      errorDetails: [...prev.errorDetails, errorType]
    }));
    
    if (newConsecutiveErrors >= 3) {
      setGamePhase('game_over');
    }
  };

  // Command processing system
  const processCommand = (command: string) => {
    const cmd = command.toUpperCase().trim();
    
    if (cmd.startsWith('DEPOSIT $')) {
      const amount = parseFloat(cmd.substring(9));
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (currentCustomer.transaction.type !== 'deposit') {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Customer requested " + currentCustomer.transaction.type]);
        return;
      }
      
      if (amount !== currentCustomer.transaction.amount) {
        setTerminalOutput(prev => [...prev, "> " + command, `ERROR: Amount mismatch. Customer depositing $${currentCustomer.transaction.amount}`]);
        return;
      }
      
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        "========================================",
        "PROCESSING DEPOSIT TRANSACTION",
        `CUSTOMER: ${currentCustomer.name}`,
        `AMOUNT: $${amount}`,
        `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
        `NEW BALANCE: $${(accountBalance + amount).toLocaleString()}`,
        "STATUS: TRANSACTION COMPLETE",
        "========================================"
      ]);
      
      handleCorrectTransaction();
      playSound('cash');
      
      setTimeout(() => {
        const customer = generateCustomerLocal();
        setCurrentCustomer(customer);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "", "> Next customer approaching...", "Ready to process transaction"]);
        console.log("Generated customer:", customer);
        playSound('customer_approach');
      }, 2000);
      
    } else if (cmd.startsWith('WITHDRAW $')) {
      const amount = parseFloat(cmd.substring(10));
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (currentCustomer.transaction.type !== 'withdrawal') {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Customer requested " + currentCustomer.transaction.type]);
        return;
      }
      
      if (amount !== currentCustomer.transaction.amount) {
        setTerminalOutput(prev => [...prev, "> " + command, `ERROR: Amount mismatch. Customer withdrawing $${currentCustomer.transaction.amount}`]);
        return;
      }
      
      const withdrawAmount = currentCustomer.transaction.amount;
      if (withdrawAmount > accountBalance) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Insufficient funds"]);
        return;
      }
      
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        "========================================",
        "PROCESSING WITHDRAWAL TRANSACTION",
        `CUSTOMER: ${currentCustomer.name}`,
        `AMOUNT: $${amount}`,
        `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
        `REMAINING BALANCE: $${(accountBalance - withdrawAmount).toLocaleString()}`,
        "STATUS: TRANSACTION COMPLETE",
        "========================================"
      ]);
      
      // Complete withdrawal transaction immediately
      handleCorrectTransaction();
      playSound('cash');
      
      // Generate next customer after brief pause
      setTimeout(() => {
        const customer = generateCustomerLocal();
        setCurrentCustomer(customer);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "", "> Next customer approaching...", "Ready to process transaction"]);
        console.log("Generated customer:", customer);
        playSound('customer_approach');
      }, 2000);
      
    } else if (cmd.startsWith('LOOKUP ')) {
      const accountNumber = cmd.substring(7).trim();
      lookupAccount(accountNumber);
      
    } else if (cmd.startsWith('REJECT')) {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      // Check if customer has fraudulent documents
      const hasFraudulentDocuments = currentCustomer.documents.some(doc => !doc.isValid);
      
      if (hasFraudulentDocuments) {
        // Correct rejection - customer was actually fraudulent
        setTerminalOutput(prev => [...prev, 
          "> " + command,
          "========================================",
          "TRANSACTION REJECTED - CORRECT DECISION",
          "Fraudulent documents detected",
          "Customer escorted from premises",
          "Security incident reported",
          "========================================",
          ""
        ]);
        
        handleCorrectTransaction();
        playSound('cash');
      } else {
        // Incorrect rejection - customer was legitimate
        setTerminalOutput(prev => [...prev, 
          "> " + command,
          "========================================",
          "TRANSACTION REJECTED - ERROR!",
          "Customer was legitimate",
          "Incident reported to supervisor",
          "Customer service violation recorded",
          "========================================",
          ""
        ]);
        
        handleIncorrectTransaction("Wrongful customer rejection");
        playSound('reject');
      }
      
      // Generate new customer
      setTimeout(() => {
        const customer = generateCustomerLocal();
        setCurrentCustomer(customer);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "> Next customer approaching...", "Ready to process transaction"]);
        console.log("Generated customer:", customer);
        playSound('customer_approach');
      }, 2000);
      
    } else if (cmd.startsWith('APPROVE')) {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      // Check if customer has fraudulent documents
      const hasFraudulentDocuments = currentCustomer.documents.some(doc => !doc.isValid);
      
      if (hasFraudulentDocuments) {
        // MAJOR ERROR - Approved fraudulent transaction
        const fraudCount = gameScore.fraudulentApprovals + 1;
        
        setTerminalOutput(prev => [...prev, 
          "> " + command,
          "========================================",
          "🚨 CRITICAL ERROR - FRAUD APPROVED 🚨",
          "You approved fraudulent documents!",
          "Transaction processed illegally",
          "Bank security compromised",
          `Fraudulent approvals: ${fraudCount}/2`,
          "========================================",
          ""
        ]);
        
        setGameScore(prev => ({
          ...prev,
          fraudulentApprovals: fraudCount,
          errors: prev.errors + 1,
          consecutiveErrors: prev.consecutiveErrors + 1,
          errorDetails: [...prev.errorDetails, "Approved fraudulent transaction"]
        }));
        
        // Check termination conditions
        if (fraudCount === 1) {
          setTerminalOutput(prev => [...prev,
            "⚠️ MANAGEMENT WARNING ⚠️",
            "FIRST FRAUDULENT APPROVAL DETECTED",
            "One more fraud approval = IMMEDIATE TERMINATION",
            "Review all documents carefully",
            ""
          ]);
          playSound('reject');
        } else if (fraudCount >= 2) {
          setTerminalOutput(prev => [...prev,
            "🚨 IMMEDIATE TERMINATION 🚨",
            "TWO FRAUDULENT APPROVALS DETECTED",
            "You are terminated for criminal negligence",
            "Fraud investigation initiated",
            ""
          ]);
          
          // Trigger police arrest sequence
          setTimeout(() => {
            triggerPoliceArrest();
          }, 2000);
          return;
        }
        
      } else {
        // Correct approval - customer was legitimate
        setTerminalOutput(prev => [...prev, 
          "> " + command,
          "========================================",
          "TRANSACTION APPROVED - CORRECT DECISION",
          "All documents verified as authentic",
          "Customer served successfully",
          "========================================",
          ""
        ]);
        
        handleCorrectTransaction();
        playSound('cash');
      }
      
      // Generate new customer
      setTimeout(() => {
        const customer = generateCustomerLocal();
        setCurrentCustomer(customer);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "> Next customer approaching...", "Ready to process transaction"]);
        console.log("Generated customer:", customer);
        playSound('customer_approach');
      }, 2000);
      
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Unknown command"]);
    }
  };

  const startGame = () => {
    setGamePhase('working');
    setCurrentCustomer(generateCustomerLocal());
    setGameInitialized(true);
    playSound('cash');
    
    // Start background music when game begins
    if (!musicMuted && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(e => {
        console.log("Music auto-play prevented:", e);
      });
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      playSound('typing');
      processCommand(terminalInput);
      setTerminalInput('');
    }
  };

  const handlePunchOut = () => {
    setGamePhase('punch_out');
    playSound('punch_clock');
    
    // Stop background music
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    
    // Calculate final score and time
    const endTime = Date.now();
    const totalTime = Math.floor((endTime - (Date.now() - gameScore.timeOnShift * 1000)) / 1000);
    
    setGameScore(prev => ({
      ...prev,
      timeOnShift: totalTime
    }));
    
    setTerminalOutput([
      "SHIFT COMPLETE",
      "PUNCHING OUT...",
      "",
      "PERFORMANCE SUMMARY:",
      `Transactions: ${gameScore.correctTransactions}`,
      `Errors: ${gameScore.errors}`,
      `Score: ${gameScore.score}`,
      `Time on shift: ${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`,
      "",
      "Thank you for your service",
      "Have a good day"
    ]);
    
    // Auto-transition to leaderboard
    setTimeout(() => {
      setGamePhase('leaderboard');
    }, 3000);
  };

  // Process transaction function
  const processTransaction = (action: 'approve' | 'reject') => {
    if (!currentCustomer) return;

    const isCorrectDecision = currentCustomer.isFraudulent ? action === 'reject' : action === 'approve';

    if (isCorrectDecision) {
      setGameScore(prev => ({
        ...prev,
        score: prev.score + 100,
        correctTransactions: prev.correctTransactions + 1
      }));
      
      setTerminalOutput(prev => [...prev, 
        `> TRANSACTION ${action.toUpperCase()}D CORRECTLY`,
        `> Score +100 points`,
        `> Processing next customer...`
      ]);
      
      setTimeout(() => {
        setCurrentCustomer(generateCustomerLocal());
        setVerificationState({
          accountLookedUp: false,
          signatureCompared: false
        });
      }, 2000);
    } else {
      const errorMessage = currentCustomer.isFraudulent 
        ? "FRAUD APPROVED - SECURITY BREACH!" 
        : "LEGITIMATE TRANSACTION REJECTED";
      
      setGameScore(prev => ({
        ...prev,
        errors: prev.errors + 1,
        fraudulentApprovals: currentCustomer.isFraudulent ? prev.fraudulentApprovals + 1 : prev.fraudulentApprovals,
        errorDetails: [...prev.errorDetails, errorMessage]
      }));
      
      setTerminalOutput(prev => [...prev, 
        `> ERROR: ${errorMessage}`,
        `> Score penalty applied`,
        `> Review procedures and continue`
      ]);
      
      setTimeout(() => {
        setCurrentCustomer(generateCustomerLocal());
        setVerificationState({
          accountLookedUp: false,
          signatureCompared: false
        });
      }, 3000);
    }
  };

  // Leaderboard functionality
  const saveScore = (playerName: string) => {
    const newEntry: LeaderboardEntry = {
      name: playerName,
      score: gameScore.score,
      date: new Date().toLocaleDateString()
    };
    
    const existingScores = JSON.parse(localStorage.getItem('tellerScores') || '[]');
    const updatedScores = [...existingScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10
    
    localStorage.setItem('tellerScores', JSON.stringify(updatedScores));
  };

  const getLeaderboard = (): LeaderboardEntry[] => {
    return JSON.parse(localStorage.getItem('tellerScores') || '[]');
  };

  // Render functions
  const renderDocument = (doc: GameDocument, index: number) => {
    return (
      <div
        key={doc.id}
        onClick={() => setSelectedDocument(doc)}
        style={{
          background: doc.isValid ? 'linear-gradient(145deg, #2a2a2a, #1a1a1a)' : 'linear-gradient(145deg, #3a1a1a, #2a0a0a)',
          border: doc.isValid ? '2px solid #ffff00' : '2px solid #ff4444',
          borderRadius: '6px',
          padding: '6px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '10px',
          fontFamily: 'monospace',
          minHeight: '80px',
          position: 'relative',
          boxShadow: doc.isValid ? '0 0 8px rgba(255, 255, 0, 0.2)' : '0 0 8px rgba(255, 68, 68, 0.3)'
        }}
      >
        {!doc.isValid && (
          <div style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#ff4444',
            color: '#ffffff',
            padding: '1px 4px',
            borderRadius: '2px',
            fontSize: '8px',
            fontWeight: 'bold'
          }}>
            ERROR
          </div>
        )}
        
        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '9px' }}>
          {doc.type.toUpperCase()} #{index + 1}
        </div>
        
        {doc.type === 'id' && (
          <div style={{ fontSize: '8px', lineHeight: '1.2' }}>
            <div>NAME: {doc.data.name}</div>
            <div>DOB: {doc.data.dateOfBirth}</div>
            <div>ACCT: {doc.data.accountNumber}</div>
            <div>ID#: {doc.data.idNumber}</div>
          </div>
        )}
        
        {doc.type === 'bank_book' && (
          <div style={{ fontSize: '8px', lineHeight: '1.2' }}>
            <div>ACCT: {doc.data.accountNumber}</div>
            <div>NAME: {doc.data.name}</div>
            <div>BAL: ${doc.data.balance}</div>
          </div>
        )}
        
        {doc.type === 'slip' && (
          <div style={{ fontSize: '8px', lineHeight: '1.2' }}>
            <div>ACCT: {doc.data.accountNumber}</div>
            <div>AMT: ${doc.data.amount}</div>
            <div>TYPE: {doc.data.type}</div>
          </div>
        )}
        
        {doc.type === 'signature' && (
          <div style={{ fontSize: '8px', lineHeight: '1.2' }}>
            <div>SIGNATURE</div>
            <div style={{ 
              border: '1px solid #666', 
              margin: '2px 0', 
              padding: '2px',
              background: '#f9f9f9',
              color: '#333',
              fontFamily: 'cursive',
              fontSize: '10px'
            }}>
              {doc.data.signature?.split('|')[0] || 'Signature'}
            </div>
          </div>
        )}
        
        {doc.hasError && (
          <div style={{
            color: '#ff4444',
            fontSize: '7px',
            marginTop: '2px',
            fontWeight: 'bold'
          }}>
            {doc.hasError}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: '#00ff00',
      fontFamily: 'monospace',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background music toggle */}
      <button
        onClick={() => setMusicMuted(!musicMuted)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: musicMuted ? '#666' : '#00ff00',
          color: musicMuted ? '#fff' : '#000',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        {musicMuted ? '🔇 MUSIC OFF' : '🎵 MUSIC ON'}
      </button>

      {/* Police arrest animation overlay */}
      {showArrestAnimation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: sirenFlash ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 255, 0.3)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}>
          {policeUnits.map(unit => (
            <div
              key={unit.id}
              style={{
                position: 'absolute',
                left: `${Math.min(Math.max(unit.x, 50), window.innerWidth - 100)}px`,
                top: `${unit.y}px`,
                fontSize: '40px',
                animation: `policeMove 2s ease-in-out ${unit.delay}ms forwards`
              }}
            >
              🚔
            </div>
          ))}
          
          <div style={{
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#ff0000',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            border: '3px solid #ff0000'
          }}>
            {arrestStage === 0 && "🚨 POLICE RESPONDING 🚨"}
            {arrestStage === 1 && "🚨 MULTIPLE UNITS ON SCENE 🚨"}
            {arrestStage === 2 && "🚔 ARREST IN PROGRESS 🚔"}
            {arrestStage === 3 && "📻 DISPATCH COMMUNICATIONS 📻"}
            {arrestStage === 4 && "🚨 SUSPECT IN CUSTODY 🚨"}
          </div>
        </div>
      )}

      {/* Punch In Screen */}
      {gamePhase === 'punch_in' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #333333, #111111)',
            border: '3px solid #ffff00',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 255, 0, 0.3)',
            maxWidth: '600px'
          }}>
            <h1 style={{
              fontSize: '28px',
              marginBottom: '20px',
              textShadow: '0 0 10px #ffff00'
            }}>
              WESTRIDGE NATIONAL BANK
            </h1>
            <h2 style={{
              fontSize: '20px',
              marginBottom: '30px',
              color: '#ffffff'
            }}>
              TELLER WORKSTATION v1.2
            </h2>
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              {terminalOutput.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
            <button
              onClick={() => {
                playSound('punch_clock');
                startGame();
              }}
              style={{
                background: 'linear-gradient(145deg, #ffff00, #cccc00)',
                border: '3px solid #ffffff',
                color: '#000000',
                padding: '20px 40px',
                fontSize: '20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: 'none'
              }}
            >
              PUNCH IN
            </button>
          </div>
        </div>
      )}

      {/* Working Phase */}
      {gamePhase === 'working' && (
        <div style={{
          display: 'flex',
          height: '100vh',
          padding: '5px',
          gap: '5px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Left Column - Terminal */}
          <div style={{
            flex: '0 0 30%',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            minHeight: 0
          }}>
            {/* Terminal Output */}
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '8px',
              flex: '1',
              overflow: 'auto',
              fontSize: '11px',
              fontFamily: 'monospace',
              minHeight: 0
            }}>
              {terminalOutput.map((line, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {line}
                </div>
              ))}
            </div>

            {/* Command Input */}
            <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Enter command (DEPOSIT $500, WITHDRAW $200, LOOKUP 12345, APPROVE, REJECT)"
                style={{
                  flex: '1',
                  background: '#000000',
                  border: '2px solid #00ff00',
                  color: '#00ff00',
                  padding: '10px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  borderRadius: '4px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#00ff00',
                  color: '#000000',
                  border: 'none',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ENTER
              </button>
            </form>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                onClick={() => processTransaction('approve')}
                style={{
                  background: 'linear-gradient(145deg, #00ff00, #00cc00)',
                  border: '2px solid #ffffff',
                  color: '#000000',
                  padding: '8px 12px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
              >
                APPROVE
              </button>
              
              <button
                onClick={() => processTransaction('reject')}
                style={{
                  background: 'linear-gradient(145deg, #ff6666, #cc3333)',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  padding: '8px 12px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
              >
                REJECT
              </button>
              
              <button
                onClick={handleCustomerDismissal}
                style={{
                  background: 'linear-gradient(145deg, #ffff00, #cccc00)',
                  border: '2px solid #ffffff',
                  color: '#000000',
                  padding: '8px 12px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                DISMISS
              </button>
              
              <button
                onClick={handlePunchOut}
                style={{
                  background: 'linear-gradient(145deg, #666666, #444444)',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  padding: '8px 12px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                PUNCH OUT
              </button>
            </div>

            {/* Score Display */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid #ffff00',
              borderRadius: '5px',
              padding: '10px',
              fontSize: '12px'
            }}>
              <div>SCORE: {gameScore.score}</div>
              <div>TRANSACTIONS: {gameScore.correctTransactions}</div>
              <div>ERRORS: {gameScore.errors}</div>
              <div>FRAUD APPROVALS: {gameScore.fraudulentApprovals}/2</div>
              <div>DISMISSALS: {gameScore.customersCalledWithoutService}/4</div>
            </div>
          </div>

          {/* Right Column - Customer & Documents */}
          <div style={{
            flex: '0 0 70%',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Customer Display */}
            {currentCustomer && (
              <div style={{
                background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: '2px solid #ffff00',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
                flex: '0 0 auto'
              }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>
                  CUSTOMER: {currentCustomer.name}
                </h3>
                <div style={{ fontSize: '10px', marginBottom: '3px' }}>
                  TRANSACTION: {currentCustomer.transaction.type.toUpperCase()} | ${currentCustomer.transaction.amount} | {currentCustomer.transaction.accountNumber}
                </div>
              </div>
            )}

            {/* Account Information */}
            {verificationState.accountLookedUp && (
              <div style={{
                background: 'linear-gradient(145deg, #1a2a1a, #0a1a0a)',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                padding: '8px',
                flex: '0 0 auto'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#00ff00', fontSize: '11px' }}>
                  BANK RECORDS
                </h4>
                <div style={{ fontSize: '10px' }}>STATUS: ACTIVE | BALANCE: ${accountBalance.toLocaleString()} | HOLDER: {currentCustomer?.name}</div>
              </div>
            )}

            {/* Documents */}
            {currentCustomer && (
              <div style={{
                background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: '2px solid #ffff00',
                borderRadius: '8px',
                padding: '8px',
                flex: '1',
                overflow: 'auto',
                minHeight: 0
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                  CUSTOMER DOCUMENTS
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '5px'
                }}>
                  {currentCustomer.documents.map((doc, index) => 
                    renderDocument(doc, index)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Punch Out Screen */}
      {gamePhase === 'punch_out' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #333333, #111111)',
            border: '3px solid #ffff00',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 255, 0, 0.3)',
            maxWidth: '600px'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
              SHIFT COMPLETE
            </h2>
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              {terminalOutput.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {gamePhase === 'leaderboard' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #333333, #111111)',
            border: '3px solid #ffff00',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 255, 0, 0.3)',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
              SHIFT COMPLETE
            </h2>
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <div>FINAL SCORE: {gameScore.score}</div>
              <div>TRANSACTIONS: {gameScore.correctTransactions}</div>
              <div>ERRORS: {gameScore.errors}</div>
              <div>FRAUD APPROVALS: {gameScore.fraudulentApprovals}</div>
              <div>DISMISSALS: {gameScore.customersCalledWithoutService}</div>
            </div>
            
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              fontSize: '12px',
              textAlign: 'left'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
                TOP SCORES
              </div>
              {getLeaderboard().map((entry, index) => (
                <div key={index} style={{ marginBottom: '5px' }}>
                  {index + 1}. {entry.name} - {entry.score} ({entry.date})
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                setGamePhase('punch_in');
                setGameScore({
                  score: 0,
                  correctTransactions: 0,
                  errors: 0,
                  timeOnShift: 0,
                  fraudulentApprovals: 0,
                  consecutiveErrors: 0,
                  errorDetails: [],
                  customersCalledWithoutService: 0,
                  dismissalWarningGiven: false
                });
                setCurrentCustomer(null);
                setSelectedDocument(null);
                setGameInitialized(false);
                setTerminalOutput([
                  "TELLER WORKSTATION v1.2",
                  "WESTRIDGE NATIONAL BANK",
                  "PUNCH IN TO BEGIN SHIFT",
                  "",
                  "TELLER AUTHENTICATION: APPROVED",
                  "",
                  "Ready for customer service"
                ]);
              }}
              style={{
                background: 'linear-gradient(145deg, #666666, #444444)',
                border: '3px solid #888888',
                color: '#ffffff',
                padding: '15px 30px',
                fontSize: '18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              NEW SHIFT
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes policeMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        
        input:focus {
          outline: none;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }
        
        button:hover {
          filter: brightness(1.1);
        }
        
        button:active {
          transform: scale(0.98);
        }
        
        * {
          box-sizing: border-box;
        }
      `}</style>
      
      {/* Banner Ad - Fixed at bottom */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: gamePhase === 'working' ? 'block' : 'none'
      }}>
        <BannerAd style={{ margin: '0 auto' }} />
      </div>
    </div>
  );
}

export default App;