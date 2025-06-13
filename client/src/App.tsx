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
          border: doc.isValid ? '2px solid #ffff00' : '3px solid #ff4444',
          borderRadius: '8px',
          padding: '10px',
          margin: '5px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '12px',
          fontFamily: 'monospace',
          minHeight: '120px',
          position: 'relative',
          boxShadow: doc.isValid ? '0 0 10px rgba(255, 255, 0, 0.3)' : '0 0 15px rgba(255, 68, 68, 0.4)'
        }}
      >
        {!doc.isValid && (
          <div style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#ff4444',
            color: '#ffffff',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            MISMATCH
          </div>
        )}
        
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          {doc.type.toUpperCase()} #{index + 1}
        </div>
        
        {doc.type === 'id' && (
          <div>
            <div>NAME: {doc.data.name}</div>
            <div>DOB: {doc.data.dateOfBirth}</div>
            <div>ADDRESS: {doc.data.address}</div>
            <div>ID#: {doc.data.idNumber}</div>
          </div>
        )}
        
        {doc.type === 'bank_book' && (
          <div>
            <div>ACCOUNT: {doc.data.accountNumber}</div>
            <div>NAME: {doc.data.name}</div>
            <div>BALANCE: ${doc.data.balance}</div>
          </div>
        )}
        
        {doc.type === 'slip' && (
          <div>
            <div>ACCOUNT: {doc.data.accountNumber}</div>
            <div>AMOUNT: ${doc.data.amount}</div>
            <div>TYPE: {doc.data.type}</div>
          </div>
        )}
        
        {doc.type === 'signature' && (
          <div>
            <div>SIGNATURE CARD</div>
            <div style={{ 
              border: '1px solid #666', 
              margin: '5px 0', 
              padding: '5px',
              background: '#f9f9f9',
              color: '#333',
              fontFamily: 'cursive',
              fontSize: '14px'
            }}>
              {doc.data.signature}
            </div>
          </div>
        )}
        
        {doc.hasError && (
          <div style={{
            color: '#ff4444',
            fontSize: '10px',
            marginTop: '5px',
            fontWeight: 'bold'
          }}>
            ERROR: {doc.hasError}
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
          flexDirection: 'column',
          height: '100vh',
          padding: '20px',
          gap: '20px',
          background: 'linear-gradient(145deg, #000000, #111111)'
        }}>
          {/* Customer Information Header */}
          {currentCustomer && (
            <div style={{
              background: 'linear-gradient(145deg, #1a1a1a, #000000)',
              border: '4px solid #ffff00',
              borderRadius: '20px',
              padding: '25px',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(255, 255, 0, 0.4)'
            }}>
              <h2 style={{ 
                margin: '0 0 15px 0', 
                fontSize: '28px', 
                color: '#ffff00', 
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(255, 255, 0, 0.5)'
              }}>
                CUSTOMER: {currentCustomer.name}
              </h2>
              <div style={{ 
                fontSize: '20px', 
                color: '#ffffff', 
                fontFamily: 'monospace',
                lineHeight: '1.4'
              }}>
                {currentCustomer.transaction.type.toUpperCase()} | ${currentCustomer.transaction.amount.toLocaleString()} | ACCT: {currentCustomer.transaction.accountNumber}
              </div>
            </div>
          )}

          {/* Main Interface Row */}
          <div style={{
            display: 'flex',
            gap: '20px',
            flex: '1',
            minHeight: 0
          }}>
            {/* Bank Computer Panel */}
            <div style={{
              flex: '0 0 45%',
              background: 'linear-gradient(145deg, #0a2a0a, #002200)',
              border: '4px solid #00ff00',
              borderRadius: '20px',
              padding: '25px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 0 40px rgba(0, 255, 0, 0.3)'
            }}>
              <div style={{ 
                color: '#00ff00', 
                fontSize: '20px', 
                textAlign: 'center', 
                fontFamily: 'monospace',
                fontWeight: 'bold',
                borderBottom: '3px solid #00ff00',
                paddingBottom: '15px',
                textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
              }}>
                ███ BANK COMPUTER TERMINAL ███
              </div>

              {/* Account Lookup Section */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="Enter account number..."
                  style={{
                    flex: '1',
                    background: '#000000',
                    border: '3px solid #00ff00',
                    color: '#00ff00',
                    padding: '20px',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    borderRadius: '12px',
                    boxShadow: 'inset 0 0 10px rgba(0, 255, 0, 0.2)'
                  }}
                />
                <button
                  onClick={() => {
                    if (currentCustomer) {
                      const accountNumber = currentCustomer.transaction.accountNumber;
                      setTerminalInput(accountNumber);
                      lookupAccount(accountNumber);
                    }
                  }}
                  style={{
                    background: 'linear-gradient(145deg, #0066ff, #0044cc)',
                    border: '3px solid #ffffff',
                    color: '#ffffff',
                    padding: '20px 30px',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 5px 15px rgba(0, 102, 255, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  LOOKUP
                </button>
              </div>

              {/* Bank Records Display */}
              {verificationState.accountLookedUp && currentCustomer && (
                <div style={{
                  background: '#000000',
                  border: '3px solid #00ff00',
                  borderRadius: '12px',
                  padding: '20px',
                  flex: '1',
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.1)'
                }}>
                  <div style={{ 
                    color: '#00ff00', 
                    fontSize: '16px', 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    fontWeight: 'bold',
                    textShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
                  }}>
                    ████ WESTRIDGE NATIONAL BANK MAINFRAME ████
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#ffffff' }}>
                    <div style={{ color: '#00ff00', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>ACCOUNT LOOKUP RESULTS:</div>
                    <div>ACCOUNT: {currentCustomer.transaction.accountNumber}</div>
                    <div>NAME: {currentCustomer.name}</div>
                    <div>STATUS: ACTIVE</div>
                    <div>BALANCE: ${accountBalance.toLocaleString()}</div>
                    <div>TYPE: CHECKING</div>
                    <div>BRANCH: 001-WESTFIELD</div>
                    <div>SSN: XXX-XX-{Math.floor(Math.random() * 9000) + 1000}</div>
                    <div>OPENED: {new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                    <div style={{ color: '#00ff00', marginTop: '15px', fontWeight: 'bold' }}>SIGNATURE ON FILE: ✓ VERIFIED</div>
                    
                    {verificationState.signatureCompared && (
                      <div style={{ 
                        borderTop: '2px solid #00ff00', 
                        marginTop: '15px', 
                        paddingTop: '15px'
                      }}>
                        <div style={{ color: '#ffff00', fontSize: '14px', fontWeight: 'bold' }}>SIGNATURE ANALYSIS RESULTS:</div>
                        <div style={{ 
                          color: currentCustomer.documents.find(d => d.type === 'signature')?.isValid ? '#00ff00' : '#ff4444',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          marginTop: '5px'
                        }}>
                          {currentCustomer.documents.find(d => d.type === 'signature')?.isValid 
                            ? "✓ SIGNATURE MATCH CONFIRMED" 
                            : "⚠ SIGNATURE DISCREPANCY DETECTED"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Processing Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <button
                  onClick={() => processCommand('DEPOSIT')}
                  disabled={!currentCustomer || currentCustomer.transaction.type !== 'deposit'}
                  style={{
                    background: currentCustomer?.transaction.type === 'deposit' 
                      ? 'linear-gradient(145deg, #00ff00, #00cc00)'
                      : 'linear-gradient(145deg, #666666, #444444)',
                    border: '3px solid #ffffff',
                    color: currentCustomer?.transaction.type === 'deposit' ? '#000000' : '#999999',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: currentCustomer?.transaction.type === 'deposit' ? 'pointer' : 'not-allowed',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    boxShadow: currentCustomer?.transaction.type === 'deposit' ? '0 5px 15px rgba(0, 255, 0, 0.3)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  PROCESS DEPOSIT
                </button>
                
                <button
                  onClick={() => processCommand('WITHDRAW')}
                  disabled={!currentCustomer || currentCustomer.transaction.type !== 'withdrawal'}
                  style={{
                    background: currentCustomer?.transaction.type === 'withdrawal' 
                      ? 'linear-gradient(145deg, #ffaa00, #cc8800)'
                      : 'linear-gradient(145deg, #666666, #444444)',
                    border: '3px solid #ffffff',
                    color: currentCustomer?.transaction.type === 'withdrawal' ? '#000000' : '#999999',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: currentCustomer?.transaction.type === 'withdrawal' ? 'pointer' : 'not-allowed',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    boxShadow: currentCustomer?.transaction.type === 'withdrawal' ? '0 5px 15px rgba(255, 170, 0, 0.3)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  PROCESS WITHDRAWAL
                </button>
                
                <button
                  onClick={() => processCommand('WIRE')}
                  disabled={!currentCustomer || currentCustomer.transaction.type !== 'wire_transfer'}
                  style={{
                    background: currentCustomer?.transaction.type === 'wire_transfer' 
                      ? 'linear-gradient(145deg, #00aaff, #0088cc)'
                      : 'linear-gradient(145deg, #666666, #444444)',
                    border: '3px solid #ffffff',
                    color: currentCustomer?.transaction.type === 'wire_transfer' ? '#000000' : '#999999',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: currentCustomer?.transaction.type === 'wire_transfer' ? 'pointer' : 'not-allowed',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    boxShadow: currentCustomer?.transaction.type === 'wire_transfer' ? '0 5px 15px rgba(0, 170, 255, 0.3)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  PROCESS WIRE
                </button>
                
                <button
                  onClick={() => processCommand('REJECT')}
                  style={{
                    background: 'linear-gradient(145deg, #ff6666, #cc3333)',
                    border: '3px solid #ffffff',
                    color: '#ffffff',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    boxShadow: '0 5px 15px rgba(255, 102, 102, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  REJECT TRANSACTION
                </button>
              </div>

              {/* Score Display */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '3px solid #ffff00',
                borderRadius: '12px',
                padding: '20px',
                fontSize: '16px',
                fontFamily: 'monospace',
                boxShadow: '0 0 20px rgba(255, 255, 0, 0.2)'
              }}>
                <div style={{ color: '#ffff00', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>PERFORMANCE METRICS:</div>
                <div style={{ lineHeight: '1.4' }}>
                  <div>SCORE: {gameScore.score}</div>
                  <div>TRANSACTIONS: {gameScore.correctTransactions}</div>
                  <div>ERRORS: {gameScore.errors}</div>
                  <div>FRAUD APPROVALS: {gameScore.fraudulentApprovals}/2</div>
                  <div>DISMISSALS: {gameScore.customersCalledWithoutService}/4</div>
                </div>
              </div>
            </div>

            {/* Customer Documents Panel */}
            <div style={{
              flex: '1',
              background: 'linear-gradient(145deg, #2a2a0a, #1a1a00)',
              border: '4px solid #ffff00',
              borderRadius: '20px',
              padding: '25px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 0 40px rgba(255, 255, 0, 0.3)'
            }}>
              <div style={{ 
                color: '#ffff00', 
                fontSize: '20px', 
                textAlign: 'center', 
                fontFamily: 'monospace',
                fontWeight: 'bold',
                borderBottom: '3px solid #ffff00',
                paddingBottom: '15px',
                textShadow: '0 0 10px rgba(255, 255, 0, 0.5)'
              }}>
                ███ CUSTOMER DOCUMENTS ███
              </div>

              {/* Documents Grid */}
              {currentCustomer && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '20px',
                  flex: '1',
                  overflow: 'auto'
                }}>
                  {currentCustomer.documents.map((doc, index) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      style={{
                        background: doc.isValid ? 'linear-gradient(145deg, #3a3a3a, #2a2a2a)' : 'linear-gradient(145deg, #4a2a2a, #3a1a1a)',
                        border: doc.isValid ? '4px solid #ffff00' : '4px solid #ff4444',
                        borderRadius: '15px',
                        padding: '20px',
                        cursor: 'pointer',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontFamily: 'monospace',
                        minHeight: '180px',
                        position: 'relative',
                        boxShadow: doc.isValid ? '0 0 20px rgba(255, 255, 0, 0.4)' : '0 0 20px rgba(255, 68, 68, 0.5)',
                        transition: 'all 0.3s ease',
                        transform: selectedDocument?.id === doc.id ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      {!doc.isValid && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#ff4444',
                          color: '#ffffff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: '0 0 10px rgba(255, 68, 68, 0.5)'
                        }}>
                          ERROR
                        </div>
                      )}
                      
                      <div style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '14px', color: '#ffff00' }}>
                        {doc.type.toUpperCase()} #{index + 1}
                      </div>
                      
                      {doc.type === 'id' && (
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          <div><strong>NAME:</strong> {doc.data.name}</div>
                          <div><strong>DOB:</strong> {doc.data.dateOfBirth}</div>
                          <div><strong>ACCOUNT:</strong> {doc.data.accountNumber}</div>
                          <div><strong>ID#:</strong> {doc.data.idNumber}</div>
                        </div>
                      )}
                      
                      {doc.type === 'bank_book' && (
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          <div><strong>ACCOUNT:</strong> {doc.data.accountNumber}</div>
                          <div><strong>NAME:</strong> {doc.data.name}</div>
                          <div><strong>BALANCE:</strong> ${doc.data.balance?.toLocaleString()}</div>
                        </div>
                      )}
                      
                      {doc.type === 'slip' && (
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          <div><strong>ACCOUNT:</strong> {doc.data.accountNumber}</div>
                          <div><strong>AMOUNT:</strong> ${doc.data.amount?.toLocaleString()}</div>
                          <div><strong>TYPE:</strong> {doc.data.type}</div>
                        </div>
                      )}
                      
                      {doc.type === 'signature' && (
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          <div><strong>SIGNATURE CARD</strong></div>
                          <div style={{ 
                            border: '3px solid #666', 
                            margin: '12px 0', 
                            padding: '15px',
                            background: '#f9f9f9',
                            color: '#333',
                            fontFamily: 'cursive',
                            fontSize: '18px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.1)'
                          }}>
                            {doc.data.signature?.split('|')[0] || 'Signature'}
                          </div>
                        </div>
                      )}
                      
                      {doc.hasError && (
                        <div style={{
                          color: '#ff4444',
                          fontSize: '12px',
                          marginTop: '12px',
                          fontWeight: 'bold',
                          borderTop: '2px solid #ff4444',
                          paddingTop: '12px'
                        }}>
                          {doc.hasError}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={() => processCommand('COMPARE SIG')}
                  style={{
                    background: 'linear-gradient(145deg, #ff6600, #cc4400)',
                    border: '3px solid #ffffff',
                    color: '#ffffff',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    flex: 1,
                    boxShadow: '0 5px 15px rgba(255, 102, 0, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  CHECK SIGNATURE
                </button>
                
                <button
                  onClick={handleCustomerDismissal}
                  style={{
                    background: 'linear-gradient(145deg, #ffaa00, #cc8800)',
                    border: '3px solid #ffffff',
                    color: '#000000',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    flex: 1,
                    boxShadow: '0 5px 15px rgba(255, 170, 0, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  DISMISS CUSTOMER
                </button>
                
                <button
                  onClick={handlePunchOut}
                  style={{
                    background: 'linear-gradient(145deg, #666666, #444444)',
                    border: '3px solid #ffffff',
                    color: '#ffffff',
                    padding: '20px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    flex: 1,
                    boxShadow: '0 5px 15px rgba(102, 102, 102, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  END SHIFT
                </button>
              </div>
            </div>
          </div>
        </div>
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
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleCustomerDismissal}
                style={{
                  background: 'linear-gradient(145deg, #ff6666, #cc3333)',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  padding: '10px 15px',
                  fontSize: '12px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                DISMISS CUSTOMER
              </button>
              
              <button
                onClick={handlePunchOut}
                style={{
                  background: 'linear-gradient(145deg, #666666, #444444)',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  padding: '10px 15px',
                  fontSize: '12px',
                  borderRadius: '5px',
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
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Customer Display */}
            {currentCustomer && (
              <div style={{
                background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: '2px solid #ffff00',
                borderRadius: '8px',
                padding: '15px',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                  CUSTOMER: {currentCustomer.name}
                </h3>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                  TRANSACTION: {currentCustomer.transaction.type.toUpperCase()}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                  AMOUNT: ${currentCustomer.transaction.amount}
                </div>
                <div style={{ fontSize: '14px' }}>
                  ACCOUNT: {currentCustomer.transaction.accountNumber}
                </div>
              </div>
            )}

            {/* Account Information */}
            {verificationState.accountLookedUp && (
              <div style={{
                background: 'linear-gradient(145deg, #1a2a1a, #0a1a0a)',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                padding: '15px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>
                  BANK RECORDS
                </h4>
                <div>ACCOUNT STATUS: ACTIVE</div>
                <div>CURRENT BALANCE: ${accountBalance.toLocaleString()}</div>
                <div>ACCOUNT HOLDER: {currentCustomer?.name}</div>
              </div>
            )}

            {/* Documents */}
            {currentCustomer && (
              <div style={{
                background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: '2px solid #ffff00',
                borderRadius: '8px',
                padding: '15px',
                flex: '1',
                overflow: 'auto'
              }}>
                <h4 style={{ margin: '0 0 15px 0' }}>
                  CUSTOMER DOCUMENTS
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px'
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