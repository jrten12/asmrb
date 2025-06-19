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
  const [viewedDocument, setViewedDocument] = useState<GameDocument | null>(null);
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
  
  // Document popup state
  const [popupDocument, setPopupDocument] = useState<GameDocument | null>(null);
  const [showDocumentPopup, setShowDocumentPopup] = useState(false);

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

  // Initialize audio context on first user interaction
  const initializeAudio = () => {
    if (!window.gameAudioContext) {
      try {
        window.gameAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('Audio context initialized');
      } catch (e) {
        console.log('Audio context creation failed:', e);
      }
    }
  };

  // Working Web Audio API for authentic 1980s sounds
  const playSound = (soundType: string) => {
    if (musicMuted) return;
    
    try {
      // Create new audio context each time for better compatibility
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Force resume context
      audioContext.resume().then(() => {
        createSound(audioContext, soundType);
      }).catch(() => {
        createSound(audioContext, soundType);
      });
    } catch (e) {
      console.log("Audio context error:", e);
    }
  };

  const createSound = (audioContext: AudioContext, soundType: string) => {
    try {
      switch (soundType) {
        case 'typing':
          // Authentic mechanical keyboard ASMR click
          const typingOsc = audioContext.createOscillator();
          const typingGain = audioContext.createGain();
          const typingFilter = audioContext.createBiquadFilter();
          typingOsc.connect(typingFilter);
          typingFilter.connect(typingGain);
          typingGain.connect(audioContext.destination);
          typingOsc.frequency.setValueAtTime(900, audioContext.currentTime);
          typingFilter.frequency.setValueAtTime(1200, audioContext.currentTime);
          typingFilter.type = 'bandpass';
          typingGain.gain.setValueAtTime(0.4, audioContext.currentTime);
          typingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
          typingOsc.start();
          typingOsc.stop(audioContext.currentTime + 0.08);
          break;
          
        case 'cash':
          // Cash register ka-ching with bell resonance
          const cashOsc1 = audioContext.createOscillator();
          const cashOsc2 = audioContext.createOscillator();
          const cashGain = audioContext.createGain();
          cashOsc1.connect(cashGain);
          cashOsc2.connect(cashGain);
          cashGain.connect(audioContext.destination);
          cashOsc1.frequency.setValueAtTime(1200, audioContext.currentTime);
          cashOsc2.frequency.setValueAtTime(800, audioContext.currentTime);
          cashOsc1.frequency.setValueAtTime(900, audioContext.currentTime + 0.1);
          cashGain.gain.setValueAtTime(0.6, audioContext.currentTime);
          cashGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
          cashOsc1.start();
          cashOsc2.start();
          cashOsc1.stop(audioContext.currentTime + 0.4);
          cashOsc2.stop(audioContext.currentTime + 0.4);
          break;
          
        case 'reject':
          // Error buzz with harsh sawtooth
          const rejectOsc = audioContext.createOscillator();
          const rejectGain = audioContext.createGain();
          const rejectFilter = audioContext.createBiquadFilter();
          rejectOsc.connect(rejectFilter);
          rejectFilter.connect(rejectGain);
          rejectGain.connect(audioContext.destination);
          rejectOsc.frequency.setValueAtTime(180, audioContext.currentTime);
          rejectOsc.type = 'sawtooth';
          rejectFilter.frequency.setValueAtTime(400, audioContext.currentTime);
          rejectFilter.type = 'lowpass';
          rejectGain.gain.setValueAtTime(0.5, audioContext.currentTime);
          rejectGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
          rejectOsc.start();
          rejectOsc.stop(audioContext.currentTime + 0.6);
          break;
          
        case 'keypad_click':
          // High-pitched keypad beep
          const keypadOsc = audioContext.createOscillator();
          const keypadGain = audioContext.createGain();
          keypadOsc.connect(keypadGain);
          keypadGain.connect(audioContext.destination);
          keypadOsc.frequency.setValueAtTime(1000, audioContext.currentTime);
          keypadGain.gain.setValueAtTime(0.25, audioContext.currentTime);
          keypadGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
          keypadOsc.start();
          keypadOsc.stop(audioContext.currentTime + 0.12);
          break;
          
        case 'paper_shuffle':
          // Paper document shuffling sound
          const paperOsc = audioContext.createOscillator();
          const paperGain = audioContext.createGain();
          const paperFilter = audioContext.createBiquadFilter();
          paperOsc.connect(paperFilter);
          paperFilter.connect(paperGain);
          paperGain.connect(audioContext.destination);
          paperOsc.frequency.setValueAtTime(2000, audioContext.currentTime);
          paperOsc.type = 'square';
          paperFilter.frequency.setValueAtTime(3000, audioContext.currentTime);
          paperFilter.type = 'highpass';
          paperGain.gain.setValueAtTime(0.15, audioContext.currentTime);
          paperGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
          paperOsc.start();
          paperOsc.stop(audioContext.currentTime + 0.2);
          break;
          
        case 'stamp':
          // Rubber stamp thunk
          const stampOsc = audioContext.createOscillator();
          const stampGain = audioContext.createGain();
          const stampFilter = audioContext.createBiquadFilter();
          stampOsc.connect(stampFilter);
          stampFilter.connect(stampGain);
          stampGain.connect(audioContext.destination);
          stampOsc.frequency.setValueAtTime(120, audioContext.currentTime);
          stampOsc.type = 'square';
          stampFilter.frequency.setValueAtTime(300, audioContext.currentTime);
          stampFilter.type = 'lowpass';
          stampGain.gain.setValueAtTime(0.4, audioContext.currentTime);
          stampGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
          stampOsc.start();
          stampOsc.stop(audioContext.currentTime + 0.3);
          break;
          
        case 'drawer':
          // Cash drawer opening sound
          const drawerOsc = audioContext.createOscillator();
          const drawerGain = audioContext.createGain();
          drawerOsc.connect(drawerGain);
          drawerGain.connect(audioContext.destination);
          drawerOsc.frequency.setValueAtTime(80, audioContext.currentTime);
          drawerOsc.frequency.setValueAtTime(120, audioContext.currentTime + 0.2);
          drawerOsc.type = 'square';
          drawerGain.gain.setValueAtTime(0.3, audioContext.currentTime);
          drawerGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
          drawerOsc.start();
          drawerOsc.stop(audioContext.currentTime + 0.5);
          break;
      }
    } catch (e) {
      console.log("Sound creation error:", e);
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

  // Helper functions for generating bank records
  const generateAddress = () => {
    const streets = ['Oak Street', 'Pine Avenue', 'Maple Drive', 'Cedar Lane', 'Elm Road', 'Birch Way'];
    const cities = ['Springfield', 'Riverside', 'Franklin', 'Georgetown', 'Madison', 'Arlington'];
    const states = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA'];
    const streetNum = Math.floor(Math.random() * 9999) + 1;
    const street = streets[Math.floor(Math.random() * streets.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const zip = Math.floor(Math.random() * 90000) + 10000;
    return `${streetNum} ${street}, ${city}, ${state} ${zip}`;
  };

  const generateDateOfBirth = () => {
    const year = Math.floor(Math.random() * 50) + 1940; // 1940-1989
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
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
          
          // Generate bank record data for comparison with customer documents
          const customerIdDoc = currentCustomer.documents.find(d => d.type === 'id');
          const customerSigDoc = currentCustomer.documents.find(d => d.type === 'signature');
          
          // Create realistic fraud scenarios - 50% of customers have mismatched bank records
          const shouldHaveFraud = Math.random() < 0.5;
          
          let bankName = currentCustomer.name;
          let bankAddress: string, bankDOB: string, bankDLNumber: string, bankIDNumber: string, bankSignature: string;
          
          if (shouldHaveFraud) {
            // Create specific fraud types with mismatched data
            const fraudType = Math.floor(Math.random() * 4);
            
            switch (fraudType) {
              case 0: // Address mismatch
                bankAddress = "789 Oak Street, Springfield, CA 90210";
                bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                break;
              case 1: // Date of birth mismatch  
                bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                bankDOB = "12/03/1982";
                bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                break;
              case 2: // License number mismatch
                bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                bankDLNumber = "DL-XYZ789CD";
                bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                break;
              case 3: // Signature mismatch
                bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                bankSignature = `BANK_OFFICIAL_SIG_${bankName.replace(/\s+/g, '_').toUpperCase()}_DIFFERENT_STYLE`;
                break;
            }
            
            // Mark customer as fraudulent for later processing
            currentCustomer.isFraudulent = true;
          } else {
            // Legitimate customer - all data matches documents
            bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
            bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
            bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
            bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
            bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
            currentCustomer.isFraudulent = false;
          }
          
          setTerminalOutput(prev => [...prev,
            "ACCOUNT FOUND",
            "==========================",
            "BANK COMPUTER SYSTEM",
            "==========================",
            `Account Number: ${accountNumber}`,
            `Account Status: ACTIVE`,
            `Balance: $${balance.toLocaleString()}`,
            `Account Type: CHECKING`,
            "",
            "ACCOUNT HOLDER INFORMATION:",
            "===========================",
            `Full Name: ${bankName}`,
            `Date of Birth: ${bankDOB}`,
            `Address: ${bankAddress}`,
            `ID Number: ${bankIDNumber}`,
            `License Number: ${bankDLNumber}`,
            "",
            "SIGNATURE ON FILE:",
            "==================",
            `${bankSignature}`,
            "",
            "Last Transaction: 3 days ago",
            "Account opened: 08/15/1985",
            "",
            "Compare above info with customer documents",
            "Use VERIFY to cross-reference all details",
            "============================"
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
        
        // Generate complete bank records (clean/correct data)
        const bankSignatureOnFile = generateLegitimateSignature(currentCustomer.name);
        
        // Get actual customer document data to show mismatches
        const customerIdDoc = currentCustomer.documents.find(d => d.type === 'id');
        const customerSlipDoc = currentCustomer.documents.find(d => d.type === 'slip');
        const customerBankDoc = currentCustomer.documents.find(d => d.type === 'bank_book');
        const customerSigDoc = currentCustomer.documents.find(d => d.type === 'signature');
        
        // Bank records (what should be correct) - generate real comparison data
        const bankName = currentCustomer.name;
        const bankAccount = currentCustomer.transaction.accountNumber;
        
        // Create realistic fraud scenarios - 50% of customers have document mismatches
        const shouldHaveFraud = Math.random() < 0.5;
        
        // Store fraud status for transaction processing
        const isFraudulent = shouldHaveFraud;
        
        // Mark customer as fraudulent in the customer object
        if (isFraudulent) {
          currentCustomer.isFraudulent = true;
          // Mark specific documents as invalid
          const fraudType = Math.floor(Math.random() * 4);
          switch (fraudType) {
            case 0:
            case 1:
            case 2:
              // Mark ID card as invalid for address/DOB/license mismatches
              const idDoc = currentCustomer.documents.find(d => d.type === 'id');
              if (idDoc) idDoc.isValid = false;
              break;
            case 3:
              // Mark signature as invalid for signature mismatch
              const sigDoc = currentCustomer.documents.find(d => d.type === 'signature');
              if (sigDoc) sigDoc.isValid = false;
              break;
          }
        }
        
        let bankAddress: string, bankDOB: string, bankDLNumber: string, bankIDNumber: string, bankSignature: string;
        let fraudDescription = "";
        
        if (shouldHaveFraud) {
          // Create specific fraud types with mismatched data
          const fraudType = Math.floor(Math.random() * 4);
          
          switch (fraudType) {
            case 0: // Address mismatch
              bankAddress = "789 Oak Street, Springfield, CA 90210";
              bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
              bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
              bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
              bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
              fraudDescription = "ADDRESS MISMATCH DETECTED";
              break;
            case 1: // Date of birth mismatch  
              bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
              bankDOB = "12/03/1982";
              bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
              bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
              bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
              fraudDescription = "DATE OF BIRTH MISMATCH DETECTED";
              break;
            case 2: // License number mismatch
              bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
              bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
              bankDLNumber = "DL-XYZ789CD";
              bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
              bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
              fraudDescription = "LICENSE NUMBER MISMATCH DETECTED";
              break;
            case 3: // Signature mismatch
              bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
              bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
              bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
              bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
              bankSignature = `BANK_OFFICIAL_SIG_${bankName.replace(/\s+/g, '_').toUpperCase()}_DIFFERENT_STYLE`;
              fraudDescription = "SIGNATURE MISMATCH DETECTED";
              break;
          }
        } else {
          // Legitimate customer - all data matches
          bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
          bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
          bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
          bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
          bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
          fraudDescription = "ALL DOCUMENTS VERIFIED - LEGITIMATE";
        }
        
        setTerminalOutput(prev => [...prev,
          "BANK VERIFICATION SYSTEM",
          "==========================================",
          "",
          "SIGNATURE COMPARISON:",
          "--------------------",
          `BANK: ${bankSignature}`,
          `CUST: ${customerSigDoc?.data.signature || 'NO SIGNATURE'}`,
          "",
          "IDENTITY VERIFICATION:",
          "----------------------",
          `NAME: ${bankName} | ${customerIdDoc?.data.name || 'N/A'}`,
          `DOB:  ${bankDOB} | ${customerIdDoc?.data.dateOfBirth || 'N/A'}`,
          `DL#:  ${bankDLNumber} | ${customerIdDoc?.data.licenseNumber || 'N/A'}`,
          `ID#:  ${bankIDNumber} | ${customerIdDoc?.data.idNumber || 'N/A'}`,
          "",
          "ADDRESS VERIFICATION:",
          "---------------------",
          `BANK: ${bankAddress}`,
          `ID:   ${customerIdDoc?.data.address || 'N/A'}`,
          "",
          "ACCOUNT VERIFICATION:",
          "---------------------",
          `BANK: ${bankAccount}`,
          `SLIP: ${customerSlipDoc?.data.accountNumber || 'N/A'}`,
          `BOOK: ${customerBankDoc?.data.accountNumber || 'N/A'}`,
          `ID:   ${customerIdDoc?.data.accountNumber || 'N/A'}`,
          "",
          `STATUS: ${fraudDescription}`,
          "",
          shouldHaveFraud ? 
            "⚠️  DOCUMENTS DO NOT MATCH - REVIEW REQUIRED" : 
            "✓ ALL DOCUMENTS VERIFIED",
          "",
          "Use APPROVE or REJECT to process transaction",
          "==========================================",
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
        onClick={() => {
          playSound('paper_shuffle');
          setPopupDocument(doc);
          setShowDocumentPopup(true);
        }}
        style={{
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          border: '4px solid #ffff00',
          borderRadius: '15px',
          padding: '25px',
          margin: '0px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '18px',
          fontFamily: 'monospace',
          minHeight: '140px',
          height: '140px',
          width: '100%',
          position: 'relative',
          boxShadow: '0 0 25px rgba(255, 255, 0, 0.8)',
          transform: 'scale(1)',
          transition: 'transform 0.2s',
          display: 'flex',
          flexDirection: 'column'
        }}
      >

        
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
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      color: '#212529',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
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
          background: musicMuted ? '#6c757d' : '#0d6efd',
          color: '#ffffff',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              background: '#ffffff',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '12px',
              height: '28vh',
              overflowY: 'auto',
              fontSize: '12px',
              fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
              lineHeight: '1.4',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              color: '#212529',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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

          {/* Documents Section - LARGE AND VISIBLE */}
          <div style={{
            width: '100%',
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflow: 'auto',
            minHeight: '500px'
          }}>
            {/* Customer Display - Larger */}
            {currentCustomer && (
              <div style={{
                background: '#ffffff',
                border: '2px solid #007bff',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#007bff' }}>
                  CUSTOMER: {currentCustomer.name}
                </div>
                <div style={{ marginBottom: '4px', color: '#212529' }}>
                  {currentCustomer.transaction.type.toUpperCase()} | ${currentCustomer.transaction.amount}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  ACCOUNT: {currentCustomer.transaction.accountNumber}
                </div>
              </div>
            )}

            {/* Account Information - Modern */}
            {verificationState.accountLookedUp && (
              <div style={{
                background: '#e8f5e8',
                border: '2px solid #198754',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ color: '#198754', fontWeight: 'bold', marginBottom: '6px' }}>
                  🏦 BANK COMPUTER RECORDS
                </div>
                <div style={{ color: '#212529' }}>
                  <strong>Status:</strong> ACTIVE | <strong>Balance:</strong> ${accountBalance.toLocaleString()}
                  <br/>
                  <strong>Account Holder:</strong> {currentCustomer?.name}
                </div>
              </div>
            )}

            {/* Documents - CLEAN AND ORGANIZED */}
            {currentCustomer && (
              <div style={{
                background: '#ffffff',
                border: '2px solid #dee2e6',
                borderRadius: '12px',
                padding: '16px',
                height: '38vh',
                overflow: 'auto',
                flex: 'none',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>
                  📄 CUSTOMER DOCUMENTS
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  width: '100%'
                }}>
                  {currentCustomer.documents.map((doc, index) => (
                    <div key={doc.id} 
                         onClick={() => {
                           playSound('paper_shuffle');
                           setPopupDocument(doc);
                           setShowDocumentPopup(true);
                         }}
                         style={{
                      background: '#f8f9fa',
                      border: '2px solid #007bff',
                      borderRadius: '8px',
                      padding: '12px',
                      height: '140px',
                      overflow: 'hidden',
                      fontSize: '11px',
                      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                      color: '#212529',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {doc.type.toUpperCase().replace('_', ' ')} DOCUMENT
                      </div>
                      <div style={{ fontSize: '8px', opacity: 0.8 }}>
                        Click to examine in detail
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '7px' }}>
                        {doc.type === 'id' && `ID: ${doc.data.name}`}
                        {doc.type === 'slip' && `SLIP: $${doc.data.amount}`}
                        {doc.type === 'bank_book' && `BOOK: ${doc.data.accountNumber}`}
                        {doc.type === 'signature' && `SIG: ${doc.data.name}`}
                      </div>
                    </div>
                  ))}
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
                setViewedDocument(null);
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

      {/* Small Document Popup Viewer */}
      {showDocumentPopup && popupDocument && (
        <div style={{
          position: 'fixed',
          top: '10%',
          right: '10px',
          width: '320px',
          height: '400px',
          background: '#ffffff',
          border: '2px solid #dee2e6',
          borderRadius: '12px',
          padding: '20px',
          color: '#212529',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          fontSize: '12px',
          zIndex: 1500,
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          overflow: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid #ffff00',
            paddingBottom: '6px'
          }}>
            <div style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '11px' }}>
              {popupDocument.type.toUpperCase().replace('_', ' ')}
            </div>
            <div 
              onClick={() => {
                playSound('paper_shuffle');
                setShowDocumentPopup(false);
                setPopupDocument(null);
              }}
              style={{
                cursor: 'pointer',
                color: '#ffff00',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
              ×
            </div>
          </div>
          
          {popupDocument.type === 'id' && (
            <div style={{ lineHeight: '1.3' }}>
              <div><strong>NAME:</strong> {popupDocument.data.name}</div>
              <div><strong>DOB:</strong> {popupDocument.data.dateOfBirth}</div>
              <div><strong>ADDRESS:</strong> {popupDocument.data.address}</div>
              <div><strong>ID#:</strong> {popupDocument.data.idNumber}</div>
              <div><strong>LICENSE:</strong> {popupDocument.data.licenseNumber}</div>
              <div><strong>ACCOUNT:</strong> {popupDocument.data.accountNumber}</div>
            </div>
          )}
          
          {popupDocument.type === 'slip' && (
            <div style={{ lineHeight: '1.3' }}>
              <div><strong>CUSTOMER:</strong> {popupDocument.data.name}</div>
              <div><strong>TYPE:</strong> {popupDocument.data.type?.toUpperCase()}</div>
              <div><strong>AMOUNT:</strong> ${popupDocument.data.amount}</div>
              <div><strong>ACCOUNT:</strong> {popupDocument.data.accountNumber}</div>
              {popupDocument.data.targetAccount && (
                <div><strong>TARGET:</strong> {popupDocument.data.targetAccount}</div>
              )}
            </div>
          )}
          
          {popupDocument.type === 'bank_book' && (
            <div style={{ lineHeight: '1.3' }}>
              <div><strong>HOLDER:</strong> {popupDocument.data.name}</div>
              <div><strong>ACCOUNT:</strong> {popupDocument.data.accountNumber}</div>
              <div><strong>BALANCE:</strong> ${popupDocument.data.balance}</div>
              <div><strong>AMOUNT:</strong> ${popupDocument.data.amount}</div>
            </div>
          )}
          
          {popupDocument.type === 'signature' && (
            <div style={{ lineHeight: '1.5' }}>
              <div><strong>NAME:</strong> {popupDocument.data.name}</div>
              <div style={{ 
                marginTop: '15px',
                padding: '20px',
                background: '#f8f9fa',
                border: '2px solid #007bff',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <strong style={{ color: '#007bff' }}>SIGNATURE:</strong><br/>
                <div style={{
                  fontSize: '20px',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: '#2d3436',
                  marginTop: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  fontStyle: 'italic'
                }}>
                  {popupDocument.data.signature?.split('|')[0] || 'NO SIGNATURE'}
                </div>
              </div>
            </div>
          )}
          
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: '#e7f3ff',
            border: '1px solid #007bff',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#0056b3',
            textAlign: 'center'
          }}>
            💡 Compare with bank computer records
          </div>
          
          <button
            onClick={() => {
              playSound('paper_shuffle');
              playSound('typing');
              if (!currentCustomer) {
                playSound('reject');
                setTerminalOutput(prev => [...prev, "ERROR: No customer present"]);
                return;
              }
              // VERIFY command implementation
              if (!verificationState.accountLookedUp) {
                playSound('reject');
                setTerminalOutput(prev => [...prev, "ERROR: Must lookup account first (use LOOKUP command)"]);
                return;
              }
              
              const customerIdDoc = currentCustomer.documents.find(d => d.type === 'id');
              const customerSigDoc = currentCustomer.documents.find(d => d.type === 'signature');
              const customerSlipDoc = currentCustomer.documents.find(d => d.type === 'slip');
              const customerBankDoc = currentCustomer.documents.find(d => d.type === 'bank_book');
              
              const bankName = currentCustomer.name;
              const bankAccount = currentCustomer.transaction.accountNumber;
              
              // Create realistic fraud scenarios - 50% of customers have document mismatches
              const shouldHaveFraud = Math.random() < 0.5;
              
              let bankAddress: string, bankDOB: string, bankDLNumber: string, bankIDNumber: string, bankSignature: string;
              let fraudDescription = "";
              
              if (shouldHaveFraud) {
                // Create specific fraud types with mismatched data
                const fraudType = Math.floor(Math.random() * 4);
                
                switch (fraudType) {
                  case 0: // Address mismatch
                    bankAddress = "789 Oak Street, Springfield, CA 90210";
                    bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                    bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                    bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                    bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                    fraudDescription = "ADDRESS MISMATCH DETECTED";
                    break;
                  case 1: // Date of birth mismatch  
                    bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                    bankDOB = "12/03/1982";
                    bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                    bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                    bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                    fraudDescription = "DATE OF BIRTH MISMATCH DETECTED";
                    break;
                  case 2: // License number mismatch
                    bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                    bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                    bankDLNumber = "DL-XYZ789CD";
                    bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                    bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                    fraudDescription = "LICENSE NUMBER MISMATCH DETECTED";
                    break;
                  case 3: // Signature mismatch
                    bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                    bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                    bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                    bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                    bankSignature = `BANK_OFFICIAL_SIG_${bankName.replace(/\s+/g, '_').toUpperCase()}_DIFFERENT_STYLE`;
                    fraudDescription = "SIGNATURE MISMATCH DETECTED";
                    break;
                }
                
                // Mark customer as fraudulent
                currentCustomer.isFraudulent = true;
                const fraudDoc = currentCustomer.documents.find(d => d.type === (fraudType === 3 ? 'signature' : 'id'));
                if (fraudDoc) fraudDoc.isValid = false;
              } else {
                // Legitimate customer - all data matches
                bankAddress = customerIdDoc?.data.address || "1234 Main Street, Springfield, CA 90210";
                bankDOB = customerIdDoc?.data.dateOfBirth || "05/15/1975";
                bankDLNumber = customerIdDoc?.data.licenseNumber || "DL-ABC123XY";
                bankIDNumber = customerIdDoc?.data.idNumber || "ID987654321";
                bankSignature = customerSigDoc?.data.signature || `${bankName.split(' ').map(n => n[0]).join('')}_clean_signature`;
                fraudDescription = "ALL DOCUMENTS VERIFIED - LEGITIMATE";
              }
              
              setTerminalOutput(prev => [...prev,
                "BANK VERIFICATION SYSTEM",
                "==========================================",
                "",
                "SIGNATURE COMPARISON:",
                "--------------------",
                `BANK: ${bankSignature}`,
                `CUST: ${customerSigDoc?.data.signature || 'NO SIGNATURE'}`,
                "",
                "IDENTITY VERIFICATION:",
                "----------------------",
                `NAME: ${bankName} | ${customerIdDoc?.data.name || 'N/A'}`,
                `DOB:  ${bankDOB} | ${customerIdDoc?.data.dateOfBirth || 'N/A'}`,
                `DL#:  ${bankDLNumber} | ${customerIdDoc?.data.licenseNumber || 'N/A'}`,
                `ID#:  ${bankIDNumber} | ${customerIdDoc?.data.idNumber || 'N/A'}`,
                "",
                "ADDRESS VERIFICATION:",
                "---------------------",
                `BANK: ${bankAddress}`,
                `ID:   ${customerIdDoc?.data.address || 'N/A'}`,
                "",
                "ACCOUNT VERIFICATION:",
                "---------------------",
                `BANK: ${bankAccount}`,
                `SLIP: ${customerSlipDoc?.data.accountNumber || 'N/A'}`,
                `BOOK: ${customerBankDoc?.data.accountNumber || 'N/A'}`,
                `ID:   ${customerIdDoc?.data.accountNumber || 'N/A'}`,
                "",
                `STATUS: ${fraudDescription}`,
                "",
                shouldHaveFraud ? 
                  "⚠️  DOCUMENTS DO NOT MATCH - REVIEW REQUIRED" : 
                  "✓ ALL DOCUMENTS VERIFIED",
                "",
                "Use APPROVE or REJECT to process transaction",
                "==========================================",
                ""
              ]);
            }}
            style={{
              marginTop: '8px',
              background: '#444400',
              color: '#ffffff',
              border: '1px solid #ffff00',
              padding: '8px 12px',
              fontSize: '10px',
              fontFamily: 'monospace',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            VERIFY DOCUMENTS
          </button>
        </div>
      )}
    </div>
  );
}

export default App;