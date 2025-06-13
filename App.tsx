import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeSignature, generateCustomer, generateDocuments } from './lib/customers';
import { getDocumentRenderer } from './lib/documents';
import type { Customer, Document as GameDocument } from './types/game';
import AdMobBannerAd from './components/AdMobBannerAd';

// Test AdMob IDs
const BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

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
  const [screenTransition, setScreenTransition] = useState('fadeIn');
  const [isTransitioning, setIsTransitioning] = useState(false);
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

  // Smooth transition functions
  const transitionToPhase = (newPhase: typeof gamePhase, animationType: string = 'fadeIn') => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setScreenTransition('fadeOut');
    
    setTimeout(() => {
      setGamePhase(newPhase);
      setScreenTransition(animationType);
      setIsTransitioning(false);
    }, 400);
  };

  const transitionWithDelay = (newPhase: typeof gamePhase, animationType: string, delay: number = 500) => {
    setIsTransitioning(true);
    setScreenTransition('slideOutToLeft');
    
    setTimeout(() => {
      setGamePhase(newPhase);
      setScreenTransition(animationType);
      setIsTransitioning(false);
    }, delay);
  };

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
      setTimeout(() => transitionToPhase('leaderboard', 'bounceIn'), 3000);
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
    transitionToPhase('police_arrest', 'zoomIn');
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
      transitionToPhase('leaderboard', 'slideInFromRight');
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
      transitionToPhase('game_over', 'zoomIn');
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
        
        handleIncorrectTransaction("Rejected legitimate customer");
        playSound('reject');
      }
      
      // Generate next customer after processing
      setTimeout(() => {
        const customer = generateCustomerLocal();
        setCurrentCustomer(customer);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "", "> Next customer approaching...", "Ready to process transaction"]);
        console.log("Generated customer:", customer);
        playSound('customer_approach');
      }, 2000);
      
    } else if (cmd === 'HELP') {
      setTerminalOutput(prev => [...prev,
        "> " + command,
        "========================================",
        "TELLER COMMANDS:",
        "",
        "DEPOSIT $[amount] - Process deposit",
        "WITHDRAW $[amount] - Process withdrawal", 
        "LOOKUP [account] - Search bank records",
        "REJECT - Reject suspicious transaction",
        "CLEAR - Clear terminal screen",
        "HELP - Show this help screen",
        "",
        "VERIFICATION COMMANDS:",
        "COMPARE - Compare signature manually",
        "VERIFY - Check document details",
        "",
        "NOTE: You must manually detect fraud!",
        "The system will NOT flag suspicious activity.",
        "========================================",
        ""
      ]);
      
    } else if (cmd === 'CLEAR') {
      setTerminalOutput([
        "TELLER WORKSTATION v1.2",
        "WESTRIDGE NATIONAL BANK", 
        "Terminal cleared. Ready for commands.",
        ""
      ]);
      
    } else if (cmd === 'NEXT' || cmd === 'SKIP') {
      handleCustomerDismissal();
      
    } else if (cmd.startsWith('COMPARE')) {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      const signatureDoc = currentCustomer.documents.find(doc => doc.type === 'signature');
      if (!signatureDoc) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No signature document found"]);
        return;
      }
      
      setVerificationState(prev => ({ ...prev, signatureCompared: true }));
      
      setTerminalOutput(prev => [...prev,
        "> " + command,
        "========================================",
        "SIGNATURE COMPARISON ANALYSIS",
        "",
        `Customer Name: ${currentCustomer.name}`,
        `Signature Data: ${signatureDoc.data.signature}`,
        "",
        "Manual verification required:",
        "- Check signature consistency",
        "- Verify against ID document", 
        "- Look for signs of forgery",
        "",
        "Status: MANUAL REVIEW REQUIRED",
        "Decision: TELLER DISCRETION",
        "========================================",
        ""
      ]);
      
    } else if (cmd === 'FRAUD' || cmd === 'CRIMINAL') {
      // Easter egg - if player types these, trigger police arrest
      triggerPoliceArrest();
      
    } else {
      setTerminalOutput(prev => [...prev, 
        "> " + command, 
        "Unknown command. Type HELP for available commands."
      ]);
    }
    
    playSound('typing');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (terminalInput.trim()) {
        processCommand(terminalInput);
        setTerminalInput('');
      }
    }
  };

  const startGame = () => {
    setGameInitialized(true);
    transitionToPhase('working', 'slideInFromRight');
    setCurrentCustomer(generateCustomerLocal());
    
    setTerminalOutput(prev => [...prev,
      "",
      "SHIFT STARTED",
      "WORKSTATION ACTIVE", 
      "Customer approaching teller window...",
      ""
    ]);
  };

  const renderDocument = (doc: GameDocument, index: number) => {
    const isSelected = selectedDocument?.id === doc.id;
    
    return (
      <div
        key={doc.id}
        className="document-card"
        onClick={() => setSelectedDocument(doc)}
        style={{
          border: isSelected ? '3px solid #ffff00' : '2px solid #00ff00',
          borderRadius: '8px',
          padding: '15px',
          margin: '10px 0',
          background: isSelected ? '#001a00' : '#000800',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#00ff00'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#ffff00' }}>
          {doc.type.toUpperCase()} DOCUMENT
        </div>
        
        {Object.entries(doc.data).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '5px' }}>
            <span style={{ color: '#cccccc' }}>{key}: </span>
            <span style={{ color: doc.isValid ? '#00ff00' : '#ff6666' }}>
              {String(value)}
            </span>
          </div>
        ))}
        
        {!doc.isValid && doc.hasError && (
          <div style={{ 
            marginTop: '10px', 
            padding: '5px', 
            background: '#330000',
            border: '1px solid #ff0000',
            borderRadius: '4px',
            color: '#ff6666',
            fontSize: '10px'
          }}>
            ⚠️ {doc.hasError}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      fontFamily: 'monospace',
      overflow: 'hidden'
    }}>
      {/* Police Arrest Animation Overlay */}
      {showArrestAnimation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: sirenFlash ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 255, 0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          {policeUnits.map(unit => (
            <div
              key={unit.id}
              style={{
                position: 'absolute',
                left: `${unit.x}px`,
                top: `${unit.y}px`,
                fontSize: '24px',
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
        <div className={`screen-${screenTransition}`} style={{
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
              color: '#cccccc'
            }}>
              TELLER WORKSTATION v1.2
            </h2>
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '30px',
              textAlign: 'left'
            }}>
              {terminalOutput.map((line, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {line}
                </div>
              ))}
            </div>
            <button
              className="button-pulse button-glow"
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
        <div className={`screen-${screenTransition}`} style={{
          display: 'flex',
          height: '100vh',
          padding: '8px',
          gap: '8px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Left Column - Terminal */}
          <div style={{
            flex: '0 0 35%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: 0
          }}>
            {/* Terminal Output */}
            <div className="terminal-container" style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '15px',
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
            
            {/* Terminal Input */}
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '10px',
              height: '120px'
            }}>
              <div style={{ marginBottom: '5px', fontSize: '11px' }}>
                Command Terminal:
              </div>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command (HELP for commands)"
                style={{
                  width: '100%',
                  background: '#000000',
                  border: '1px solid #00ff00',
                  color: '#00ff00',
                  padding: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderRadius: '4px'
                }}
              />
            </div>
            
            {/* Account Balance Display */}
            {verificationState.accountLookedUp && (
              <div style={{
                background: '#001100',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '11px',
                height: '140px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffff00' }}>
                  BANK RECORDS
                </div>
                <div>Balance: ${accountBalance.toLocaleString()}</div>
                <div>Status: ACTIVE</div>
                <div>Type: CHECKING</div>
                <div style={{ marginTop: '8px', fontSize: '9px', color: '#cccccc' }}>
                  Compare with customer documents manually
                </div>
              </div>
            )}
          </div>
          
          {/* Center Column - Customer Information */}
          <div style={{
            flex: '0 0 32%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: 0
          }}>
            {/* Current Customer */}
            {currentCustomer && (
              <div className="customer-card" style={{
                background: '#001100',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                animation: 'slideInFromLeft 0.6s ease-out'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffff00' }}>
                  CURRENT CUSTOMER
                </div>
                <div>Name: {currentCustomer.name}</div>
                <div>Transaction: {currentCustomer.transaction.type.toUpperCase()}</div>
                <div>Amount: ${currentCustomer.transaction.amount}</div>
                <div>Account: {currentCustomer.transaction.accountNumber}</div>
                <div style={{ marginTop: '8px', fontSize: '9px', color: '#cccccc' }}>
                  Examine documents for fraud indicators
                </div>
                
                <button
                  onClick={handleCustomerDismissal}
                  style={{
                    marginTop: '8px',
                    background: '#330000',
                    border: '1px solid #ff0000',
                    color: '#ff6666',
                    padding: '4px 8px',
                    fontSize: '9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  DISMISS CUSTOMER
                </button>
              </div>
            )}
            
            {/* Game Score */}
            <div style={{
              background: '#000011',
              border: '2px solid #6666ff',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '10px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#6666ff' }}>
                PERFORMANCE
              </div>
              <div>Score: {gameScore.score}</div>
              <div>Correct: {gameScore.correctTransactions}</div>
              <div>Errors: {gameScore.errors}</div>
              <div>Consecutive: {gameScore.consecutiveErrors}</div>
              <div>Dismissals: {gameScore.customersCalledWithoutService}</div>
              {gameScore.dismissalWarningGiven && (
                <div style={{ color: '#ff6666', fontSize: '8px', marginTop: '4px' }}>
                  ⚠️ WARNING ISSUED
                </div>
              )}
            </div>

            {/* Transaction Processing Controls */}
            {currentCustomer && (
              <div style={{
                background: '#001100',
                border: '2px solid #ffff00',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '11px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffff00' }}>
                  TRANSACTION PROCESSING
                </div>
                
                {/* Verification Status */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ 
                    color: verificationState.accountLookedUp ? '#00ff00' : '#666666',
                    fontSize: '9px'
                  }}>
                    {verificationState.accountLookedUp ? '✓' : '○'} Account Lookup
                  </div>
                  <div style={{ 
                    color: verificationState.signatureCompared ? '#00ff00' : '#666666',
                    fontSize: '9px'
                  }}>
                    {verificationState.signatureCompared ? '✓' : '○'} Signature Check
                  </div>
                </div>

                {/* Process Transaction Button */}
                <button
                  className={verificationState.accountLookedUp ? 'button-glow' : ''}
                  onClick={() => {
                    if (currentCustomer && verificationState.accountLookedUp) {
                      playSound('cash');
                      const transactionCommand = currentCustomer.transaction.type === 'deposit' 
                        ? `DEPOSIT $${currentCustomer.transaction.amount}`
                        : `WITHDRAW $${currentCustomer.transaction.amount}`;
                      processCommand(transactionCommand);
                    } else {
                      playSound('reject');
                    }
                  }}
                  style={{
                    width: '100%',
                    background: verificationState.accountLookedUp 
                      ? 'linear-gradient(145deg, #00ff00, #008800)' 
                      : '#333333',
                    border: '2px solid ' + (verificationState.accountLookedUp ? '#00ff00' : '#666666'),
                    color: verificationState.accountLookedUp ? '#000000' : '#666666',
                    padding: '8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    cursor: verificationState.accountLookedUp ? 'pointer' : 'not-allowed',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  {verificationState.accountLookedUp 
                    ? `PROCESS ${currentCustomer.transaction.type.toUpperCase()}`
                    : 'VERIFY ACCOUNT FIRST'
                  }
                </button>

                <button
                  onClick={() => {
                    playSound('reject');
                    processCommand('REJECT');
                  }}
                  style={{
                    width: '100%',
                    background: '#330000',
                    border: '2px solid #ff0000',
                    color: '#ff6666',
                    padding: '6px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    marginTop: '6px'
                  }}
                >
                  REJECT TRANSACTION
                </button>
              </div>
            )}
          </div>
          
          {/* Right Column - Documents */}
          <div style={{
            flex: '0 0 33%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: 0
          }}>
            <div style={{
              background: '#110000',
              border: '2px solid #ffff00',
              borderRadius: '8px',
              padding: '10px',
              flex: '1',
              overflow: 'auto',
              minHeight: 0
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#ffff00', fontSize: '12px' }}>
                CUSTOMER DOCUMENTS
              </div>
              
              {currentCustomer ? (
                currentCustomer.documents.map((doc, index) => renderDocument(doc, index))
              ) : (
                <div style={{ textAlign: 'center', color: '#666666', marginTop: '50px', fontSize: '12px' }}>
                  No customer present
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            {currentCustomer && (
              <div style={{
                background: '#002200',
                border: '2px solid #00ff00',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#00ff00', fontSize: '10px', textAlign: 'center' }}>
                  QUICK ACTIONS
                </div>
                
                <button
                  onClick={() => {
                    playSound('typing');
                    processCommand(`LOOKUP ${currentCustomer.transaction.accountNumber}`);
                  }}
                  style={{
                    background: verificationState.accountLookedUp ? '#004400' : 'linear-gradient(145deg, #00aa00, #006600)',
                    border: '1px solid #00ff00',
                    color: '#ffffff',
                    padding: '6px',
                    fontSize: '9px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  {verificationState.accountLookedUp ? '✓ ACCOUNT VERIFIED' : 'LOOKUP ACCOUNT'}
                </button>

                <button
                  onClick={() => {
                    playSound('typing');
                    processCommand('COMPARE');
                  }}
                  style={{
                    background: verificationState.signatureCompared ? '#004400' : 'linear-gradient(145deg, #aaaa00, #666600)',
                    border: '1px solid #ffff00',
                    color: '#ffffff',
                    padding: '6px',
                    fontSize: '9px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                >
                  {verificationState.signatureCompared ? '✓ SIGNATURE CHECKED' : 'COMPARE SIGNATURE'}
                </button>

                <button
                  onClick={() => {
                    playSound('typing');
                    processCommand('HELP');
                  }}
                  style={{
                    background: '#333333',
                    border: '1px solid #666666',
                    color: '#cccccc',
                    padding: '4px',
                    fontSize: '8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  HELP
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gamePhase === 'leaderboard' && (
        <div className={`screen-${screenTransition}`} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #333333, #111111)',
            border: '3px solid #00ff00',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            <h1 style={{
              fontSize: '28px',
              marginBottom: '20px',
              color: '#00ff00'
            }}>
              SHIFT COMPLETE
            </h1>
            
            <div style={{
              background: '#000000',
              border: '2px solid #00ff00',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ color: '#ffff00', marginBottom: '10px', fontSize: '16px' }}>
                FINAL PERFORMANCE REPORT
              </div>
              <div>Total Score: {gameScore.score}</div>
              <div>Correct Transactions: {gameScore.correctTransactions}</div>
              <div>Total Errors: {gameScore.errors}</div>
              <div>Customers Dismissed: {gameScore.customersCalledWithoutService}</div>
              
              {gameScore.errorDetails.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <div style={{ color: '#ff6666', marginBottom: '5px' }}>
                    Error Details:
                  </div>
                  {gameScore.errorDetails.map((error, index) => (
                    <div key={index} style={{ fontSize: '10px', color: '#ff9999' }}>
                      • {error}
                    </div>
                  ))}
                </div>
              )}
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
        
        /* Transition Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes slideInFromLeft {
          from { 
            transform: translateX(-100%); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }
        
        @keyframes slideInFromRight {
          from { 
            transform: translateX(100%); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }
        
        @keyframes slideOutToLeft {
          from { 
            transform: translateX(0); 
            opacity: 1; 
          }
          to { 
            transform: translateX(-100%); 
            opacity: 0; 
          }
        }
        
        @keyframes slideOutToRight {
          from { 
            transform: translateX(0); 
            opacity: 1; 
          }
          to { 
            transform: translateX(100%); 
            opacity: 0; 
          }
        }
        
        @keyframes bounceIn {
          0% { 
            transform: scale(0.3) translateY(-100px); 
            opacity: 0; 
          }
          50% { 
            transform: scale(1.05) translateY(10px); 
            opacity: 0.8; 
          }
          70% { 
            transform: scale(0.9) translateY(-5px); 
            opacity: 0.9; 
          }
          100% { 
            transform: scale(1) translateY(0); 
            opacity: 1; 
          }
        }
        
        @keyframes zoomIn {
          from { 
            transform: scale(0.5); 
            opacity: 0; 
          }
          to { 
            transform: scale(1); 
            opacity: 1; 
          }
        }
        
        @keyframes zoomOut {
          from { 
            transform: scale(1); 
            opacity: 1; 
          }
          to { 
            transform: scale(0.5); 
            opacity: 0; 
          }
        }
        
        @keyframes rotateIn {
          from { 
            transform: rotate(-180deg) scale(0.5); 
            opacity: 0; 
          }
          to { 
            transform: rotate(0deg) scale(1); 
            opacity: 1; 
          }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.8), 0 0 30px rgba(0, 255, 0, 0.6); }
          100% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
        }
        
        /* Animation Classes */
        .screen-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .screen-fadeOut {
          animation: fadeOut 0.4s ease-in;
        }
        
        .screen-slideInFromLeft {
          animation: slideInFromLeft 0.7s ease-out;
        }
        
        .screen-slideInFromRight {
          animation: slideInFromRight 0.7s ease-out;
        }
        
        .screen-slideOutToLeft {
          animation: slideOutToLeft 0.5s ease-in;
        }
        
        .screen-slideOutToRight {
          animation: slideOutToRight 0.5s ease-in;
        }
        
        .screen-bounceIn {
          animation: bounceIn 0.8s ease-out;
        }
        
        .screen-zoomIn {
          animation: zoomIn 0.5s ease-out;
        }
        
        .screen-zoomOut {
          animation: zoomOut 0.4s ease-in;
        }
        
        .screen-rotateIn {
          animation: rotateIn 0.8s ease-out;
        }
        
        .button-pulse {
          animation: pulse 2s infinite;
        }
        
        .button-glow {
          animation: glow 2s infinite;
        }
        
        /* Interactive Button Animations */
        button:hover {
          filter: brightness(1.2);
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
        
        button:active {
          transform: translateY(0px) scale(0.98);
          transition: all 0.1s ease;
        }
        
        .terminal-container {
          transition: all 0.3s ease;
        }
        
        .customer-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .customer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 255, 0, 0.3);
        }
        
        .document-card {
          transition: all 0.2s ease;
        }
        
        .document-card:hover {
          transform: scale(1.02);
          border-color: #00ff00;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
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
        <AdMobBannerAd 
          adUnitId={BANNER_AD_UNIT_ID}
          bannerSize="smartBannerPortrait"
          testDeviceID="EMULATOR"
          onDidFailToReceiveAdWithError={(error: string) => console.log('Banner ad error:', error)}
        />
      </div>
    </div>
  );
}

export default App;