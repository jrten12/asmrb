import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeSignature, generateCustomer, generateDocuments } from './lib/customers';
import { getDocumentRenderer } from './lib/documents';
import type { Customer, Document as GameDocument } from './types/game';
import AdMobBannerAd from './components/AdMobBannerAd';

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
  
  // AdMob state management
  const [admobInitialized, setAdmobInitialized] = useState(false);
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const [customersServed, setCustomersServed] = useState(0);

  // Generate bank signature on file for comparison
  const generateLegitimateSignature = (name: string): string => {
    // Create a clean, proper signature for legitimate customers
    return name;
  };

  const generateFraudulentSignature = (name: string): string => {
    // Create a signature that's similar but clearly different for fraudsters
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      // Swap first and last names
      return `${nameParts[1]} ${nameParts[0]}`;
    } else {
      // Add slight variations for single names
      const variations = [
        name + 'son',
        name.slice(0, -1) + 'e',
        name.replace(/[aeiou]/i, 'a'),
        'J. ' + name
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  };
  
  // Account lookup state (no automatic fraud detection)
  const [accountBalance, setAccountBalance] = useState(0);
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    signatureCompared: false
  });
  
  // Keypad state for account number entry
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const [keypadMode, setKeypadMode] = useState<'lookup' | 'verify'>('lookup');

  // AdMob interstitial ad functions with error handling
  const loadInterstitialAd = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && (window.webkit.messageHandlers as any).admob) {
        (window.webkit.messageHandlers as any).admob.postMessage({
          action: 'loadInterstitial',
          adUnitId: 'ca-app-pub-2744316013184797/4741683992' // Production Interstitial Ad Unit ID
        });
      }
    } catch (error) {
      console.log('AdMob loadInterstitialAd error (web environment):', error);
    }
  }, []);

  const showInterstitialAd = useCallback(() => {
    try {
      if (isInterstitialLoaded && typeof window !== 'undefined') {
        if (window.webkit && window.webkit.messageHandlers && (window.webkit.messageHandlers as any).admob) {
          (window.webkit.messageHandlers as any).admob.postMessage({
            action: 'showInterstitial'
          });
        }
        setIsInterstitialLoaded(false);
        // Load next ad
        setTimeout(loadInterstitialAd, 1000);
      }
    } catch (error) {
      console.log('AdMob showInterstitialAd error (web environment):', error);
    }
  }, [isInterstitialLoaded, loadInterstitialAd]);

  // Initialize AdMob with error handling
  useEffect(() => {
    const initializeAdMob = () => {
      try {
        if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers) {
          // Initialize AdMob for iOS
          if ((window.webkit.messageHandlers as any).admob) {
            (window.webkit.messageHandlers as any).admob.postMessage({
              action: 'initialize',
              appId: 'ca-app-pub-2744316013184797~4167964772', // Production App ID
              testDeviceIds: [] // Remove test device IDs for production
            });
          }
          
          // Set up ad event listeners
          (window as any).admobEvents = {
            onInterstitialLoaded: () => setIsInterstitialLoaded(true),
            onInterstitialFailedToLoad: () => setIsInterstitialLoaded(false)
          };
          
          setAdmobInitialized(true);
        } else {
          // Fallback for web testing
          console.log('AdMob: Running in web environment, using test mode');
          setAdmobInitialized(true);
          setIsInterstitialLoaded(true);
        }
      } catch (error) {
        console.log('AdMob initialization error (web environment):', error);
        setAdmobInitialized(true);
        setIsInterstitialLoaded(true);
      }
    };

    initializeAdMob();
  }, []);

  // Load ads when AdMob is initialized with error handling
  useEffect(() => {
    if (admobInitialized) {
      try {
        loadInterstitialAd();
      } catch (error) {
        console.log('Error loading initial ad (web environment):', error);
      }
    }
  }, [admobInitialized, loadInterstitialAd]);

  // Sound effects using your authentic ASMR SFX files
  const playSound = (soundType: string) => {
    if (musicMuted) return;
    
    try {
      let audio: HTMLAudioElement;
      switch (soundType) {
        case 'typing':
          audio = new Audio('/SFX/typing-asmr.mp3');
          audio.volume = 0.4;
          break;
        case 'punch_clock':
          audio = new Audio('/SFX/punch-clock.mp3');
          audio.volume = 0.5;
          break;
        case 'cash':
          audio = new Audio('/SFX/cash-register.mp3');
          audio.volume = 0.4;
          break;
        case 'reject':
          audio = new Audio('/SFX/error-buzz.mp3');
          audio.volume = 0.5;
          break;
        case 'customer_approach':
          audio = new Audio('/SFX/customer-approach.mp3');
          audio.volume = 0.3;
          break;
        case 'keypad_click':
          audio = new Audio('/SFX/keypad-click.mp3');
          audio.volume = 0.3;
          break;
        default:
          // Fallback to dot-matrix-printer for any other sounds
          audio = new Audio('/SFX/dot-matrix-printer.mp3');
          audio.volume = 0.3;
          break;
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
    
    // Show interstitial ad every 5 customers served
    setCustomersServed(prev => {
      const newCount = prev + 1;
      if (newCount % 5 === 0) {
        showInterstitialAd();
      }
      return newCount;
    });
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
      
    } else if (cmd === 'LOOKUP') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      // Show keypad for account number entry
      setKeypadMode('lookup');
      setKeypadInput('');
      setShowKeypad(true);
      
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        "BANK COMPUTER SYSTEM ACCESS",
        "========================================",
        "ENTER ACCOUNT NUMBER TO LOOKUP:",
        `Customer provided: ${currentCustomer.transaction.accountNumber}`,
        "========================================",
        ""
      ]);
      
    } else if (cmd.startsWith('LOOKUP ')) {
      const accountNumber = cmd.substring(7).trim();
      
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      // Simulate 1980s computer system lookup with ASMR typing sounds
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        `SEARCHING ACCOUNT: ${accountNumber}`,
        "ACCESSING BANK DATABASE...",
        "VALIDATING ACCOUNT NUMBER...",
        ""
      ]);
      
      // Play typing sounds during lookup simulation
      setTimeout(() => playSound('typing'), 200);
      setTimeout(() => playSound('typing'), 500);
      setTimeout(() => playSound('typing'), 800);
      setTimeout(() => playSound('typing'), 1100);
      
      // Simulate database access delay with authentic terminal output
      setTimeout(() => {
        if (accountNumber === currentCustomer.transaction.accountNumber) {
          // Correct account number entered
          const balance = Math.floor(Math.random() * 50000) + 1000;
          setAccountBalance(balance);
          setVerificationState(prev => ({ ...prev, accountLookedUp: true }));
          
          setTerminalOutput(prev => [...prev,
            "ACCOUNT FOUND",
            "==========================",
            "BANK RECORD",
            "==========================",
            `ACCT: ${accountNumber}`,
            `NAME: ${currentCustomer.name}`,
            `BAL: $${balance.toLocaleString()}`,
            `STATUS: ACTIVE`,
            `TYPE: CHECKING`,
            `SSN: XXX-XX-${Math.floor(Math.random() * 9000) + 1000}`,
            "==========================",
            "",
            "RECORD OK - CHECK DOCS",
            "Use VERIFY for signature",
            ""
          ]);
          
          playSound('cash'); // Success sound
        } else {
          // Wrong account number or account not found
          setTerminalOutput(prev => [...prev,
            "ACCOUNT LOOKUP FAILED",
            "========================================",
            `SEARCHED ACCOUNT: ${accountNumber}`,
            `EXPECTED ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
            "",
            "POSSIBLE CAUSES:",
            "• Account number mismatch",
            "• Fraudulent documentation",
            "• Customer error",
            "• Account closed or suspended",
            "========================================",
            "",
            "VERIFY ACCOUNT NUMBER WITH CUSTOMER",
            ""
          ]);
          
          playSound('reject'); // Error sound
        }
      }, 1800);
      
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
      
    } else if (cmd === 'VERIFY' || cmd === 'SIGNATURE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Must lookup account first (use LOOKUP command)"]);
        return;
      }
      
      // VERIFY shows all bank records vs customer documents for manual comparison
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        "BANK VERIFICATION SYSTEM",
        "========================================",
        "Retrieving complete bank records...",
        "Compare ALL details manually",
        "",
        "ACCESSING BANK DATABASE...",
        "LOADING CUSTOMER PROFILE...",
        ""
      ]);
      
      // Play typing sounds during verification
      setTimeout(() => playSound('typing'), 300);
      setTimeout(() => playSound('typing'), 600);
      setTimeout(() => playSound('typing'), 900);
      
      // Show complete bank records vs customer documents for manual comparison
      setTimeout(() => {
        setVerificationState(prev => ({ ...prev, signatureCompared: true }));
        
        // Generate bank signature on file (clean name)
        const bankSignatureOnFile = generateLegitimateSignature(currentCustomer.name);
        
        setTerminalOutput(prev => [...prev,
          "BANK RECORDS VS CUSTOMER DOCUMENTS",
          "==========================================",
          "",
          "BANK RECORDS ON FILE:",
          "-------------------",
          `NAME: ${currentCustomer.name}`,
          `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
          `SIGNATURE: "${bankSignatureOnFile}"`,
          `ADDRESS: [Bank records confidential]`,
          `DOB: [Bank records confidential]`,
          "",
          "CUSTOMER PROVIDED DOCUMENTS:",
          "----------------------------",
          "• Check ID card name vs bank name",
          "• Check account numbers match",  
          "• Check signature styles match",
          "• Look for inconsistencies",
          "",
          "YOU MUST MANUALLY COMPARE",
          "No automatic fraud detection",
          "==========================================",
          "",
          "EXAMINE DOCUMENTS CAREFULLY",
          "Then use APPROVE or REJECT",
          ""
        ]);
        
        playSound('cash');
      }, 1800);
      
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

  // Smart autocomplete for mobile
  const handleInputChange = (value: string) => {
    setTerminalInput(value);
    
    // Auto-complete single letter commands
    const lowercaseValue = value.toLowerCase();
    if (value.length === 1) {
      switch (lowercaseValue) {
        case 'd':
          setTerminalInput('deposit');
          break;
        case 'w':
          setTerminalInput('withdraw');
          break;
        case 'l':
          setTerminalInput('lookup');
          break;
        case 'v':
          setTerminalInput('verify');
          break;
        case 'a':
          setTerminalInput('approve');
          break;
        case 'r':
          setTerminalInput('reject');
          break;
      }
    }
  };

  // Quick command buttons for mobile
  const executeQuickCommand = (command: string) => {
    playSound('typing');
    processCommand(command);
    setTerminalInput('');
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
          border: doc.isValid ? '4px solid #ffff00' : '5px solid #ff4444',
          borderRadius: '15px',
          padding: '25px',
          margin: '0px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '18px',
          fontFamily: 'monospace',
          minHeight: '250px',
          width: '100%',
          position: 'relative',
          boxShadow: doc.isValid ? '0 0 20px rgba(255, 255, 0, 0.7)' : '0 0 25px rgba(255, 68, 68, 0.8)',
          transform: 'scale(1)',
          transition: 'transform 0.2s'
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
        
        <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '18px', color: '#ffff00' }}>
          {doc.type.toUpperCase()} #{index + 1}
        </div>
        
        {doc.type === 'id' && (
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ fontSize: '15px', marginBottom: '6px' }}>NAME: {doc.data.name}</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>DOB: {doc.data.dateOfBirth}</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>ADDRESS: {doc.data.address}</div>
            <div style={{ fontSize: '14px' }}>ID#: {doc.data.idNumber}</div>
          </div>
        )}
        
        {doc.type === 'bank_book' && (
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ fontSize: '15px', marginBottom: '6px' }}>ACCOUNT: {doc.data.accountNumber}</div>
            <div style={{ fontSize: '15px', marginBottom: '6px' }}>NAME: {doc.data.name}</div>
            <div style={{ fontSize: '15px', color: '#00ff00' }}>BALANCE: ${doc.data.balance?.toLocaleString()}</div>
          </div>
        )}
        
        {doc.type === 'slip' && (
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ fontSize: '15px', marginBottom: '6px' }}>ACCOUNT: {doc.data.accountNumber}</div>
            <div style={{ fontSize: '15px', marginBottom: '6px', color: '#00ff00' }}>AMOUNT: ${doc.data.amount?.toLocaleString()}</div>
            <div style={{ fontSize: '14px' }}>TYPE: {doc.data.type?.toUpperCase()}</div>
          </div>
        )}
        
        {doc.type === 'signature' && (
          <div>
            <div style={{ fontSize: '15px', marginBottom: '8px' }}>SIGNATURE CARD</div>
            <div style={{ 
              border: '2px solid #666', 
              margin: '8px 0', 
              padding: '12px',
              background: '#f9f9f9',
              color: '#333',
              fontFamily: 'cursive',
              fontSize: '18px',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              {doc.data.name}
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
      height: '100vh',
      minHeight: '100vh',
      maxHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: '#00ff00',
      fontFamily: 'monospace',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      width: '100vw'
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
          padding: '3px',
          gap: '3px',
          overflow: 'hidden',
          minHeight: '100vh',
          maxHeight: '100vh'
        }}>
          {/* Terminal Section */}
          <div style={{
            width: '100%',
            height: '40vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            {/* Terminal Output */}
            <div style={{
              background: '#000000',
              border: '1px solid #00ff00',
              borderRadius: '4px',
              padding: '4px',
              height: '28vh',
              overflowY: 'auto',
              fontSize: '10px',
              fontFamily: 'monospace',
              lineHeight: '1.1',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              {terminalOutput.map((line, index) => (
                <div key={index} style={{ 
                  marginBottom: '1px',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  hyphens: 'auto'
                }}>
                  {line}
                </div>
              ))}
            </div>

            {/* Mobile Command Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '3px'
            }}>
              <button
                onClick={() => executeQuickCommand('lookup')}
                style={{
                  background: '#0066ff',
                  color: '#ffffff',
                  border: '1px solid #0088ff',
                  padding: '8px 4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                LOOKUP
              </button>
              <button
                onClick={() => executeQuickCommand('verify')}
                style={{
                  background: '#ff6600',
                  color: '#ffffff',
                  border: '1px solid #ff8800',
                  padding: '8px 4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                VERIFY
              </button>
              <button
                onClick={() => executeQuickCommand('approve')}
                style={{
                  background: '#00cc00',
                  color: '#ffffff',
                  border: '1px solid #00ff00',
                  padding: '8px 4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                APPROVE
              </button>
              <button
                onClick={() => executeQuickCommand('reject')}
                style={{
                  background: '#cc0000',
                  color: '#ffffff',
                  border: '1px solid #ff0000',
                  padding: '8px 4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                REJECT
              </button>
            </div>

            {/* Terminal Input */}
            <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '3px' }}>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="L=lookup, A=approve, R=reject"
                style={{
                  flex: '1',
                  background: '#000000',
                  border: '1px solid #00ff00',
                  color: '#00ff00',
                  padding: '6px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  borderRadius: '3px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#00ff00',
                  color: '#000000',
                  border: 'none',
                  padding: '6px 10px',
                  fontSize: '10px',
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

            {/* Score Display - Compact */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid #ffff00',
              borderRadius: '3px',
              padding: '4px',
              fontSize: '9px',
              lineHeight: '1.1'
            }}>
              <div>SCORE: {gameScore.score}</div>
              <div>TRANS: {gameScore.correctTransactions} | ERR: {gameScore.errors}</div>
              <div>FRAUD: {gameScore.fraudulentApprovals}/2 | DISMISS: {gameScore.customersCalledWithoutService}/4</div>
            </div>
          </div>

          {/* Documents Section */}
          <div style={{
            width: '100%',
            height: '60vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            overflow: 'auto'
          }}>
            {/* Customer Display - Larger */}
            {currentCustomer && (
              <div style={{
                background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: '2px solid #ffff00',
                borderRadius: '6px',
                padding: '10px',
                textAlign: 'center',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  CUSTOMER: {currentCustomer.name}
                </div>
                <div style={{ marginBottom: '2px' }}>
                  {currentCustomer.transaction.type.toUpperCase()} | ${currentCustomer.transaction.amount}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  ACCOUNT: {currentCustomer.transaction.accountNumber}
                </div>
              </div>
            )}

            {/* Account Information - Compact */}
            {verificationState.accountLookedUp && (
              <div style={{
                background: 'linear-gradient(145deg, #1a2a1a, #0a1a0a)',
                border: '1px solid #00ff00',
                borderRadius: '4px',
                padding: '6px',
                fontSize: '11px'
              }}>
                <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '2px' }}>
                  BANK RECORDS
                </div>
                <div>ACTIVE | BALANCE: ${accountBalance.toLocaleString()} | HOLDER: {currentCustomer?.name}</div>
              </div>
            )}

            {/* Documents - Expanded for Visibility */}
            {currentCustomer && (
              <div style={{
                background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: '2px solid #ffff00',
                borderRadius: '8px',
                padding: '15px',
                minHeight: '40vh',
                maxHeight: '60vh',
                overflow: 'auto',
                flex: 1
              }}>
                <div style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#ffff00' }}>
                  CUSTOMER DOCUMENTS - EXAMINE CAREFULLY
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px',
                  width: '100%'
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
      
      {/* AdMob Banner Removed - Using Interstitials Every 5 Transactions Only */}

      {/* Popup Keypad for Account Number Entry */}
      {showKeypad && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKeypad(false);
              setKeypadInput('');
            }
          }}
        >
          {/* Customer Account Number Display */}
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
            border: '2px solid #ffff00',
            borderRadius: '8px',
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffff00',
            textAlign: 'center',
            minWidth: '250px'
          }}>
            CUSTOMER ACCOUNT: {currentCustomer?.transaction.accountNumber}
          </div>

          <div style={{
            background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
            border: '2px solid #00ff00',
            borderRadius: '10px',
            padding: '20px',
            width: '300px',
            maxWidth: '90vw',
            marginTop: '80px'
          }}>
            <div style={{
              color: '#00ff00',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {keypadMode === 'lookup' ? 'ENTER ACCOUNT NUMBER' : 'VERIFY ACCOUNT'}
            </div>
            
            {/* Display */}
            <div style={{
              background: '#000000',
              border: '1px solid #00ff00',
              borderRadius: '5px',
              padding: '10px',
              marginBottom: '15px',
              fontSize: '18px',
              fontFamily: 'monospace',
              color: '#00ff00',
              textAlign: 'center',
              minHeight: '30px'
            }}>
              {keypadInput || 'Enter account number...'}
            </div>

            {/* Keypad Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '15px'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    // Use authentic ASMR typing sounds
                    if (key === '✓') {
                      playSound('cash'); // Success sound for submit
                    } else if (key === '⌫') {
                      playSound('reject'); // Error sound for backspace
                    } else {
                      playSound('typing'); // Typing sound for numbers
                    }
                    
                    if (key === '⌫') {
                      setKeypadInput(prev => prev.slice(0, -1));
                    } else if (key === '✓') {
                      if (keypadInput.trim()) {
                        processCommand(`LOOKUP ${keypadInput.trim()}`);
                        setShowKeypad(false);
                        setKeypadInput('');
                      }
                    } else if (keypadInput.length < 10) {
                      setKeypadInput(prev => prev + key);
                    }
                  }}
                  style={{
                    background: key === '✓' ? '#00aa00' : key === '⌫' ? '#aa0000' : '#333333',
                    border: '2px solid #00ff00',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    padding: '18px',
                    cursor: 'pointer',
                    minHeight: '60px',
                    transition: 'all 0.1s',
                    userSelect: 'none'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.background = key === '✓' ? '#00cc00' : key === '⌫' ? '#cc0000' : '#555555';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = key === '✓' ? '#00aa00' : key === '⌫' ? '#aa0000' : '#333333';
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                setShowKeypad(false);
                setKeypadInput('');
              }}
              style={{
                background: '#aa0000',
                border: '1px solid #ff0000',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                padding: '10px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;