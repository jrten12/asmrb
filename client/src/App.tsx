import React, { useState, useRef, useEffect } from 'react';
import { analyzeSignature, generateCustomer, generateDocuments } from './lib/customers';
import type { Customer, Document as GameDocument } from './types/game';

// Import customer data for fraud detection
const CUSTOMER_NAMES = [
  'John Smith', 'Mary Johnson', 'Robert Brown', 'Patricia Davis',
  'Michael Wilson', 'Linda Miller', 'William Moore', 'Elizabeth Taylor',
  'David Anderson', 'Barbara Thomas', 'Richard Jackson', 'Susan White',
  'Charles Harris', 'Jessica Martin', 'Joseph Thompson', 'Sarah Garcia',
  'Christopher Martinez', 'Nancy Rodriguez', 'Matthew Lopez', 'Betty Lee',
  'Anthony Gonzalez', 'Helen Clark', 'Mark Lewis', 'Sandra Robinson',
  'Paul Walker', 'Donna Hall', 'Steven Allen', 'Carol Young',
  'Kenneth King', 'Ruth Wright', 'Joshua Scott', 'Sharon Green',
  'Kevin Adams', 'Michelle Baker', 'Brian Nelson', 'Lisa Hill',
  'George Ramirez', 'Karen Campbell', 'Edward Mitchell', 'Emily Roberts',
  'Ronald Carter', 'Kimberly Phillips', 'Timothy Evans', 'Deborah Turner'
];

const TOWNS = [
  'Millbrook', 'Riverside', 'Fairview', 'Cedar Falls', 'Pine Ridge',
  'Oakwood', 'Sunset Valley', 'Green Hills', 'Silver Creek', 'Maple Grove'
];

const STREET_NAMES = [
  'Oak Street', 'Pine Avenue', 'Elm Drive', 'Cedar Lane', 'Maple Court',
  'Birch Road', 'Willow Way', 'Cherry Street', 'Spruce Avenue', 'Ash Drive',
  'River Road', 'Hill Street', 'Park Avenue', 'Garden Lane', 'Valley Drive',
  'Forest Street', 'Lake Avenue', 'Spring Road', 'Sunset Boulevard', 'Dawn Street'
];

const STATE_NAME = 'Westfield';

// Bill color helper functions for realistic currency appearance
const getBillColor = (denomination: number): string => {
  const colors = {
    1: '#c4d6cf',    // Silver-gray for $1
    5: '#ddc8b0',    // Light tan for $5
    10: '#f7e7ce',   // Light yellow for $10
    20: '#c8e6c9',   // Light green for $20
    50: '#ffcccb',   // Light pink for $50
    100: '#e1bee7'   // Light purple for $100
  };
  return colors[denomination as keyof typeof colors] || '#ffffff';
};

const getDarkBillColor = (denomination: number): string => {
  const colors = {
    1: '#a0b8a8',    // Darker gray for $1
    5: '#c4a882',    // Darker tan for $5
    10: '#e6d4a0',   // Darker yellow for $10
    20: '#a5d6a7',   // Darker green for $20
    50: '#ef9a9a',   // Darker pink for $50
    100: '#ce93d8'   // Darker purple for $100
  };
  return colors[denomination as keyof typeof colors] || '#cccccc';
};

const getLightBillColor = (denomination: number): string => {
  const colors = {
    1: '#e8f5e8',    // Lighter gray for $1
    5: '#f0e6d2',    // Lighter tan for $5
    10: '#fffaeb',   // Lighter yellow for $10
    20: '#e8f5e8',   // Lighter green for $20
    50: '#ffebee',   // Lighter pink for $50
    100: '#f3e5f5'   // Lighter purple for $100
  };
  return colors[denomination as keyof typeof colors] || '#ffffff';
};

const getBillBorderColor = (denomination: number): string => {
  const colors = {
    1: '#7a9b7a',    // Dark gray border for $1
    5: '#8b7355',    // Dark tan border for $5
    10: '#d4af37',   // Gold border for $10
    20: '#388e3c',   // Dark green border for $20
    50: '#d32f2f',   // Dark red border for $50
    100: '#7b1fa2'   // Dark purple border for $100
  };
  return colors[denomination as keyof typeof colors] || '#000000';
};

// Extend Window interface for AdMob and iOS WebKit
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        admob?: {
          postMessage: (message: any) => void;
        };
      };
    };
    admobEvents?: {
      onInterstitialLoaded: () => void;
      onInterstitialFailedToLoad: () => void;
      onRewardedAdLoaded: () => void;
      onRewardedAdFailedToLoad: () => void;
      onRewardedAdRewarded: () => void;
    };
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
  falseFraudAccusations: number;
  consecutiveFalseFraud: number;
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
  const [gamePhase, setGamePhase] = useState<'welcome' | 'tutorial' | 'punch_in' | 'working' | 'punch_out' | 'leaderboard'>('welcome');
  const [gameInitialized, setGameInitialized] = useState(false);
  const [punchStatus, setPunchStatus] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "WESTRIDGE LEDGER BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);
  const [gameScore, setGameScore] = useState({
    score: 0,
    correctTransactions: 0,
    errors: 0,
    timeOnShift: 0,
    fraudulentApprovals: 0,
    consecutiveErrors: 0,
    errorDetails: [] as string[],
    customersCalledWithoutService: 0,
    dismissalWarningGiven: false,
    falseFraudAccusations: 0,
    consecutiveFalseFraud: 0
  });
  const [shiftStartTime, setShiftStartTime] = useState<number>(0);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [showManagerWarning, setShowManagerWarning] = useState(false);
  const [managerMessage, setManagerMessage] = useState('');
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<{
    name: string;
    description: string;
    icon: string;
    color: string;
    tier: string;
  } | null>(null);

  // Background music and sound management
  const [musicMuted, setMusicMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  
  // Background music playlist
  const musicPlaylist = [
    '/The Currency Hypnosis.mp3',
    '/cash-flow-groove.mp3'
  ];




  // Achievement badge definitions
  const badges = [
    { milestone: 1, name: "Rookie Banker", description: "Successfully processed your first customer transaction", icon: "🥉", color: "#CD7F32", tier: "Bronze" },
    { milestone: 5, name: "Teller Trainee", description: "Handled 5 customers with growing confidence", icon: "📊", color: "#C0C0C0", tier: "Silver" },
    { milestone: 9, name: "Branch Professional", description: "Processed 9 transactions with expert precision", icon: "🥈", color: "#4169E1", tier: "Gold" },
    { milestone: 16, name: "Senior Teller", description: "Mastered 16 complex banking transactions", icon: "💼", color: "#4B0082", tier: "Platinum" },
    { milestone: 23, name: "Branch Manager", description: "Excellence across 23 perfect transactions", icon: "👑", color: "#8B008B", tier: "Diamond" },
    { milestone: 30, name: "Banking Legend", description: "Legendary service - 30 flawless transactions", icon: "🏆", color: "#FF0080", tier: "Elite" }
  ];

  // Check for badge achievements
  const checkBadgeAchievement = (transactionCount: number) => {
    const earnedBadge = badges.find(badge => badge.milestone === transactionCount);
    if (earnedBadge) {
      setCurrentBadge(earnedBadge);
      setShowBadgePopup(true);
      
      // Play achievement sound
      const achievementAudio = new Audio('/attached_assets/11L-Punching_in_to_a_pun-1748909724505.mp3');
      achievementAudio.volume = 0.3;
      achievementAudio.play().catch(e => console.log('Achievement audio failed:', e));
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        setShowBadgePopup(false);
        setCurrentBadge(null);
      }, 8000);
    }
  };

  // Performance streak tracking
  const [performanceStreak, setPerformanceStreak] = useState(0);
  const [streakAnimation, setStreakAnimation] = useState<{show: boolean, type: string, message: string}>({
    show: false, type: '', message: ''
  });
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  

  
  // Cash drawer state for new workflow
  const [counterBills, setCounterBills] = useState<number[]>([]);
  const [envelopeBills, setEnvelopeBills] = useState<number[]>([]);
  const [envelopeSealed, setEnvelopeSealed] = useState(false);
  const [draggedBill, setDraggedBill] = useState<number | null>(null);
  
  // Cash supply state
  const [cashSupply, setCashSupply] = useState<{[key: number]: number}>({
    100: 50,
    50: 50, 
    20: 50,
    10: 50,
    5: 50,
    1: 50
  });
  
  // Helper function for updating cash supply
  const updateCashSupply = (denomination: number, change: number) => {
    setCashSupply(prev => ({
      ...prev,
      [denomination]: Math.max(0, (prev[denomination] || 0) + change)
    }));
  };

  // Helper function for adjusting color brightness
  const adjustBrightness = (color: string, amount: number): string => {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  };

  // Handle streak rewards and animations
  const handleStreakReward = (streak: number) => {
    let message = '';
    let type = '';
    let multiplier = 1;
    
    if (streak === 3) {
      message = 'HOT STREAK! +3x POINTS';
      type = 'hot';
      multiplier = 3;
      playSound('completion_bell');
    } else if (streak === 5) {
      message = 'ON FIRE! +5x POINTS';
      type = 'fire';
      multiplier = 5;
      playSound('completion_bell');
    } else if (streak === 10) {
      message = 'LEGENDARY! +10x POINTS';
      type = 'legendary';
      multiplier = 10;
      playSound('easter_melody');
    } else if (streak % 5 === 0 && streak > 10) {
      message = `UNSTOPPABLE! ${streak} STREAK!`;
      type = 'unstoppable';
      multiplier = Math.min(streak, 20);
      playSound('easter_melody');
    }
    
    if (message) {
      setStreakAnimation({ show: true, type, message });
      setStreakMultiplier(multiplier);
      
      // Hide animation after 3 seconds
      setTimeout(() => {
        setStreakAnimation({ show: false, type: '', message: '' });
      }, 3000);
    }
  };

  // Reset streak on error
  const resetStreak = () => {
    setPerformanceStreak(0);
    setStreakMultiplier(1);
    setStreakAnimation({ show: false, type: '', message: '' });
  };

  // Enhanced error tracking and scoring system
  const addCorrectTransaction = () => {
    setGameScore(prev => {
      const newTransactionCount = prev.correctTransactions + 1;
      
      // Check for badge achievement
      checkBadgeAchievement(newTransactionCount);
      
      return {
        ...prev,
        score: prev.score + (100 * streakMultiplier),
        correctTransactions: newTransactionCount,
        consecutiveErrors: 0, // Reset consecutive errors on correct transaction
        customersCalledWithoutService: 0, // Reset dismissal counter on successful transaction
        dismissalWarningGiven: false // Reset warning flag
      };
    });

    // Update performance streak
    setPerformanceStreak(prev => {
      const newStreak = prev + 1;
      handleStreakReward(newStreak);
      return newStreak;
    });
    
    // Track customers served
    setCustomersServed(prev => prev + 1);
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
    customerSignature: string,
    analysis?: {
      isAuthentic: boolean;
      confidence: number;
      notes: string[];
      fraudIndicators: string[];
    }
  }>({
    isOpen: false, 
    bankSignature: '',
    customerSignature: ''
  });
  const [currentStep, setCurrentStep] = useState<'lookup' | 'signature' | 'process' | 'approve'>('lookup');
  const [waitingForInput, setWaitingForInput] = useState<string>('');
  const [commandPrefix, setCommandPrefix] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [bankRecord, setBankRecord] = useState<{
    name: string;
    address: string;
    accountNumber: string;
    balance: number;
  } | null>(null);
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
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [showArrestAnimation, setShowArrestAnimation] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [customersServed, setCustomersServed] = useState(0);
  const [fraudTracker, setFraudTracker] = useState<boolean[]>([]);
  
  // Ad system states
  const [showAdBreak, setShowAdBreak] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  
  // Show interstitial ad function
  const showInterstitialAd = () => {
    console.log('Showing interstitial ad');
    setShowAdBreak(true);
    setAdCountdown(5);
    
    const countdown = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          setShowAdBreak(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [numberPadPosition, setNumberPadPosition] = useState({ x: 0, y: 0 });
  const [isTerminated, setIsTerminated] = useState(false);
  const [currentNumberInput, setCurrentNumberInput] = useState('');
  

  const [showWireInput, setShowWireInput] = useState(false);
  const [wireAmount, setWireAmount] = useState('');
  const [wireDestAccount, setWireDestAccount] = useState('');

  // Cash drawer state variables
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false);
  const [cashDrawerAmount, setCashDrawerAmount] = useState(0);
  const [billsOnCounter, setBillsOnCounter] = useState<any[]>([]);
  const [totalCounted, setTotalCounted] = useState(0);
  const [draggingBill, setDraggingBill] = useState<number | null>(null);
  const [showPrinter, setShowPrinter] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string>('');

  // Cash Register System
  const [selectedBills, setSelectedBills] = useState<{[key: number]: number}>({});
  const [billsInEnvelope, setBillsInEnvelope] = useState<{denomination: number, id: string}[]>([]);
  const [showEnvelopeSealing, setShowEnvelopeSealing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateCustomerLocal = (): Customer => {
    // Implement scattered 40% fraud distribution (4 out of every 10 customers)
    const fraudPattern = [false, true, false, false, true, false, true, false, false, true]; // Exactly 40% fraud, scattered
    const currentIndex = fraudTracker.length % fraudPattern.length;
    const shouldBeFraud = fraudPattern[currentIndex];
    
    // Track fraud distribution
    setFraudTracker(prev => [...prev, shouldBeFraud]);
    
    // Generate customer with controlled fraud rate
    let customer = generateCustomer(1);
    
    // Override fraud status to ensure 40% rate with scattered distribution
    if (shouldBeFraud && customer.suspiciousLevel === 0) {
      // Force fraud for this customer
      customer.suspiciousLevel = Math.floor(Math.random() * 2) + 1; // 1-2 fraud types
      // Regenerate documents with fraud
      customer.documents = generateDocuments(customer.name, customer.transaction, customer.suspiciousLevel);
    } else if (!shouldBeFraud && customer.suspiciousLevel > 0) {
      // Force legitimate for this customer
      customer.suspiciousLevel = 0;
      // Regenerate documents without fraud
      customer.documents = generateDocuments(customer.name, customer.transaction, 0);
    }
    
    // Add isFraudulent property based on document validity
    const isFraudulent = customer.documents.some(doc => !doc.isValid);
    
    return {
      ...customer,
      isFraudulent
    };
  };

  // Initialize game properly on first mount
  useEffect(() => {
    setGameInitialized(true);
  }, []);

  // Monitor game state to prevent glitches
  useEffect(() => {
    // Prevent working phase without customer
    if (gamePhase === 'working' && !currentCustomer && gameInitialized) {
      console.log('Generating customer for working phase');
      playSound('customer_call');
      setCurrentCustomer(generateCustomerLocal());
    }
  }, [gamePhase, gameInitialized]);

  const playSound = (type: string) => {
    try {
      // Create or reuse audio context
      if (!window.gameAudioContext) {
        window.gameAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = window.gameAudioContext;
      
      // Always try to resume audio context (browsers suspend it)
      if (audioContext.state !== 'running') {
        audioContext.resume().catch(() => {});
      }
      
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
          // Clean, simple keypress sound
          createTone(1000, 0.08, 0.15);
          break;
        case 'button_click':
          // Immediate reliable button click sound
          createTone(1200, 0.1, 0.15);
          createTone(800, 0.08, 0.12);
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
          // Short dot matrix printer sound - 1 second
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              // Main printer head impact
              createTone(1600 + (i % 4) * 150, 0.025, 0.04);
              createTone(1200 + (i % 3) * 100, 0.015, 0.03);
              // Mechanical noise and paper feed
              createNoise(0.018, 0.025);
              // Carriage movement
              if (i % 4 === 0) createTone(800, 0.008, 0.02);
            }, i * 80);
          }
          break;
        case 'customer_call':
          // Pleasant bell-like sound for calling next customer
          createTone(800, 0.15, 0.3);
          setTimeout(() => createTone(1000, 0.12, 0.25), 100);
          setTimeout(() => createTone(1200, 0.1, 0.2), 200);
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
        case 'cash_drawer_open':
          // Deeply satisfying mechanical cash drawer opening with authentic sounds
          createTone(180, 0.12, 0.1);
          setTimeout(() => createTone(220, 0.08, 0.08), 80);
          setTimeout(() => createTone(280, 0.15, 0.06), 160);
          setTimeout(() => createTone(240, 0.18, 0.04), 240);
          setTimeout(() => {
            // Metal spring release
            createTone(320, 0.06, 0.03);
            createNoise(0.25, 0.015);
          }, 320);
          setTimeout(() => {
            // Final settling click
            createTone(200, 0.08, 0.02);
          }, 450);
          break;
        case 'cash_drawer_close':
          // Mechanical drawer closing with multiple satisfying clicks
          createTone(280, 0.08, 0.06);
          setTimeout(() => createTone(240, 0.1, 0.08), 60);
          setTimeout(() => createTone(200, 0.12, 0.06), 120);
          setTimeout(() => createTone(160, 0.08, 0.04), 180);
          setTimeout(() => {
            // Final lock click
            createTone(140, 0.06, 0.03);
            createNoise(0.15, 0.01);
          }, 240);
          break;
        case 'bill_rustle':
          // Enhanced ASMR paper money rustling with layered textures
          createNoise(0.35, 0.02);
          setTimeout(() => createNoise(0.28, 0.015), 40);
          setTimeout(() => createNoise(0.22, 0.012), 80);
          setTimeout(() => createNoise(0.18, 0.008), 120);
          setTimeout(() => {
            // Paper fiber sound
            createTone(2400, 0.03, 0.005);
            createNoise(0.15, 0.006);
          }, 160);
          break;
        case 'bill_snap':
          // Crisp bill snapping with authentic paper texture
          createTone(1200, 0.04, 0.04);
          createTone(800, 0.05, 0.03);
          createNoise(0.25, 0.008);
          setTimeout(() => {
            createTone(1000, 0.03, 0.02);
            createNoise(0.18, 0.006);
          }, 30);
          setTimeout(() => {
            createNoise(0.12, 0.004);
          }, 60);
          break;
        case 'bill_count':
          // Satisfying bill counting rhythm with finger taps
          createTone(650, 0.035, 0.025);
          createNoise(0.15, 0.008);
          setTimeout(() => {
            createTone(700, 0.03, 0.02);
            createNoise(0.12, 0.006);
          }, 70);
          setTimeout(() => {
            // Finger tap on bill
            createTone(450, 0.025, 0.015);
          }, 110);
          break;
        case 'cash_register_ding':
          // Enhanced classic cash register bell with resonance
          createTone(1200, 0.25, 0.18);
          setTimeout(() => createTone(1600, 0.2, 0.12), 80);
          setTimeout(() => createTone(2000, 0.15, 0.08), 160);
          setTimeout(() => {
            // Bell resonance
            createTone(1400, 0.3, 0.04);
          }, 240);
          setTimeout(() => {
            // Final harmonic
            createTone(1800, 0.2, 0.02);
          }, 400);
          break;
        case 'envelope_seal':
          // Satisfying envelope sealing machine sounds
          createTone(400, 0.15, 0.1);
          setTimeout(() => createTone(350, 0.12, 0.08), 100);
          setTimeout(() => {
            // Steam hiss
            createNoise(0.4, 0.06);
          }, 200);
          setTimeout(() => {
            // Pressure release
            createTone(600, 0.08, 0.04);
            createNoise(0.25, 0.03);
          }, 300);
          setTimeout(() => {
            // Final seal click
            createTone(800, 0.06, 0.02);
          }, 450);
          break;
        case 'envelope_place':
          // Paper envelope placement sound
          createNoise(0.2, 0.01);
          createTone(300, 0.04, 0.02);
          setTimeout(() => {
            createNoise(0.15, 0.008);
          }, 50);
          break;
        case 'matrix_code':
          // Digital rain sound effect
          for (let i = 0; i < 20; i++) {
            setTimeout(() => {
              createTone(800 + Math.random() * 1000, 0.05, 0.03);
            }, i * 50);
          }
          break;
        case 'police_radio':
          // Authentic police radio dispatch sound with static
          // Radio static burst
          createNoise(0.4, 0.15);
          setTimeout(() => createNoise(0.2, 0.1), 150);
          
          // Radio beep
          setTimeout(() => createTone(800, 0.2, 0.05), 300);
          
          // Static crackle
          setTimeout(() => {
            for (let i = 0; i < 8; i++) {
              setTimeout(() => createNoise(0.15, 0.03), i * 40);
            }
          }, 500);
          
          // Deep radio voice frequency simulation
          setTimeout(() => {
            createTone(180, 0.8, 0.08);
            createTone(220, 0.6, 0.06);
            createTone(160, 0.4, 0.04);
          }, 800);
          
          // Radio squelch at end
          setTimeout(() => {
            createTone(1200, 0.15, 0.04);
            createNoise(0.3, 0.08);
          }, 1600);
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
          // Very short punch clock sound - only during animation
          createTone(400, 0.15, 0.1);
          createTone(300, 0.1, 0.08);
          break;
        case 'dot_matrix_print':
          // Play authentic dot matrix printer for 2 seconds
          try {
            const printerAudio = new Audio('/dot-matrix-printer.mp3');
            printerAudio.volume = 0.4;
            printerAudio.currentTime = 0;
            printerAudio.play().catch(e => {
              console.log('Dot matrix audio play failed:', e);
              // Fallback to synthesized printer sound
              for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                  createTone(1600 + (i % 4) * 150, 0.025, 0.04);
                  createNoise(0.018, 0.025);
                }, i * 50);
              }
            });
            // Stop after 2 seconds
            setTimeout(() => {
              printerAudio.pause();
              printerAudio.currentTime = 0;
            }, 2000);
          } catch (e) {
            console.log('Dot matrix audio creation failed:', e);
            // Fallback synthesized sound
            for (let i = 0; i < 6; i++) {
              setTimeout(() => {
                createTone(1600 + (i % 4) * 150, 0.025, 0.04);
                createNoise(0.018, 0.025);
              }, i * 50);
            }
          }
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
          // Clean processing sound without weird jingle
          createTone(1200, 0.1, 0.08);
          setTimeout(() => createTone(1400, 0.08, 0.06), 200);
          setTimeout(() => createTone(1600, 0.06, 0.04), 400);
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
        case 'punch_clock':
          // Play the authentic punch clock sound
          const punchClockAudio = new Audio('/punch-clock.mp3');
          punchClockAudio.volume = 0.7;
          punchClockAudio.currentTime = 0;
          punchClockAudio.play().catch(e => console.log('Punch clock audio play failed:', e));
          break;


        case 'paper_tear':
          // Paper tearing sound
          createNoise(0.3, 0.15);
          setTimeout(() => createTone(200, 0.1, 0.05), 150);
          break;

        case 'drawer_open':
          // Heavy metal drawer opening sound
          createTone(60, 0.2, 0.1);
          setTimeout(() => createNoise(0.15, 0.3), 100);
          setTimeout(() => createTone(80, 0.15, 0.05), 300);
          break;

        case 'drawer_close':
          // Heavy metal drawer closing sound
          createTone(80, 0.2, 0.1);
          setTimeout(() => createTone(60, 0.25, 0.15), 200);
          setTimeout(() => createNoise(0.1, 0.1), 350);
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
    console.log("Handling command:", cmd, "Current customer:", currentCustomer);
    
    if (cmd === 'NEXT') {
      const customer = generateCustomerLocal();
      setCurrentCustomer(customer);
      resetVerificationState();
      setTerminalOutput(prev => [...prev, "> " + command, "Customer " + customer.name + " approaching window...", "REQUEST: " + customer.transaction.type.toUpperCase() + " $" + customer.transaction.amount, "Please verify identity before processing."]);
      console.log("Generated customer:", customer);
      playSound('customer_approach');
    } else if (cmd === 'LOOKUP' || cmd.startsWith('LOOKUP ')) {
      if (cmd === 'LOOKUP') {
        setTerminalOutput(prev => [...prev, "> " + command, "Enter account number to verify:"]);
        // Show only number pad for account lookup
        setNumberPadPosition({ 
          x: (window.innerWidth - 300) / 2, 
          y: (window.innerHeight - 400) / 2
        });
        setShowNumberPad(true);
        setCommandPrefix('LOOKUP ');
        setCurrentNumberInput('');
        // Don't show floating input, just number pad
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
            // Check if customer is suspicious - accounts of suspicious customers should not be found
            if (currentCustomer && currentCustomer.suspiciousLevel >= 3) {
              // Suspicious customers have invalid accounts
              setVerificationState(prev => ({...prev, accountLookedUp: true, accountNotFound: true}));
              
              setTerminalOutput(prev => [...prev, 
                "> LOOKUP " + accountNum,
                "✗✗✗ ACCOUNT NOT FOUND ✗✗✗",
                "ERROR: NO RECORD IN SYSTEM",
                "STATUS: INVALID ACCOUNT NUMBER",
                "RECOMMENDATION: REJECT TRANSACTION",
                "POTENTIAL FRAUD INDICATOR"
              ]);
              playSound('reject');
            } else {
              // Generate deterministic account balance for legitimate customers
              let sum = 0;
              for (let i = 0; i < accountNum.length; i++) {
                sum += accountNum.charCodeAt(i);
              }
              const balance = ((sum * 123) % 5000) + 500; // $500 to $5500
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
        if (currentCustomer.suspiciousLevel > 0) {
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
        
        if (currentCustomer.suspiciousLevel > 0) {
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
      console.log("COMPARE SIGNATURE command triggered");
      if (!currentCustomer) {
        console.log("No current customer");
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp) {
        setWarningMessage("LOOKUP account first");
        setShowWarningPopup(true);
        playSound('reject');
        
        // Auto-close popup after 2 seconds
        setTimeout(() => {
          setShowWarningPopup(false);
        }, 2000);
        
        return;
      }
      
      console.log("Account lookup verified, proceeding with signature comparison");
      
      console.log("Current customer documents:", currentCustomer.documents);
      
      // Get the signature from customer documents (handle both old and new formats)
      const signatureDoc = currentCustomer.documents.find(d => 
        d.type === 'signature'
      );
      if (!signatureDoc) {
        console.log("No signature document found", currentCustomer.documents);
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No signature document available"]);
        return;
      }
      
      console.log("Found signature document:", signatureDoc);
      
      const customerSignatureData = signatureDoc.data.signature as string;
      const name = currentCustomer.name;
      
      // Generate stylized bank signature for display (no automatic analysis)
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
      
      // Generate customer signature display based on signature data (no fraud determination)
      let displaySignature = name;
      if (customerSignatureData.includes('_cursive')) {
        displaySignature = bankSignature;
      } else if (customerSignatureData.includes('_print')) {
        displaySignature = name.toUpperCase();
      } else if (customerSignatureData.includes('_mixed')) {
        displaySignature = name.split(' ').map((part, i) => i === 0 ? part : part.toUpperCase()).join(' ');
      } else if (customerSignatureData.includes('_elaborate')) {
        displaySignature = bankSignature + "✦";
      } else if (customerSignatureData.includes('_initials')) {
        displaySignature = name.split(' ').map(part => part[0]).join('.');
      } else if (customerSignatureData.includes('_wrong')) {
        const wrongNames = ["Jane Doe", "Bob Smith", "Mary Jones"];
        displaySignature = wrongNames[Math.floor(Math.random() * wrongNames.length)];
      } else if (customerSignatureData.includes('_misspelled')) {
        displaySignature = name.replace(/[aeiou]/g, (match, offset) => 
          offset === 0 ? match : String.fromCharCode(97 + Math.floor(Math.random() * 26))
        );
      } else if (customerSignatureData.includes('_partial')) {
        displaySignature = name.split(' ')[Math.floor(Math.random() * name.split(' ').length)];
      } else if (customerSignatureData.includes('_shaky')) {
        displaySignature = name.split('').map(char => char + (Math.random() < 0.3 ? '~' : '')).join('');
      }
      
      setSignatureModal({
        isOpen: true, 
        bankSignature, 
        customerSignature: displaySignature
      });
      
      // Mark signature as compared but don't determine fraud automatically
      setVerificationState(prev => ({...prev, signatureCompared: true}));
      
      const terminalOutput = [
        "> " + command,
        "========== SIGNATURE COMPARISON ==========",
        "RETRIEVING SIGNATURE ON FILE...",
        "CUSTOMER SIGNING FRESH SIGNATURE...",
        "",
        "VISUAL COMPARISON REQUIRED",
        "EXAMINE BOTH SIGNATURES CAREFULLY",
        "LOOK FOR:",
        "- Letter formation differences",
        "- Spacing and flow variations", 
        "- Pressure and pen strokes",
        "- Overall handwriting style",
        "",
        "USE YOUR JUDGMENT TO DETERMINE AUTHENTICITY",
        "SIGNATURE COMPARISON COMPLETE",
        "========================================"
      ];
      
      setTerminalOutput(prev => [...prev, ...terminalOutput]);
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
      
      // Mark transaction as ready for processing (don't auto-complete)
      setVerificationState(prev => ({...prev, transactionProcessed: true}));
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        "========== DEPOSIT PREPARED ==========",
        `AMOUNT: $${amount}`,
        `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
        `NEW BALANCE: $${(accountBalance + parseFloat(amount)).toLocaleString()}`,
        "STATUS: READY FOR PROCESSING",
        "",
        "⚡ CLICK PROCESS TRANSACTION TO COMPLETE ⚡",
        "======================================"
      ]);
      
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
      
      // Check for sufficient funds before proceeding
      
      const withdrawAmount = parseFloat(amount);
      if (withdrawAmount > accountBalance) {
        playSound('reject');
        setTerminalOutput(prev => [...prev, "> " + command, "*** INSUFFICIENT FUNDS ***", `Requested: $${withdrawAmount.toLocaleString()}`, `Available: $${accountBalance.toLocaleString()}`, "TRANSACTION DENIED", "", "Customer: \"Oh, I'm sorry! I didn't realize.", "I must have miscalculated my balance.", "Thank you for checking. I'll come back later.\""]);
        
        // Customer leaves after insufficient funds
        setTimeout(() => {
          setCurrentCustomer(null);
          setVerificationState({
            accountLookedUp: false,
            accountNotFound: false,
            signatureCompared: false,
            signatureFraud: false,
            transactionProcessed: false
          });
          setTerminalOutput(prev => [...prev, "", "Customer has left the window", "Ready for next customer"]);
        }, 3000);
        return;
      }
      
      // Check if withdrawal amount is over $1000 cash limit
      if (withdrawAmount > 1000) {
        playSound('reject');
        setTerminalOutput(prev => [...prev, "> " + command, "*** CASH LIMIT EXCEEDED ***", `Requested: $${withdrawAmount.toLocaleString()}`, "Maximum cash withdrawal: $1,000", "Please use check or money order for larger amounts", "TRANSACTION DENIED"]);
        
        // Customer leaves after cash limit exceeded
        setTimeout(() => {
          setCurrentCustomer(null);
          setVerificationState({
            accountLookedUp: false,
            accountNotFound: false,
            signatureCompared: false,
            signatureFraud: false,
            transactionProcessed: false
          });
          setTerminalOutput(prev => [...prev, "", "Customer understands the limit", "Will return with proper paperwork", "Ready for next customer"]);
        }, 3000);
        return;
      }
      
      // Mark transaction as ready for processing (don't auto-complete)
      setVerificationState(prev => ({...prev, transactionProcessed: true}));
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, 
        "> " + command,
        "========== WITHDRAWAL PREPARED ==========",
        `AMOUNT: $${amount}`,
        `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
        `AVAILABLE BALANCE: $${accountBalance.toLocaleString()}`,
        "STATUS: READY FOR PROCESSING",
        "",
        "⚡ CLICK PROCESS TRANSACTION TO COMPLETE ⚡",
        "========================================"
      ]);
      
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
      
      if (!destAccount || destAccount !== currentCustomer.transaction.targetAccount) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Destination account mismatch", `Expected: ${currentCustomer.transaction.targetAccount}`, `Entered: ${destAccount || 'NONE'}`, "WIRE TRANSFER DENIED"]);
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
          `FROM: ${currentCustomer.transaction.accountNumber}`,
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
      
      if (currentCustomer.transaction.type !== 'inquiry') {
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
          `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
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
      
      // Process the wire transfer transaction
      
      // Customer is legitimate - approve normally
      setTerminalOutput(prev => [...prev, "> " + command, "TRANSACTION APPROVED", "All verifications complete", "Processing payment..."]);
      playSound('approve');
      setTimeout(() => playSound('stamp'), 300);
      setTimeout(() => playSound('receipt_print'), 600);
      setTimeout(() => {
        handleCorrectTransaction();
        setCurrentCustomer(null);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "Customer served successfully. Next customer please."]);
        playSound('paper_rustle');
      }, 2000);
    } else if (cmd === 'REJECT') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      // Check if this is a false fraud accusation (rejecting a legitimate customer)
      if (!currentCustomer.isFraudulent) {
        // Player incorrectly rejected a legitimate customer
        setGameScore(prev => ({
          ...prev,
          falseFraudAccusations: prev.falseFraudAccusations + 1,
          consecutiveFalseFraud: prev.consecutiveFalseFraud + 1,
          errors: prev.errors + 1,
          errorDetails: [...prev.errorDetails, "Incorrectly rejected legitimate customer"]
        }));
        
        // Check for dismissal conditions (same as skipping customers)
        const newFalseFraud = gameScore.consecutiveFalseFraud + 1;
        if (newFalseFraud >= 3 && !gameScore.dismissalWarningGiven) {
          // Give warning for excessive false fraud accusations
          setGameScore(prev => ({...prev, dismissalWarningGiven: true}));
          setManagerMessage("You've incorrectly accused 3 legitimate customers of fraud. Bank policy requires accuracy in fraud detection. One more false accusation will result in immediate termination.");
          setShowManagerWarning(true);
          
          setTimeout(() => {
            setShowManagerWarning(false);
          }, 8000);
          
          setTerminalOutput(prev => [...prev, 
            "> " + command, 
            "========== MANAGER OVERRIDE ==========",
            "*** WARNING: FALSE FRAUD ACCUSATION ***",
            "LEGITIMATE CUSTOMER INCORRECTLY REJECTED",
            "STATUS: CUSTOMER COMPLAINT FILED",
            "MANAGER INTERVENTION REQUIRED",
            "======================================",
            "",
            "CUSTOMER: \"I've banked here for years!\"",
            "CUSTOMER: \"This is completely unacceptable!\"",
            "CUSTOMER: \"I'm calling your manager!\""
          ]);
          
        } else if (newFalseFraud >= 4) {
          // Terminate for excessive false fraud accusations
          setTerminalOutput(prev => [...prev, 
            "> " + command,
            "========== EMPLOYMENT TERMINATED ==========",
            "*** EXCESSIVE FALSE FRAUD ACCUSATIONS ***",
            "REASON: Incorrectly accused 4+ legitimate customers",
            "BANK POLICY: Zero tolerance for discrimination",
            "STATUS: Immediate termination effective",
            "CUSTOMER COMPLAINTS: Multiple filed",
            "==========================================",
            "",
            "SECURITY: Please escort this employee out",
            "HR: Employee badge deactivated",
            "BRANCH MANAGER: Unacceptable performance"
          ]);
          
          setTimeout(() => {
            setGamePhase('punch_out');
          }, 5000);
          return;
        } else {
          setTerminalOutput(prev => [...prev, 
            "> " + command, 
            "========== CUSTOMER COMPLAINT ==========",
            "*** FALSE FRAUD ACCUSATION ***",
            "LEGITIMATE CUSTOMER REJECTED",
            "STATUS: Formal complaint filed",
            "IMPACT: Customer relationship damaged",
            "======================================",
            "",
            "CUSTOMER: \"This is outrageous!\"",
            "CUSTOMER: \"I'm a legitimate account holder!\"",
            "CUSTOMER: \"I'll be speaking to your manager!\""
          ]);
        }
      } else {
        // Correctly rejected fraudulent customer
        setGameScore(prev => ({
          ...prev,
          correctTransactions: prev.correctTransactions + 1,
          consecutiveFalseFraud: 0, // Reset false fraud streak
          score: prev.score + 50
        }));
        
        setTerminalOutput(prev => [...prev, 
          "> " + command, 
          "========== FRAUD PREVENTED ==========",
          "*** SUSPICIOUS TRANSACTION BLOCKED ***",
          "EXCELLENT FRAUD DETECTION",
          "BANK ASSETS: Protected",
          "CUSTOMER SAFETY: Maintained",
          "====================================="
        ]);
        
        // Trigger fraud arrest animation
        setShowArrestAnimation(true);
      }
      
      playSound('reject');
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
        setTerminalOutput(prev => [...prev, "Next customer please."]);
      }, 1500);
    } else if (cmd === 'PUNCH OUT') {

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
          // Play ASMR punch clock sound for clocking out
          const punchAudio = new Audio('/attached_assets/11L-Punching_in_to_a_pun-1748909724505.mp3');
          punchAudio.volume = 0.8;
          punchAudio.play().catch(e => console.log('Audio play failed:', e));
          
          setPunchStatus('ENDING SHIFT');
          setTimeout(() => {
            // Force page reload to skip leaderboard entirely
            window.location.reload();
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
    // Generate realistic account balance (lower amounts)
    const balance = Math.floor(Math.random() * 3000) + 500; // $500 to $3500
    setAccountBalance(balance);
    return balance;
  };

  const processTransaction = () => {
    if (!currentCustomer) return;
    
    // Enhanced fraud detection before processing
    if (!verificationState.accountLookedUp || !verificationState.signatureCompared) {
      setTerminalOutput(prev => [...prev, "ERROR: Complete verification first", "1. LOOKUP account", "2. COMPARE SIGNATURE"]);
      playSound('reject');
      return;
    }
    
    // Check for account not found (major fraud indicator)
    if (verificationState.accountNotFound) {
      handleFraud("Invalid account - customer attempting to use non-existent account");
      return;
    }
    
    // Enhanced signature fraud detection based on customer's actual documents
    const signatureDoc = currentCustomer.documents.find(d => d.type === 'signature');
    if (signatureDoc && signatureDoc.data.signature) {
      const signatureData = signatureDoc.data.signature as string;
      
      // Detect fraud based on signature characteristics
      if (signatureData.includes('_wrong') || 
          signatureData.includes('_misspelled') || 
          signatureData.includes('_partial') ||
          (currentCustomer.suspiciousLevel > 2 && signatureData.includes('_shaky'))) {
        handleFraud("Signature does not match bank records - fraudulent signature detected");
        return;
      }
    }
    
    // Check for document inconsistencies
    const idDoc = currentCustomer.documents.find(d => d.type === 'id');
    if (idDoc && currentCustomer.suspiciousLevel > 1) {
      // Check for name mismatches in documents
      if (idDoc.data.name !== currentCustomer.name) {
        handleFraud("Name on ID does not match customer records - potential identity theft");
        return;
      }
    }
    
    // Process legitimate transaction
    const transactionId = Date.now().toString().slice(-6);
    const timestamp = new Date().toLocaleString();
    
    // Calculate proper balances
    const startingBalance = accountBalance;
    let endingBalance = accountBalance;
    
    if (currentCustomer.transaction.type === 'withdrawal') {
      endingBalance = accountBalance - currentCustomer.transaction.amount;
    } else if (currentCustomer.transaction.type === 'deposit') {
      endingBalance = accountBalance + currentCustomer.transaction.amount;
    } else if (currentCustomer.transaction.type === 'wire_transfer') {
      endingBalance = accountBalance - currentCustomer.transaction.amount;
    } else if (currentCustomer.transaction.type === 'money_order') {
      endingBalance = accountBalance - currentCustomer.transaction.amount;
    }
    
    const receipt = {
      transactionId,
      timestamp,
      customerName: currentCustomer.name,
      accountNumber: currentCustomer.transaction.accountNumber,
      transactionType: currentCustomer.transaction.type,
      amount: currentCustomer.transaction.amount,
      startingBalance: startingBalance,
      endingBalance: endingBalance,
      balance: endingBalance,
      destinationAccount: currentCustomer.transaction.targetAccount
    };
    
    setReceiptData(receipt);
    setShowReceipt(true);
    
    // Terminal feedback during printing
    setTerminalOutput(prev => [...prev, 
      "PROCESSING TRANSACTION...",
      "FRAUD CHECKS PASSED",
      "PRINTING RECEIPT...",
      "DOT MATRIX PRINTER ACTIVE"
    ]);
    
    playSound('dot_matrix_printer');
    
    // Simulate dot matrix printer completion and tear-off after viewing
    setTimeout(() => {
      playSound('paper_tear');
      setShowReceipt(false);
      setReceiptData(null);
      resetVerificationState();
      setCurrentCustomer(null);
      
      // Call handleCorrectTransaction to reset dismissal counter and update score
      handleCorrectTransaction();
      
      setTerminalOutput(prev => [...prev, 
        "TRANSACTION COMPLETE",
        "RECEIPT PRINTED AND TORN OFF",
        "READY FOR NEXT CUSTOMER"
      ]);
    }, 5000);
  };

  const punchIn = () => {

    setShiftStartTime(Date.now());
    setGamePhase('working');
    setTerminalOutput([
      "SHIFT STARTED - " + new Date().toLocaleTimeString(),
      "Welcome to Westridge Ledger Bank",
      "Ready for customer service",
      "",
      "Type HELP for commands or click CALL CUSTOMER"
    ]);
    
    // Start background music
    startBackgroundMusic();
  };

  const startBackgroundMusic = () => {
    if (musicMuted) return;
    
    try {
      if (!backgroundMusicRef.current) {
        // Initialize with first track in playlist
        backgroundMusicRef.current = new Audio(musicPlaylist[currentTrackIndex]);
        backgroundMusicRef.current.loop = false; // Don't loop individual tracks
        backgroundMusicRef.current.volume = 0.0; // Completely silent by default
        backgroundMusicRef.current.preload = 'auto';
        
        // Add event listener for when track ends - advance to next track
        backgroundMusicRef.current.addEventListener('ended', () => {
          if (!musicMuted && backgroundMusicRef.current) {
            const nextIndex = (currentTrackIndex + 1) % musicPlaylist.length;
            console.log(`Switching to track ${nextIndex}: ${musicPlaylist[nextIndex]}`);
            
            // Stop current track completely
            backgroundMusicRef.current.pause();
            backgroundMusicRef.current.currentTime = 0;
            
            // Update track index
            setCurrentTrackIndex(nextIndex);
            
            // Load next track
            backgroundMusicRef.current.src = musicPlaylist[nextIndex];
            backgroundMusicRef.current.load();
            
            // Play next track after a brief delay to ensure loading
            setTimeout(() => {
              if (backgroundMusicRef.current && !musicMuted) {
                backgroundMusicRef.current.volume = 0.01;
                backgroundMusicRef.current.play().catch(e => {
                  console.log('Failed to play next track:', e);
                });
              }
            }, 100);
          }
        });
        
        // Add error handler for music loading
        backgroundMusicRef.current.addEventListener('error', () => {
          console.log('Background music file not found or failed to load');
        });
      }
      
      // Stop any existing music first to prevent overlapping
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
      
      // Ensure we're using the correct track
      if (backgroundMusicRef.current.src !== window.location.origin + musicPlaylist[currentTrackIndex]) {
        backgroundMusicRef.current.src = musicPlaylist[currentTrackIndex];
        backgroundMusicRef.current.load();
      }
      
      // Only play music if not muted
      if (!musicMuted) {
        backgroundMusicRef.current.volume = 0.01; // Set to 1% when unmuted
        backgroundMusicRef.current.play().catch(e => {
          console.log('Background music failed to start:', e);
          // Try again after user interaction
          const tryAgain = () => {
            if (backgroundMusicRef.current && !musicMuted) {
              backgroundMusicRef.current.volume = 0.01;
              backgroundMusicRef.current.play().catch(() => {});
            }
          };
          document.addEventListener('click', tryAgain, { once: true });
          document.addEventListener('keydown', tryAgain, { once: true });
        });
      }
    } catch (error) {
      console.log('Background music initialization failed:', error);
    }
  };

  const toggleMusic = () => {
    setMusicMuted(!musicMuted);
    if (backgroundMusicRef.current) {
      if (!musicMuted) {
        // Muting: stop the music completely
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      } else {
        // Unmuting: restart from beginning with ultra quiet volume
        backgroundMusicRef.current.currentTime = 0;
        backgroundMusicRef.current.volume = 0.01;
        backgroundMusicRef.current.play().catch(() => {});
      }
    }
  };

  const stopBackgroundMusic = () => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  };

  const punchOut = () => {
    console.log('Punch out function called');
    playSound('punch_clock_out');
    
    const timeWorked = Math.floor((Date.now() - shiftStartTime) / 60000);
    setGameScore(prev => ({ ...prev, timeOnShift: timeWorked }));
    
    // Stop background music when shift ends
    stopBackgroundMusic();
    
    // Clear any active states
    setCurrentCustomer(null);
    setSelectedDocument(null);
    setShowCashDrawer(false);
    setCashDrawerOpen(false);
    setBillsOnCounter([]);
    setTotalCounted(0);
    setTerminalOutput([]);
    
    // Always show punch-out screen, then go back to punch in
    setGamePhase('punch_out');
    setPunchStatus('ENDING SHIFT');
    
    // After punch animation, always go back to main menu
    setTimeout(() => {
      setGamePhase('punch_in');
      resetGame();
      setPunchStatus('');
    }, 2000);
  };

  const resetGame = () => {
    setGameScore({ 
      score: 0, 
      correctTransactions: 0, 
      errors: 0, 
      timeOnShift: 0, 
      fraudulentApprovals: 0,
      consecutiveErrors: 0, 
      errorDetails: [],
      customersCalledWithoutService: 0,
      dismissalWarningGiven: false,
      falseFraudAccusations: 0,
      consecutiveFalseFraud: 0
    });
    setCurrentCustomer(null);
    resetVerificationState();
    setCardInSlot(false);
    setCardPosition({ x: 50, y: 400 });
    setPunchStatus('');
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

  const generateBalance = (accountNum: string): number => {
    // Generate deterministic balance based on account number
    let sum = 0;
    for (let i = 0; i < accountNum.length; i++) {
      sum += accountNum.charCodeAt(i);
    }
    const balance = ((sum * 123) % 5000) + 500; // $500 to $5500
    return balance;
  };

  const handleFraud = (reason: string) => {
    console.log('Fraud detected:', reason);
    
    // Show arrest animation
    setShowArrestAnimation(true);
    
    // Play fraud detection sound
    playSound('reject');
    
    // Update terminal with fraud alert
    setTerminalOutput(prev => [...prev, 
      "🚨 FRAUD DETECTED 🚨",
      "REASON: " + reason,
      "CONTACTING SECURITY...",
      "AUTHORITIES NOTIFIED",
      "EXCELLENT DETECTIVE WORK!"
    ]);
    
    // Update score for catching fraud
    setGameScore(prev => ({
      ...prev,
      score: prev.score + 200, // Bonus points for catching fraud
      correctTransactions: prev.correctTransactions + 1,
      consecutiveErrors: 0,
      customersCalledWithoutService: 0,
      dismissalWarningGiven: false,
      consecutiveFalseFraud: 0
    }));
    
    // Track customer served for ad display
    setCustomersServed(prev => {
      const newCount = prev + 1;
      console.log(`Customer count: ${newCount}`);
      if (newCount % 5 === 0) {
        console.log('Should show ad at customer', newCount);
        setShowAdBreak(true);
        setAdCountdown(5);
        
        const countdown = setInterval(() => {
          setAdCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              setShowAdBreak(false);
              return 5;
            }
            return prev - 1;
          });
        }, 1000);
      }
      return newCount;
    });
    
    // Clear customer after arrest animation
    setTimeout(() => {
      setShowArrestAnimation(false);
      setCurrentCustomer(null);
      resetVerificationState();
      setTerminalOutput(prev => [...prev, 
        "FRAUD SUSPECT ARRESTED",
        "CASE CLOSED",
        "READY FOR NEXT CUSTOMER"
      ]);
    }, 8000);
  };

  const handleCorrectTransaction = () => {
    setGameScore(prev => {
      const newTransactionCount = prev.correctTransactions + 1;
      
      // Check for badge achievement
      checkBadgeAchievement(newTransactionCount);
      
      return {
        ...prev,
        score: prev.score + 100,
        correctTransactions: newTransactionCount,
        consecutiveErrors: 0, // Reset consecutive errors on correct transaction
        customersCalledWithoutService: 0, // Reset dismissal counter on successful transaction
        dismissalWarningGiven: false, // Reset warning flag
        consecutiveFalseFraud: 0 // Reset false fraud streak on successful transaction
      };
    });
    
    // Check if ad should be shown every 5 customers
    setCustomersServed(prev => {
      const newCount = prev + 1;
      console.log(`Customer count: ${newCount}`);
      if (newCount % 5 === 0) {
        console.log('Should show ad at customer', newCount);
        // Show interstitial ad every 5 customers
        setShowAdBreak(true);
        setAdCountdown(5);
        
        const countdown = setInterval(() => {
          setAdCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              setShowAdBreak(false);
              return 5;
            }
            return prev - 1;
          });
        }, 1000);
      }
      return newCount;
    });
  };

  const handleError = () => {
    const newErrors = gameScore.errors + 1;
    setGameScore(prev => ({ ...prev, errors: newErrors }));
    
    // Reset performance streak on error
    resetStreak();
    
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
      
      // Get slot position dynamically
      const slotCenterX = window.innerWidth / 2;
      const slotCenterY = window.innerHeight / 2 - 50;
      
      // Check if near slot (auto-snap)
      if (Math.abs(e.clientX - slotCenterX) < 80 && Math.abs(e.clientY - slotCenterY) < 80) {
        setCardPosition({ x: slotCenterX - 80, y: slotCenterY - 50 });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      
      // Get slot position dynamically
      const slotCenterX = window.innerWidth / 2;
      const slotCenterY = window.innerHeight / 2 - 50;
      
      // Check if dropped in slot area
      if (Math.abs(e.clientX - slotCenterX) < 100 && Math.abs(e.clientY - slotCenterY) < 100) {
        setCardPosition({ x: slotCenterX - 80, y: slotCenterY - 50 });
        setTimeout(() => {
          setCardInSlot(true);
          playTimeclockPunch();
        }, 200);
      }
    }
  };

  const playTimeclockPunch = () => {
    // Play your authentic punch clock audio immediately when card goes in
    playSound('button_click');
    
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
      return `Type LOOKUP ${currentCustomer.transaction.accountNumber}`;
    }
    
    if (!verificationState.signatureCompared) {
      return "Type COMPARE SIGNATURE";
    }
    
    if (!verificationState.transactionProcessed) {
      return `Type PROCESS ${currentCustomer.transaction.type} ${currentCustomer.transaction.amount}`;
    }
    
    return "Type APPROVE or REJECT";
  };

  // Welcome Screen with Terms and Conditions
  if (gamePhase === 'welcome') {
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
        padding: '20px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* CRT Scanlines */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
          pointerEvents: 'none'
        }} />
        
        {/* Moving CRT Scanline */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.6), transparent)',
          pointerEvents: 'none',
          animation: 'scanlineMove 3s linear infinite'
        }} />
        
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          border: '3px solid #00ff00',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '600px',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)'
        }}>
          <img 
            src="/bank-teller-1988-logo.png" 
            alt="Bank Teller 1988"
            style={{
              width: window.innerWidth < 768 ? '180px' : '220px',
              maxWidth: '80vw',
              height: 'auto',
              marginBottom: '20px',
              filter: 'drop-shadow(0 0 20px #00ff00)',
              imageRendering: 'pixelated'
            }}
          />
          
          <div style={{
            fontSize: '14px',
            color: '#cccccc',
            lineHeight: '1.6',
            marginBottom: '25px',
            textAlign: 'center'
          }}>
            Process transactions, review documents, and stop suspicious activity—all using satisfying 1980s banking tech
          </div>
          
          <div style={{
            fontSize: '9px',
            color: '#666666',
            lineHeight: '1.3',
            textAlign: 'center',
            padding: '8px',
            marginBottom: '20px'
          }}>
            Fictional simulation. All names and events are coincidental.
            <br />
            © 2025 Infarill LLC. All rights reserved.
          </div>
          
          {/* Privacy Policy and Terms Links */}
          <div style={{
            fontSize: '8px',
            color: '#888888',
            textAlign: 'center',
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <button
              onClick={() => window.open('/privacy-policy.html', '_blank')}
              style={{
                background: 'none',
                border: 'none',
                color: '#00ff00',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '8px',
                fontFamily: 'monospace'
              }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => window.open('/terms-of-service.html', '_blank')}
              style={{
                background: 'none',
                border: 'none',
                color: '#00ff00',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '8px',
                fontFamily: 'monospace'
              }}
            >
              Terms of Service
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={() => setGamePhase('tutorial')}
              style={{
                background: 'linear-gradient(145deg, #444400, #222200)',
                border: '2px solid #ffff00',
                color: '#ffff00',
                padding: '15px 25px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '6px',
                fontFamily: 'monospace',
                textShadow: '0 0 10px #ffff00',
                boxShadow: '0 0 20px rgba(255, 255, 0, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.target as HTMLElement).style.background = 'linear-gradient(145deg, #555500, #333300)';
                (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(255, 255, 0, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLElement).style.background = 'linear-gradient(145deg, #444400, #222200)';
                (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.3)';
              }}
            >
              TUTORIAL
            </button>
            
            <button
              onClick={() => setGamePhase('punch_in')}
              style={{
                background: 'linear-gradient(145deg, #004400, #002200)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                padding: '15px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '6px',
                fontFamily: 'monospace',
                textShadow: '0 0 10px #00ff00',
                boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.target as HTMLElement).style.background = 'linear-gradient(145deg, #006600, #003300)';
                (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLElement).style.background = 'linear-gradient(145deg, #004400, #002200)';
                (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3)';
              }}
            >
              GO TO WORK
            </button>
            

          </div>
        </div>
        

      </div>
    );
  }

  // Tutorial Page
  if (gamePhase === 'tutorial') {
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
        padding: '20px',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* CRT Scanlines */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
          pointerEvents: 'none'
        }} />
        
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '3px solid #00ff00',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '800px',
          width: '100%',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '25px',
            color: '#00ff00',
            textShadow: '0 0 10px #00ff00'
          }}>
            BANK TELLER 1988 - HOW TO PLAY
          </div>
          
          <div style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#cccccc'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '8px' }}>
                ⚠️ WHAT IS BANK FRAUD:
              </div>
              <div style={{ marginLeft: '15px' }}>
                Bank fraud occurs when someone uses false identity, forged documents, or stolen account information to illegally obtain money from the bank. This includes fake IDs, mismatched signatures, and using someone else's account details.
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '8px' }}>
                🏦 YOUR JOB AS A BANK TELLER:
              </div>
              <div style={{ marginLeft: '15px' }}>
                • Process customer transactions safely and accurately<br/>
                • Verify customer identity using documents and signatures<br/>
                • Many customers are legitimate, but some are trying to defraud the bank<br/>
                • Use authentic 1980s banking technology and procedures
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '8px' }}>
                💻 TERMINAL COMMANDS:
              </div>
              <div style={{ marginLeft: '15px', fontFamily: 'monospace' }}>
                <div style={{ color: '#00ff00' }}>NEXT</div> - Call next customer to window<br/>
                <div style={{ color: '#00ff00' }}>LOOKUP [account#]</div> - Verify account in database<br/>
                <div style={{ color: '#00ff00' }}>COMPARE SIGNATURE</div> - Check signature authenticity<br/>
                <div style={{ color: '#00ff00' }}>PROCESS [TYPE] [AMOUNT]</div> - Process and approve transaction<br/>
                <div style={{ color: '#ff0000' }}>REPORT FRAUD</div> - Report suspicious activity
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '8px' }}>
                🔍 FRAUD DETECTION:
              </div>
              <div style={{ marginLeft: '15px' }}>
                • Check for account number mismatches<br/>
                • Compare signatures carefully for authenticity<br/>
                • Verify customer name and date of birth<br/>
                • Look for document inconsistencies and suspicious details<br/>
                • Trust your instincts - when in doubt, report fraud!
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '8px' }}>
                📋 TRANSACTION TYPES:
              </div>
              <div style={{ marginLeft: '15px' }}>
                • <span style={{ color: '#00ff00' }}>DEPOSITS</span> - Accept cash and update balance<br/>
                • <span style={{ color: '#ff8800' }}>WITHDRAWALS</span> - Verify sufficient funds<br/>
                • <span style={{ color: '#ff4444' }}>WIRE TRANSFERS</span> - High-risk, verify carefully<br/>
                • <span style={{ color: '#4488ff' }}>INQUIRIES</span> - Balance information requests
              </div>
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <div style={{ color: '#ffff00', fontWeight: 'bold', marginBottom: '8px' }}>
                📈 SCORING:
              </div>
              <div style={{ marginLeft: '15px' }}>
                • +100 points for correctly identifying fraud<br/>
                • +50 points for processing legitimate transactions<br/>
                • -100 points for approving fraud (3 strikes = fired)<br/>
                • -25 points for rejecting legitimate customers
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setGamePhase('welcome')}
            style={{
              background: 'linear-gradient(145deg, #004400, #002200)',
              border: '2px solid #00ff00',
              color: '#00ff00',
              padding: '15px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '6px',
              fontFamily: 'monospace',
              textShadow: '0 0 10px #00ff00',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
              transition: 'all 0.3s ease',
              display: 'block',
              margin: '0 auto'
            }}
            onMouseOver={(e) => {
              (e.target as HTMLElement).style.background = 'linear-gradient(145deg, #006600, #003300)';
              (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.5)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLElement).style.background = 'linear-gradient(145deg, #004400, #002200)';
              (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3)';
            }}
          >
            ← BACK TO MAIN MENU
          </button>
        </div>
      </div>
    );
  }

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
        onTouchMove={(e) => {
          if (isDragging && !cardInSlot && e.touches.length > 0) {
            const touch = e.touches[0];
            setCardPosition({
              x: touch.clientX - dragOffset.x,
              y: touch.clientY - dragOffset.y
            });
          }
        }}
        onTouchEnd={(e) => {
          if (isDragging && e.changedTouches.length > 0) {
            setIsDragging(false);
            const touch = e.changedTouches[0];
            
            // Get slot position dynamically
            const slotCenterX = window.innerWidth / 2;
            const slotCenterY = window.innerHeight / 2 - 50;
            
            // Check if dropped in slot area
            if (Math.abs(touch.clientX - slotCenterX) < 120 && Math.abs(touch.clientY - slotCenterY) < 120) {
              setCardPosition({ x: slotCenterX - 80, y: slotCenterY - 50 });
              setTimeout(() => {
                setCardInSlot(true);
                playTimeclockPunch();
              }, 200);
            }
          }
        }}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
              <img 
                src="/bank-teller-1988-logo.png" 
                alt="Bank Teller 1988"
                style={{
                  width: window.innerWidth < 768 ? '130px' : '160px',
                  maxWidth: '55vw',
                  height: 'auto',
                  filter: 'drop-shadow(0 0 10px #00ff00)',
                  imageRendering: 'pixelated'
                }}
              />
              <img 
                src="/westridge-logo.png" 
                alt="Westridge Ledger Bank"
                style={{
                  width: window.innerWidth < 768 ? '60px' : '75px',
                  height: 'auto',
                  filter: 'drop-shadow(0 0 10px #00ff00)'
                }}
              />
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
          
          {/* Terms and Conditions */}
          <div style={{
            fontSize: '10px',
            color: '#666666',
            lineHeight: '1.3',
            textAlign: 'center',
            padding: '8px',
            borderTop: '1px solid #333333',
            marginTop: '15px'
          }}>
            This is a fictional simulation game. All names, characters, businesses, places, events, and incidents are either products of imagination or used in a fictitious manner. Any resemblance to actual persons, living or dead, or actual events is purely coincidental.
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
            onTouchStart={(e) => {
              if (!cardInSlot) {
                setIsDragging(true);
                const touch = e.touches[0];
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setDragOffset({
                  x: touch.clientX - rect.left,
                  y: touch.clientY - rect.top
                });
                e.preventDefault();
              }
            }}
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
                WESTRIDGE LEDGER BANK
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

        {/* Legal Links */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '8px',
          color: '#666666',
          textAlign: 'center',
          display: 'flex',
          gap: '15px',
          alignItems: 'center'
        }}>
          <span>© 2025 Infarill LLC</span>
          <button
            onClick={() => window.open('/privacy-policy.html', '_blank')}
            style={{
              background: 'none',
              border: 'none',
              color: '#00aa00',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '8px',
              fontFamily: 'monospace'
            }}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => window.open('/terms-of-service.html', '_blank')}
            style={{
              background: 'none',
              border: 'none',
              color: '#00aa00',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '8px',
              fontFamily: 'monospace'
            }}
          >
            Terms of Service
          </button>
        </div>

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
      paddingBottom: '80px',
      overflow: 'auto',
      position: 'fixed',
      top: 0,
      left: 0,
      boxSizing: 'border-box'
    }}>
      
      {/* MUSIC BUTTON - BOTTOM RIGHT CORNER */}
      <div
        key="music-button-unique-2025"
        onClick={toggleMusic}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '35px',
          height: '35px',
          backgroundColor: musicMuted ? '#FF0000' : '#00FF00',
          border: '2px solid #FFFFFF',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#000000',
          cursor: 'pointer',
          zIndex: 99999,
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
          fontWeight: 'bold'
        }}
        title={musicMuted ? "Click to turn music ON" : "Click to turn music OFF"}
      >
        {musicMuted ? '🔇' : '🎵'}
      </div>

      




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
          borderRadius: '4px',
          position: 'relative'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: window.innerWidth < 768 ? '26px' : '22px', color: '#ffff00' }}>
            CUSTOMER: {currentCustomer.name}
          </h1>
          <div style={{ color: '#00ff00', marginBottom: '4px', fontSize: window.innerWidth < 768 ? '28px' : '24px', fontWeight: 'bold', letterSpacing: '2px' }}>
            ACCOUNT: {currentCustomer.transaction.accountNumber}
          </div>
          <div style={{ color: '#ffff00', fontWeight: 'bold', fontSize: window.innerWidth < 768 ? '22px' : '18px' }}>
            REQUEST: {currentCustomer.transaction.type.toUpperCase()} ${currentCustomer.transaction.amount}
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
          <h1 style={{ margin: 0, fontSize: window.innerWidth < 768 ? '24px' : '20px', color: '#888888' }}>NO CUSTOMER PRESENT</h1>
          <div style={{ fontSize: window.innerWidth < 768 ? '18px' : '14px', color: '#00aaff' }}>Tap CALL CUSTOMER to begin</div>
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
          minHeight: window.innerWidth < 768 ? '280px' : '320px',
          maxHeight: window.innerWidth < 768 ? '380px' : '420px',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '0 0 20px rgba(255, 255, 0, 0.3)',
          WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
          boxSizing: 'border-box',
          width: '100%'
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
                    padding: window.innerWidth < 768 ? '8px' : '10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    boxSizing: 'border-box'
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
                    {doc.type === 'id' ? '🆔' : 
                     doc.type === 'slip' ? '📝' : 
                     doc.type === 'bank_book' ? '📖' : 
                     doc.type === 'signature' ? '✍️' : '📄'} {doc.type.toUpperCase()}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gap: '8px',
                    fontSize: window.innerWidth < 768 ? '16px' : '18px'
                  }}>
                    {Object.entries(doc.data).map(([key, value]) => (
                      <div key={key} style={{ 
                        padding: '6px 10px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <span style={{ 
                          color: '#00ffff', 
                          fontSize: window.innerWidth < 768 ? '12px' : '14px',
                          fontWeight: 'bold',
                          letterSpacing: '0.5px',
                          textShadow: '0 0 4px #00ffff'
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                        </span>
                        <span style={{ 
                          color: '#ffffff', 
                          fontWeight: 'bold', 
                          fontSize: window.innerWidth < 768 ? '14px' : '16px',
                          fontFamily: 'monospace',
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          letterSpacing: '0.4px',
                          wordBreak: 'break-word',
                          width: '100%',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textShadow: '0 0 2px rgba(255, 255, 255, 0.5)',
                          boxSizing: 'border-box',
                          display: 'block'
                        }}>
                          {key === 'signature' && typeof value === 'string' && value.includes('|') 
                            ? value.split('|')[0] + ' (Signature Analysis Available)'
                            : String(value)}
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
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
                    gap: '8px' 
                  }}>
                    
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
                        <div><strong>NAME:</strong> {(() => {
                          if (!currentCustomer) return "NO CUSTOMER";
                          if (currentCustomer.suspiciousLevel > 2) return "NO RECORD FOUND";
                          return currentCustomer.name;
                        })()}</div>
                        <div><strong>ACCT:</strong> {(() => {
                          if (!currentCustomer) return "N/A";
                          if (verificationState.accountNotFound) return "INVALID";
                          return currentCustomer.transaction.accountNumber;
                        })()}</div>
                        <div><strong>DOB:</strong> {(() => {
                          if (!currentCustomer) return "N/A";
                          if (currentCustomer.suspiciousLevel > 2) return "NO RECORD";
                          
                          const idDoc = currentCustomer.documents.find(d => d.type === 'id');
                          if (!idDoc || !idDoc.data.dateOfBirth) return '03/15/1985';
                          
                          const customerDOB = String(idDoc.data.dateOfBirth);
                          
                          // For fraud cases with DOB-related fraud, show a different "bank record" DOB
                          if (currentCustomer.suspiciousLevel > 0 && Math.random() < 0.3) {
                            const [month, day, year] = customerDOB.split('/');
                            const bankYear = parseInt(year) + Math.floor(Math.random() * 6) - 3;
                            return `${month}/${day}/${bankYear}`;
                          }
                          
                          // For legitimate customers, show their actual DOB
                          return customerDOB;
                        })()}</div>
                        <div><strong>ADDR:</strong> {(() => {
                          if (!currentCustomer) return "N/A";
                          if (currentCustomer.suspiciousLevel > 2) return "NO RECORD";
                          if (currentCustomer.suspiciousLevel === 1) {
                            // System shows correct address, document shows wrong one
                            const correctStreetNumber = Math.floor(Math.random() * 9999) + 1;
                            const correctStreet = ['Oak Street', 'Pine Avenue', 'Elm Drive'][Math.floor(Math.random() * 3)];
                            const correctTown = ['Millbrook', 'Riverside', 'Fairview'][Math.floor(Math.random() * 3)];
                            const correctZip = Math.floor(Math.random() * 90000) + 10000;
                            return `${correctStreetNumber} ${correctStreet}, ${correctTown}, Westfield ${correctZip}`;
                          }
                          return currentCustomer.documents.find(d => d.type === 'id')?.data.address || 'N/A';
                        })()}</div>
                        <div><strong>BAL:</strong> {(() => {
                          if (!currentCustomer) return "$0.00";
                          if (currentCustomer.suspiciousLevel > 2) return "$0.00";
                          return `$${accountBalance.toLocaleString()}`;
                        })()}</div>
                        <div><strong>STATUS:</strong> {(() => {
                          if (!currentCustomer) return "N/A";
                          if (verificationState.accountNotFound) return "INVALID ACCOUNT";
                          return "ACTIVE";
                        })()}</div>
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
                        <div><strong>FORM ACCT:</strong> {currentCustomer.documents.find(d => d.type === 'slip')?.data.accountNumber || 'N/A'}</div>
                        <div><strong>ID NAME:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.name || 'N/A'}</div>
                        <div><strong>ID DOB:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.dateOfBirth || 'N/A'}</div>
                        <div><strong>ID ADDR:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.address || 'N/A'}</div>
                        <div><strong>DL#:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.licenseNumber || 'N/A'}</div>
                        <div><strong>AMOUNT:</strong> ${currentCustomer.transaction.amount.toLocaleString()}</div>
                        <div><strong>SIGNATURE:</strong> {currentCustomer.documents.find(d => d.type === 'signature')?.data.signature || 'N/A'}</div>
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

        {/* Expandable Bank System Information - Below Documents, Above Terminal */}
        {currentCustomer && verificationState.accountLookedUp && (
          <div style={{
            background: 'rgba(0, 40, 0, 0.4)',
            border: '3px solid #00ff00',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '8px'
          }}>
            <button
              onClick={() => setShowBankInfo(!showBankInfo)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00ff00',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px',
                fontFamily: 'monospace'
              }}
            >
              <span>🏦 BANK SYSTEM RECORDS</span>
              <span style={{ fontSize: '20px' }}>{showBankInfo ? '▼' : '▶'}</span>
            </button>
            
            {showBankInfo && (
              <div style={{ 
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                border: '1px solid #00ff00'
              }}>
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
                    borderRadius: '4px'
                  }}>
                    <div style={{ 
                      fontSize: window.innerWidth < 768 ? '14px' : '16px', 
                      fontWeight: 'bold', 
                      color: '#00ff00', 
                      marginBottom: '8px'
                    }}>
                      PERSONAL INFORMATION
                    </div>
                    <div style={{ 
                      fontSize: window.innerWidth < 768 ? '13px' : '15px', 
                      color: '#ffffff',
                      lineHeight: '1.6',
                      fontFamily: 'monospace'
                    }}>
                      <div><strong>NAME:</strong> {currentCustomer.name}</div>
                      <div><strong>DOB:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.dateOfBirth || '1985-03-15'}</div>
                      <div><strong>ADDRESS:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.address || 'N/A'}</div>
                      <div><strong>LICENSE:</strong> {currentCustomer.documents.find(d => d.type === 'id')?.data.licenseNumber || 'DL-12345'}</div>
                      <div><strong>SSN:</strong> ***-**-1234</div>
                    </div>
                  </div>

                  {/* Account Information */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid #00ff00',
                    padding: window.innerWidth < 768 ? '10px' : '12px',
                    borderRadius: '4px'
                  }}>
                    <div style={{ 
                      fontSize: window.innerWidth < 768 ? '14px' : '16px', 
                      fontWeight: 'bold', 
                      color: '#00ff00', 
                      marginBottom: '8px'
                    }}>
                      ACCOUNT INFORMATION
                    </div>
                    <div style={{ 
                      fontSize: window.innerWidth < 768 ? '13px' : '15px', 
                      color: '#ffffff',
                      lineHeight: '1.6',
                      fontFamily: 'monospace'
                    }}>
                      <div><strong>ACCOUNT:</strong> {verificationState.accountNotFound ? "INVALID" : currentCustomer.transaction.accountNumber}</div>
                      <div><strong>TYPE:</strong> {verificationState.accountNotFound ? "NO RECORD" : "CHECKING"}</div>
                      <div><strong>BALANCE:</strong> {verificationState.accountNotFound ? "$0.00" : `$${accountBalance.toLocaleString()}`}</div>
                      <div><strong>STATUS:</strong> {verificationState.accountNotFound ? "INVALID ACCOUNT" : "ACTIVE"}</div>
                      <div><strong>OPENED:</strong> {verificationState.accountNotFound ? "NO RECORD" : "2020-01-15"}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal Section */}
        <div style={{
          flex: 1,
          background: 'rgba(0, 30, 0, 0.4)',
          border: '2px solid #00ff00',
          padding: '12px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: window.innerWidth < 768 ? '300px' : 'auto'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#00ff00', fontSize: '18px' }}>BANK TERMINAL</h3>
          
          {/* Verification Controls - Above Customer Console */}
          {currentCustomer && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(40, 0, 40, 0.4)',
              border: '2px solid #aa00aa',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '12px', color: '#ff00ff', fontWeight: 'bold', textAlign: 'center' }}>
                🔍 VERIFICATION CONTROLS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: '8px' }}>
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
                    if (currentCustomer && verificationState.accountLookedUp) {
                      playSound('button_click');
                      handleCommand('COMPARE SIGNATURE');
                    }
                  }}
                  disabled={!currentCustomer || !verificationState.accountLookedUp}
                  style={{
                    background: currentCustomer && verificationState.signatureCompared ? 
                      (verificationState.signatureFraud ? 'rgba(100, 0, 0, 0.8)' : 'rgba(0, 100, 0, 0.8)') : 
                      (!currentCustomer || !verificationState.accountLookedUp) ? 'rgba(50, 50, 50, 0.3)' : 'rgba(100, 100, 0, 0.6)',
                    border: '2px solid ' + (currentCustomer && verificationState.signatureCompared ? 
                      (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : 
                      (!currentCustomer || !verificationState.accountLookedUp) ? '#666666' : '#ffff00'),
                    color: currentCustomer && verificationState.signatureCompared ? 
                      (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : 
                      (!currentCustomer || !verificationState.accountLookedUp) ? '#666666' : '#ffff00',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: (currentCustomer && verificationState.accountLookedUp) ? 'pointer' : 'not-allowed',
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
                    <div><strong>TYPE:</strong> {currentCustomer.transaction.type.toUpperCase()}</div>
                    <div><strong>AMOUNT:</strong> ${currentCustomer.transaction.amount.toLocaleString()}</div>
                    {currentCustomer.transaction.targetAccount && (
                      <div><strong>WIRE TO:</strong> {currentCustomer.transaction.targetAccount}</div>
                    )}
                  </div>
                </div>


              </div>


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
                    setShowWireInput(true);
                    setWireAmount('');
                    setWireDestAccount('');
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
                    if (currentCustomer && currentCustomer.transaction.type === 'inquiry') {
                      playSound('button_click');
                      setTerminalOutput(prev => [...prev, "> BALANCE INQUIRY", "Processing balance inquiry..."]);
                      handleCommand('INQUIRY');
                    } else {
                      setTerminalOutput(prev => [...prev, "ERROR: Customer not requesting balance inquiry"]);
                      playSound('reject');
                    }
                  }}
                  disabled={!currentCustomer || currentCustomer.transaction.type !== 'inquiry'}
                  style={{
                    background: currentCustomer && currentCustomer.transaction.type === 'inquiry' ? 'rgba(120, 120, 0, 0.8)' : 'rgba(50, 50, 50, 0.3)',
                    border: '2px solid #aaaa00',
                    color: currentCustomer && currentCustomer.transaction.type === 'inquiry' ? '#ffff00' : '#666666',
                    padding: '12px',
                    fontSize: '12px',
                    cursor: currentCustomer && currentCustomer.transaction.type === 'inquiry' ? 'pointer' : 'not-allowed',
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
            gridTemplateColumns: '1fr',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button
              onClick={() => {
                // Check if current customer was dismissed without service
                if (currentCustomer && !verificationState.transactionProcessed && !isTerminated) {
                  const currentDismissals = gameScore.customersCalledWithoutService + 1;
                  
                  // Fire at 4 dismissals - immediate termination
                  if (currentDismissals >= 4) {
                    console.log('FIRING EMPLOYEE - 4 dismissals reached');
                    playSound('reject');
                    
                    // Create termination overlay and force restart
                    const overlay = document.createElement('div');
                    overlay.style.cssText = `
                      position: fixed;
                      top: 0;
                      left: 0;
                      width: 100vw;
                      height: 100vh;
                      background: rgba(0,0,0,0.95);
                      color: #ff0000;
                      font-family: 'Courier New', monospace;
                      font-size: 20px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      text-align: center;
                      z-index: 9999;
                      line-height: 1.5;
                    `;
                    overlay.innerHTML = `
                      <div>
                        ⚠️ TERMINATION NOTICE ⚠️<br><br>
                        Employee ID: ${Math.floor(Math.random() * 10000)}<br>
                        Violation: Customer Service Abandonment<br><br>
                        You have dismissed ${currentDismissals} customers without completing their transactions.<br><br>
                        Despite previous warnings, you continue this unacceptable behavior.<br><br>
                        Your employment is hereby TERMINATED.<br><br>
                        Security will escort you from the premises.<br><br>
                        - Bank Management<br><br>
                        <div style="color: #00ff00; margin-top: 30px;">Game restarting in 8 seconds...</div>
                      </div>
                    `;
                    
                    document.body.appendChild(overlay);
                    
                    setTimeout(() => {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }, 8000);
                    
                    return;
                  }
                  
                  // Warning at exactly 2 dismissals
                  if (currentDismissals === 2 && !gameScore.dismissalWarningGiven) {
                    console.log('WARNING EMPLOYEE - 2 dismissals reached');
                    setManagerMessage(`⚠️ MANAGEMENT WARNING ⚠️\n\nEmployee ID: ${Math.floor(Math.random() * 10000)}\nViolation: Customer Service Neglect\n\nYou have dismissed ${currentDismissals} customers without completing their transactions.\n\nThis behavior is unacceptable and violates bank policy.\n\nPlease improve your customer service immediately.\n\nFurther violations will result in termination.\n\n- Bank Management`);
                    setShowManagerWarning(true);
                    playSound('reject');
                    
                    setTimeout(() => setShowManagerWarning(false), 4000);
                    
                    setGameScore(prev => ({
                      ...prev,
                      customersCalledWithoutService: currentDismissals,
                      dismissalWarningGiven: true
                    }));
                  } else {
                    setGameScore(prev => ({
                      ...prev,
                      customersCalledWithoutService: currentDismissals
                    }));
                  }
                }
                
                // Call next customer
                setCurrentCustomer(generateCustomerLocal());
                setVerificationState({
                  accountLookedUp: false,
                  accountNotFound: false,
                  signatureCompared: false,
                  signatureFraud: false,
                  transactionProcessed: false
                });
                setTerminalOutput(prev => [...prev, 
                  "",
                  "> Customer approaching teller window",
                  "Ready to process transaction"
                ]);
                playSound('button_click');
              }}
              style={{
                background: 'rgba(0, 100, 0, 0.6)',
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
              CALL CUSTOMER
            </button>
            
            {/* REPORT FRAUD Button */}
            {currentCustomer && (
              <button
                onClick={() => {
                  // Check if customer is actually fraudulent (based on document mismatches)
                  const hasDocumentMismatches = currentCustomer?.documents?.some(doc => !doc.isValid);
                  
                  if (hasDocumentMismatches) {
                    // Correct fraud detection
                    playSound('approve');
                    setGameScore(prev => ({ 
                      ...prev, 
                      score: prev.score + 100, 
                      correctTransactions: prev.correctTransactions + 1 
                    }));
                    setTerminalOutput(prev => [...prev, 
                      "========== FRAUD REPORT ACCEPTED ==========",
                      "✓ WESTFIELD POLICE DEPARTMENT NOTIFIED",
                      "✓ SUSPECT WILL BE APPREHENDED",
                      "✓ +100 POINTS FOR FRAUD DETECTION",
                      "*** EXCELLENT DETECTIVE WORK ***"
                    ]);
                    
                    // Trigger Westfield Police Department arrest animation
                    setShowArrestAnimation(true);
                  } else {
                    // False accusation - penalize player
                    handleTransactionError("Falsely accused legitimate customer of fraud");
                    setTerminalOutput(prev => [...prev, 
                      "ERROR: FALSE FRAUD ACCUSATION",
                      "Customer was legitimate - bank apologizes",
                      "Supervisor notified of error",
                      "-100 points penalty applied"
                    ]);
                    playSound('reject');
                    
                    // Generate new customer after error
                    setTimeout(() => {
                      setCurrentCustomer(generateCustomerLocal());
                      setVerificationState({
                        accountLookedUp: false,
                        accountNotFound: false,
                        signatureCompared: false,
                        signatureFraud: false,
                        transactionProcessed: false
                      });
                    }, 2000);
                  }
                }}
                style={{
                  background: 'rgba(150, 0, 0, 0.8)',
                  border: '3px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  textShadow: '0 0 10px #ff0000',
                  boxShadow: '0 0 15px rgba(255, 0, 0, 0.3)'
                }}
              >
                🚨 REPORT FRAUD
              </button>
            )}
            
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
                gridColumn: 'span 2',
                animation: currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed 
                  ? 'sparkle 1.5s ease-in-out infinite' 
                  : 'none',
                boxShadow: currentCustomer && verificationState.accountLookedUp && verificationState.signatureCompared && verificationState.transactionProcessed 
                  ? '0 0 20px rgba(0, 255, 0, 0.8), inset 0 0 20px rgba(0, 255, 0, 0.2)' 
                  : 'none'
              }}
            >
              🖨️ PROCESS TRANSACTION
            </button>

            {/* Score Display - Below process button */}
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(0, 20, 0, 0.6)',
              border: '1px solid #00aa00',
              borderRadius: '4px'
            }}>
              <div style={{ 
                color: '#00ff00', 
                fontSize: '13px', 
                fontWeight: 'bold',
                marginBottom: '6px',
                textAlign: 'center'
              }}>
                SHIFT PERFORMANCE
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '6px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#00cccc' }}>Score: {gameScore.score}</div>
                <div style={{ color: '#00cccc' }}>Correct: {gameScore.correctTransactions}</div>
                <div style={{ color: '#00cccc' }}>Errors: {gameScore.errors}</div>
                <div style={{ color: '#00cccc' }}>Time: {Math.floor(gameScore.timeOnShift / 60)}:{(gameScore.timeOnShift % 60).toString().padStart(2, '0')}</div>
              </div>
            </div>

            {/* End of Shift Button - Below score */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to end your shift? This will close the game.')) {
                  punchOut();
                }
              }}
              style={{
                marginTop: '8px',
                background: 'linear-gradient(145deg, rgba(200, 0, 0, 0.8), rgba(150, 0, 0, 0.9))',
                border: '1px solid #ff4444',
                borderRadius: '4px',
                color: '#ffdddd',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '6px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'monospace',
                textShadow: '0 0 6px #ff4444',
                boxShadow: '0 0 8px rgba(255, 68, 68, 0.3)',
                width: '100%'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 68, 68, 0.5)';
                e.currentTarget.style.transform = 'scale(1.01)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 68, 68, 0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              END SHIFT
            </button>
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
                  const actuallyFraudulent = signatureModal.analysis && !signatureModal.analysis.isAuthentic;
                  
                  if (actuallyFraudulent) {
                    // Player marked fraudulent signature as VALID - this is an error!
                    handleTransactionError("Approved fraudulent signature - failed to detect forgery");
                    setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: true}));
                    setTerminalOutput(prev => [...prev, 
                      "========== SIGNATURE APPROVED ==========",
                      "✓ TELLER DETERMINATION: VALID",
                      "⚠️ SYSTEM WARNING: POTENTIAL OVERSIGHT",
                      "STATUS: IDENTITY ACCEPTED BY TELLER",
                      "PROCEED WITH TRANSACTION",
                      "======================================"
                    ]);
                  } else {
                    // Correct determination - legitimate signature marked as valid
                    setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: false}));
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
                  }
                  
                  setSignatureModal({isOpen: false, bankSignature: '', customerSignature: ''});
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
                  const actuallyFraudulent = signatureModal.analysis && !signatureModal.analysis.isAuthentic;
                  
                  if (actuallyFraudulent) {
                    // Correct determination - fraudulent signature marked as invalid
                    setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: true}));
                    setTerminalOutput(prev => [...prev, 
                      "========== FRAUD ALERT ==========",
                      "✗ SIGNATURE MISMATCH DETECTED",
                      "✗ CALLING WESTFIELD POLICE DEPT", 
                      "✗ SUSPECT WILL BE ARRESTED",
                      "*** EXCELLENT FRAUD DETECTION ***",
                      "================================="
                    ]);
                    playSound('approve');
                    // Trigger Westfield Police Department arrest animation
                    setShowArrestAnimation(true);
                  } else {
                    // Player marked legitimate signature as INVALID - this is an error!
                    handleTransactionError("Rejected valid signature - incorrect fraud determination");
                    setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: true}));
                    setTerminalOutput(prev => [...prev, 
                      "========== SIGNATURE REJECTED ==========",
                      "✗ TELLER DETERMINATION: INVALID",
                      "⚠️ SYSTEM WARNING: LEGITIMATE SIGNATURE REJECTED",
                      "STATUS: CUSTOMER IDENTITY INCORRECTLY DENIED",
                      "*** PROCESSING ERROR - CUSTOMER COMPLAINT LIKELY ***",
                      "TELLER TRAINING MAY BE REQUIRED",
                      "======================================="
                    ]);
                    playSound('reject');
                  }
                  
                  setSignatureModal({isOpen: false, bankSignature: '', customerSignature: ''});
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

      {/* Wire Transfer Input Panel */}
      {showWireInput && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 20, 0, 0.95)',
          border: '3px solid #aa00aa',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 0 20px rgba(170, 0, 170, 0.6)',
          zIndex: 1500,
          width: '300px',
          backdropFilter: 'none'
        }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div style={{
                color: '#ff00ff',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                🔄 WIRE TRANSFER SETUP
              </div>
              <button
                onClick={() => {
                  setShowWireInput(false);
                  playSound('modal_close');
                }}
                style={{
                  background: 'none',
                  border: '1px solid #ff4444',
                  color: '#ff4444',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: '#ff00ff',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                TRANSFER AMOUNT ($):
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={wireAmount}
                onChange={(e) => setWireAmount(e.target.value)}
                placeholder="Enter amount"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '2px solid #aa00aa',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ff00ff',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                DESTINATION ACCOUNT:
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={wireDestAccount}
                onChange={(e) => setWireDestAccount(e.target.value)}
                placeholder="Enter destination account"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: '2px solid #aa00aa',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  if (wireAmount && wireDestAccount) {
                    handleCommand(`WIRE $${wireAmount} TO ${wireDestAccount}`);
                    setShowWireInput(false);
                    playSound('button_click');
                  }
                }}
                disabled={!wireAmount || !wireDestAccount}
                style={{
                  background: (wireAmount && wireDestAccount) ? 'rgba(120, 0, 120, 0.8)' : 'rgba(60, 60, 60, 0.5)',
                  border: '2px solid #aa00aa',
                  color: (wireAmount && wireDestAccount) ? '#ff00ff' : '#666666',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: (wireAmount && wireDestAccount) ? 'pointer' : 'not-allowed',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              >
                PROCESS WIRE
              </button>
              
              <button
                onClick={() => {
                  setShowWireInput(false);
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
                CANCEL
              </button>
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
              onFocus={(e) => {
                if (inputRef.current) {
                  inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Show number pad if input involves numbers
                  if (waitingForInput.toLowerCase().includes('account') || waitingForInput.toLowerCase().includes('amount') || 
                      waitingForInput.toLowerCase().includes('number') || /\d/.test(e.target.value) ||
                      commandPrefix.toLowerCase().includes('account') || commandPrefix.toLowerCase().includes('amount') ||
                      inputPrompt.toLowerCase().includes('account') || inputPrompt.toLowerCase().includes('number')) {
                    // Center the number pad on screen
                    setNumberPadPosition({ 
                      x: (window.innerWidth - 300) / 2, 
                      y: (window.innerHeight - 400) / 2
                    });
                    setShowNumberPad(true);
                  }
                }
              }}
              onBlur={() => {
                // Keep number pad visible during account lookup
                if (commandPrefix === 'LOOKUP ') {
                  // Don't hide during account lookup
                  return;
                }
                // Don't hide number pad when clicking buttons
                setTimeout(() => {
                  if (!document.activeElement?.closest('.number-pad')) {
                    setShowNumberPad(false);
                  }
                }, 100);
              }}
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
            WESTRIDGE LEDGER BANK
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
          alignItems: 'flex-end',
          paddingBottom: '120px',
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
                Account: {currentCustomer.transaction.accountNumber}
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
                Requested Withdrawal: ${currentCustomer.transaction.amount.toLocaleString()}
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
                  if (currentCustomer.transaction.amount <= accountBalance) {
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
                    setTerminalOutput(prev => [...prev, "INSUFFICIENT FUNDS", "Withdrawal denied", "", "Customer: \"Oh, I'm sorry! I didn't realize.", "I must have miscalculated my balance.", "Thank you for checking. I'll come back later.\""]);
                    
                    // Customer leaves after insufficient funds
                    setTimeout(() => {
                      setCurrentCustomer(null);
                      setVerificationState({
                        accountLookedUp: false,
                        accountNotFound: false,
                        signatureCompared: false,
                        signatureFraud: false,
                        transactionProcessed: false
                      });
                      setTerminalOutput(prev => [...prev, "", "Customer has left the window", "Ready for next customer"]);
                    }, 3000);
                  }
                }}
                disabled={currentCustomer.transaction.amount > accountBalance}
                style={{
                  background: currentCustomer.transaction.amount <= accountBalance ? 'rgba(0, 255, 0, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                  border: '2px solid ' + (currentCustomer.transaction.amount <= accountBalance ? '#00ff00' : '#666666'),
                  color: currentCustomer.transaction.amount <= accountBalance ? '#00ff00' : '#666666',
                  padding: '15px 30px',
                  fontSize: '16px',
                  cursor: currentCustomer.transaction.amount <= accountBalance ? 'pointer' : 'not-allowed',
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

      {/* CRT-Style Number Pad */}
      {showNumberPad && (
        <div className="number-pad" style={{
          position: 'fixed',
          left: `${numberPadPosition.x}px`,
          top: `${numberPadPosition.y}px`,
          background: 'linear-gradient(145deg, #001a00, #003300)',
          border: '3px solid #00ff00',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.6), inset 0 0 20px rgba(0, 255, 0, 0.1)',
          zIndex: 2500,
          width: '280px',
          animation: 'slideUp 0.2s ease-out',
          fontFamily: 'monospace'
        }}>
          <div style={{
            color: '#00ff00',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '15px',
            textShadow: '0 0 10px #00ff00'
          }}>
            {commandPrefix === 'LOOKUP ' ? 'ENTER ACCOUNT NUMBER' : 'NUMBER PAD'}
          </div>
          
          {commandPrefix === 'LOOKUP ' && (
            <div style={{
              background: '#000000',
              border: '2px solid #00aa00',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '15px',
              textAlign: 'center',
              fontSize: '18px',
              fontFamily: 'monospace',
              color: '#00ff00',
              minHeight: '24px',
              letterSpacing: '2px'
            }}>
              {currentNumberInput || '_'}
            </div>
          )}
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '15px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => {
                  if (commandPrefix === 'LOOKUP ') {
                    // For account lookup, update the display state
                    const newValue = currentNumberInput + num.toString();
                    setCurrentNumberInput(newValue);
                    if (inputRef.current) {
                      inputRef.current.value = newValue;
                    }
                    setShowNumberPad(true);
                  } else if (inputRef.current) {
                    inputRef.current.value += num.toString();
                    inputRef.current.focus();
                    setShowNumberPad(true);
                  }
                  playSound('keypress');
                }}
                style={{
                  background: 'linear-gradient(145deg, rgba(0, 255, 0, 0.15), rgba(0, 255, 0, 0.05))',
                  border: '2px solid #00aa00',
                  borderRadius: '8px',
                  color: '#00ff00',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                  fontFamily: 'monospace',
                  textShadow: '0 0 5px #00ff00',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(145deg, rgba(0, 255, 0, 0.3), rgba(0, 255, 0, 0.2))';
                  e.currentTarget.style.boxShadow = 'inset 0 2px 5px rgba(0, 0, 0, 0.3)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(145deg, rgba(0, 255, 0, 0.15), rgba(0, 255, 0, 0.05))';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#00ff00';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#00aa00';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
              >
                {num}
              </button>
            ))}
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr 1fr',
            gap: '8px'
          }}>
            <button
              onClick={() => {
                if (commandPrefix === 'LOOKUP ') {
                  if (currentNumberInput.length > 0) {
                    const newValue = currentNumberInput.slice(0, -1);
                    setCurrentNumberInput(newValue);
                    if (inputRef.current) {
                      inputRef.current.value = newValue;
                    }
                  }
                } else if (inputRef.current && inputRef.current.value.length > 0) {
                  inputRef.current.value = inputRef.current.value.slice(0, -1);
                  inputRef.current.focus();
                }
                setShowNumberPad(true);
                playSound('keypress');
              }}
              style={{
                background: 'linear-gradient(145deg, rgba(255, 100, 0, 0.15), rgba(255, 100, 0, 0.05))',
                border: '2px solid #ff6600',
                borderRadius: '8px',
                color: '#ff6600',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '15px 8px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                fontFamily: 'monospace'
              }}
            >
              ⌫
            </button>
            
            <button
              onClick={() => {
                if (commandPrefix === 'LOOKUP ') {
                  const newValue = currentNumberInput + '0';
                  setCurrentNumberInput(newValue);
                  if (inputRef.current) {
                    inputRef.current.value = newValue;
                  }
                  setShowNumberPad(true);
                } else if (inputRef.current) {
                  inputRef.current.value += '0';
                  inputRef.current.focus();
                  setShowNumberPad(true);
                }
                playSound('keypress');
              }}
              style={{
                background: 'linear-gradient(145deg, rgba(0, 255, 0, 0.15), rgba(0, 255, 0, 0.05))',
                border: '2px solid #00aa00',
                borderRadius: '8px',
                color: '#00ff00',
                fontSize: '24px',
                fontWeight: 'bold',
                padding: '15px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                fontFamily: 'monospace',
                textShadow: '0 0 5px #00ff00'
              }}
            >
              0
            </button>
            
            <button
              onClick={() => {
                if (commandPrefix === 'LOOKUP ') {
                  // Play beautiful ASMR processing sound
                  playSound('legacy_processing');
                  setTimeout(() => {
                    // Process the lookup with the entered number
                    const fullCommand = 'LOOKUP ' + currentNumberInput;
                    console.log('Processing lookup command:', fullCommand);
                    console.log('Current customer:', currentCustomer);
                    handleCommand(fullCommand);
                    setShowNumberPad(false);
                    setCurrentNumberInput('');
                    setCommandPrefix('');
                  }, 100);
                } else {
                  submitCommand();
                  setShowNumberPad(false);
                }
              }}
              style={{
                background: 'linear-gradient(145deg, rgba(0, 255, 100, 0.35), rgba(0, 255, 100, 0.25))',
                border: '3px solid #00ff66',
                borderRadius: '12px',
                color: '#00ff66',
                fontSize: commandPrefix === 'LOOKUP ' ? '24px' : '16px',
                fontWeight: 'bold',
                padding: commandPrefix === 'LOOKUP ' ? '20px 12px' : '15px 8px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                fontFamily: 'monospace',
                textShadow: '0 0 12px #00ff66',
                boxShadow: '0 0 20px rgba(0, 255, 100, 0.5)',
                transform: commandPrefix === 'LOOKUP ' ? 'scale(1.1)' : 'scale(1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 100, 0.7)';
                e.currentTarget.style.transform = commandPrefix === 'LOOKUP ' ? 'scale(1.15)' : 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 100, 0.5)';
                e.currentTarget.style.transform = commandPrefix === 'LOOKUP ' ? 'scale(1.1)' : 'scale(1)';
              }}
            >
              {commandPrefix === 'LOOKUP ' ? '✓ LOOKUP' : '✓'}
            </button>
          </div>
        </div>
      )}

      {/* Westfield Police Department Arrest Animation */}
      {showArrestAnimation && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, #000011, #001100)',
            zIndex: 3000,
            overflow: 'hidden'
          }}
          ref={(el) => {
            if (el) {
              // Auto-close animation after 8 seconds
              setTimeout(() => {
                setShowArrestAnimation(false);
                setCurrentCustomer(generateCustomerLocal());
                setVerificationState({
                  accountLookedUp: false,
                  accountNotFound: false,
                  signatureCompared: false,
                  signatureFraud: false,
                  transactionProcessed: false
                });
                setTerminalOutput(prev => [...prev, 
                  "",
                  "> WESTFIELD PD: Suspect in custody",
                  "> Next customer approaching window",
                  "Ready to process transaction"
                ]);
              }, 8000);
            }
          }}
        >
          {/* Enhanced Police Response Scene */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: '0',
            right: '0',
            height: '40px',
            background: 'linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 100%)',
            borderTop: '2px solid #444'
          }} />
          
          {/* WESTFIELD PD ALERT */}
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ff3333',
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'alertFlash 1.5s infinite alternate',
            textShadow: '0 0 20px #ff3333',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            borderRadius: '8px',
            border: '3px solid #ff3333'
          }}>
            🚨 WESTFIELD POLICE DEPARTMENT 🚨<br/>
            FRAUD SUSPECT APPREHENDED
          </div>
          
          {/* Radio Dispatch */}
          <div style={{
            position: 'absolute',
            top: '140px',
            right: '20px',
            color: '#00ff88',
            fontSize: '14px',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.9)',
            padding: '12px',
            borderRadius: '6px',
            border: '2px solid #00ff88',
            animation: 'radioChatter 8s ease-in-out forwards',
            opacity: 0,
            maxWidth: '300px'
          }}>
            "Dispatch to Unit 23... suspect secured<br/>
            Location: Westridge Ledger Bank<br/>
            Crime: Attempted bank fraud<br/>
            Status: Perp walk in progress. Over."
          </div>
          
          {/* Lead Officer */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '20%',
            fontSize: '70px',
            animation: 'leadOfficer 8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))'
          }}>
            👮‍♂️
          </div>
          
          {/* Handcuffed Fraudster */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '45%',
            fontSize: '70px',
            animation: 'fraudsterWalk 8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))'
          }}>
            🧑‍💼
          </div>
          
          {/* Following Officer */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '70%',
            fontSize: '70px',
            animation: 'followOfficer 8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))'
          }}>
            👮‍♀️
          </div>
          
          {/* Handcuffs Visual */}
          <div style={{
            position: 'absolute',
            bottom: '130px',
            left: '45%',
            fontSize: '25px',
            animation: 'handcuffsShow 8s ease-in-out forwards',
            opacity: 0
          }}>
            🔗
          </div>
          
          {/* Police Vehicle */}
          <div style={{
            position: 'absolute',
            bottom: '210px',
            right: '-150px',
            fontSize: '80px',
            animation: 'policeVehicle 3s ease-out forwards',
            filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.5))'
          }}>
            🚔
          </div>
          
          {/* Unit Badge */}
          <div style={{
            position: 'absolute',
            bottom: '260px',
            right: '-120px',
            fontSize: '14px',
            color: '#ffffff',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.8)',
            padding: '5px 8px',
            borderRadius: '4px',
            animation: 'badgeShow 4s ease-out forwards',
            opacity: 0
          }}>
            WESTFIELD PD<br/>UNIT 23
          </div>
          
          {/* Arrest Announcement */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#00ff00',
            fontSize: '26px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'monospace',
            animation: 'successAnnounce 8s ease-in-out forwards',
            opacity: 0,
            textShadow: '0 0 15px #00ff00',
            background: 'rgba(0,0,0,0.8)',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '2px solid #00ff00'
          }}>
            FRAUD SUSPECT IN CUSTODY<br/>
            EXCELLENT DETECTIVE WORK, TELLER
          </div>
        </div>
      )}

      {/* Ad Break Overlay */}
      {showAdBreak && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          fontFamily: 'monospace'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #002200, #001100)',
            border: '3px solid #00ff00',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#00ff00',
            fontSize: '24px',
            fontWeight: 'bold',
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '20px' }}>📺 AD BREAK 📺</div>
            <div style={{ fontSize: '18px', marginBottom: '20px' }}>Thanks for playing Bank Teller 1988!</div>
            <div style={{ fontSize: '48px', color: '#ffff00', textShadow: '0 0 10px #ffff00' }}>{adCountdown}</div>
            <div style={{ fontSize: '14px', marginTop: '20px', color: '#888888' }}>Resuming in {adCountdown} seconds...</div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes alertFlash {
          0% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.05); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes radioChatter {
          0% { opacity: 0; transform: translateX(20px); }
          25% { opacity: 1; transform: translateX(0px); }
          75% { opacity: 1; transform: translateX(0px); }
          100% { opacity: 0.7; transform: translateX(0px); }
        }
        
        @keyframes leadOfficer {
          0% { left: -15%; transform: translateX(0); }
          25% { left: 20%; transform: translateX(0); }
          75% { left: 20%; transform: translateX(0); }
          100% { left: 120%; transform: translateX(0); }
        }
        
        @keyframes fraudsterWalk {
          0% { left: 45%; transform: translateX(-50%) rotate(0deg); }
          25% { left: 45%; transform: translateX(-50%) rotate(-3deg); }
          75% { left: 45%; transform: translateX(-50%) rotate(-3deg); }
          100% { left: 120%; transform: translateX(-50%) rotate(-3deg); }
        }
        
        @keyframes followOfficer {
          0% { left: 120%; transform: translateX(0); }
          25% { left: 70%; transform: translateX(0); }
          75% { left: 70%; transform: translateX(0); }
          100% { left: 120%; transform: translateX(0); }
        }
        
        @keyframes handcuffsShow {
          0% { opacity: 0; left: 45%; }
          25% { opacity: 1; left: 45%; }
          75% { opacity: 1; left: 45%; }
          100% { opacity: 1; left: 120%; }
        }
        
        @keyframes policeVehicle {
          0% { right: -150px; }
          100% { right: 30px; }
        }
        
        @keyframes badgeShow {
          0% { opacity: 0; right: -120px; }
          30% { opacity: 0; right: -120px; }
          50% { opacity: 1; right: -100px; }
          100% { opacity: 1; right: -100px; }
        }
        
        @keyframes successAnnounce {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          60% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          75% { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1.1); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
        }
        
        @keyframes successMessage {
          0% { opacity: 0; }
          70% { opacity: 0; }
          80% { opacity: 1; transform: translateX(-50%) scale(1.1); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes successMessage {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          70% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0px); }
        }
        
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
        
        @keyframes scanlineMove {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        
        @keyframes fadeInArrest {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        

      `}</style>





      {/* Warning Popup */}
      {showWarningPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.9)',
          border: '3px solid #ff0000',
          borderRadius: '8px',
          padding: '20px',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 3000,
          fontFamily: 'monospace',
          boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          ⚠️ {warningMessage} ⚠️
        </div>
      )}



      {/* Achievement Badge Popup */}
      {showBadgePopup && currentBadge && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 6000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeInBackground 0.5s ease-out'
        }}>
          <div style={{
            background: `linear-gradient(145deg, rgba(0, 20, 0, 0.98), rgba(0, 40, 0, 0.95))`,
            border: `6px solid ${currentBadge.color}`,
            borderRadius: '25px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '450px',
            width: '90%',
            boxShadow: `
              0 0 60px ${currentBadge.color}aa,
              inset 0 0 30px rgba(0, 255, 0, 0.1),
              0 20px 40px rgba(0, 0, 0, 0.7)
            `,
            animation: 'badgePopupEnhanced 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontFamily: 'monospace',
            backdropFilter: 'blur(10px)'
          }}>
          {/* Badge Icon */}
          <div style={{
            fontSize: '80px',
            marginBottom: '15px',
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))',
            animation: 'badgeGlow 2s ease-in-out infinite alternate'
          }}>
            {currentBadge.icon}
          </div>
          
          {/* Achievement Title */}
          <div style={{
            color: currentBadge.color,
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '10px',
            textShadow: `0 0 15px ${currentBadge.color}`,
            letterSpacing: '1px'
          }}>
            ACHIEVEMENT UNLOCKED!
          </div>
          
          {/* Badge Name */}
          <div style={{
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '8px',
            textShadow: '0 0 10px rgba(255,255,255,0.8)'
          }}>
            {currentBadge.name}
          </div>
          
          {/* Badge Tier */}
          <div style={{
            color: currentBadge.color,
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            padding: '4px 12px',
            border: `2px solid ${currentBadge.color}`,
            borderRadius: '20px',
            display: 'inline-block',
            background: `${currentBadge.color}22`
          }}>
            {currentBadge.tier.toUpperCase()} TIER
          </div>
          
          {/* Badge Description */}
          <div style={{
            color: '#cccccc',
            fontSize: '16px',
            lineHeight: '1.4',
            marginBottom: '20px'
          }}>
            {currentBadge.description}
          </div>
          
          {/* Sparkle Effects */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '20px',
            fontSize: '20px',
            animation: 'sparkle1 1.5s ease-in-out infinite'
          }}>✨</div>
          <div style={{
            position: 'absolute',
            bottom: '15px',
            left: '25px',
            fontSize: '16px',
            animation: 'sparkle2 1.8s ease-in-out infinite'
          }}>⭐</div>
          <div style={{
            position: 'absolute',
            top: '25px',
            left: '15px',
            fontSize: '14px',
            animation: 'sparkle3 2.1s ease-in-out infinite'
          }}>💫</div>
          
          {/* Progress Indicator */}
          <div style={{
            color: '#888888',
            fontSize: '12px',
            marginTop: '10px'
          }}>
            Achievement unlocked!
          </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes badgePopup {
          0% { 
            transform: translateX(-50%) scale(0.3) rotate(-10deg);
            opacity: 0;
          }
          50% { 
            transform: translateX(-50%) scale(1.1) rotate(5deg);
            opacity: 0.8;
          }
          100% { 
            transform: translateX(-50%) scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes badgeGlow {
          0% { 
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)) brightness(1);
          }
          100% { 
            filter: drop-shadow(0 0 20px rgba(255,255,255,0.8)) brightness(1.2);
          }
        }
        
        @keyframes sparkle1 {
          0%, 100% { opacity: 0; transform: rotate(0deg) scale(0.8); }
          50% { opacity: 1; transform: rotate(180deg) scale(1.2); }
        }
        
        @keyframes sparkle2 {
          0%, 100% { opacity: 0; transform: rotate(0deg) scale(0.6); }
          50% { opacity: 1; transform: rotate(-180deg) scale(1.1); }
        }
        
        @keyframes sparkle3 {
          0%, 100% { opacity: 0; transform: rotate(0deg) scale(0.7); }
          50% { opacity: 1; transform: rotate(360deg) scale(1.3); }
        }
        
        @keyframes sparkle {
          0% { 
            background: rgba(0, 150, 0, 0.8);
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.8), inset 0 0 20px rgba(0, 255, 0, 0.2);
            transform: scale(1);
          }
          50% { 
            background: rgba(0, 200, 0, 1);
            box-shadow: 0 0 30px rgba(0, 255, 0, 1), inset 0 0 30px rgba(0, 255, 0, 0.4);
            transform: scale(1.02);
          }
          100% { 
            background: rgba(0, 150, 0, 0.8);
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.8), inset 0 0 20px rgba(0, 255, 0, 0.2);
            transform: scale(1);
          }
        }
        
        @keyframes drawerSlide {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes billFloat {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        .cash-drawer {
          animation: drawerSlide 0.5s ease-out;
        }
        
        .bill-draggable {
          transition: all 0.2s ease;
          cursor: grab;
          user-select: none;
        }
        
        .bill-draggable:hover {
          animation: billFloat 0.3s ease-in-out;
          transform: scale(1.08) !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6) !important;
        }
        
        .bill-dragging {
          cursor: grabbing !important;
          z-index: 10000 !important;
          transform: rotate(8deg) scale(1.15) !important;
          opacity: 0.8 !important;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.8) !important;
        }
      `}</style>

      {/* Cash drawer functionality removed for app store deployment */}
      {false && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: '15px',
          overflow: 'hidden'
        }}>
          <div className="cash-drawer" style={{
            background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
            border: '4px solid #333333',
            borderRadius: '20px',
            padding: '20px',
            width: '100%',
            maxWidth: '1000px',
            height: '100%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(0, 255, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Header with Real-time Counter */}
            <div style={{
              background: 'linear-gradient(90deg, #001100, #003300)',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '3px solid #00ff00',
              boxShadow: '0 0 25px rgba(0, 255, 0, 0.3)'
            }}>
              <div style={{
                color: '#00ff00',
                fontSize: '16px',
                fontWeight: 'bold',
                textShadow: '0 0 10px #00ff00',
                marginBottom: '8px'
              }}>
                🏦 CASH DRAWER - WITHDRAWAL REQUEST 🏦
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{
                  color: '#ffff00',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  REQUESTED: ${cashDrawerAmount.toLocaleString()}
                </div>
                <div style={{
                  color: totalCounted > 0 ? '#00ff00' : '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  COUNTER: ${totalCounted.toLocaleString()}
                </div>
                <div style={{
                  color: totalCounted === cashDrawerAmount ? '#00ff00' : '#ff8800',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  REMAINING: ${Math.max(0, cashDrawerAmount - totalCounted).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Main Workflow: Drawer -> Counter -> Envelope */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '3fr 2fr 2fr',
              gap: '20px',
              marginBottom: '20px',
              height: '400px'
            }}>
              
              {/* Left: Cash Drawer with Neon Bills */}
              <div style={{
                background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)',
                border: '3px solid #333333',
                borderRadius: '15px',
                padding: '15px',
                overflow: 'auto',
                boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.8)'
              }}>
                <div style={{
                  color: '#00ff00',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '15px',
                  textAlign: 'center',
                  textShadow: '0 0 8px #00ff00'
                }}>
                  💰 CASH DRAWER 💰
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px'
                }}>
                  {[100, 50, 20, 10, 5, 1].map(denom => {
                    const billCount = cashSupply[denom] || 0;
                    
                    return (
                      <div key={denom} style={{
                        background: 'linear-gradient(145deg, #222222, #111111)',
                        border: '2px solid #444444',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                        minHeight: '120px'
                      }}>
                        <div style={{
                          color: getBillColor(denom),
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginBottom: '5px',
                          textShadow: `0 0 6px ${getBillColor(denom)}`
                        }}>
                          ${denom}
                        </div>
                        
                        <div style={{
                          color: '#cccccc',
                          fontSize: '10px',
                          marginBottom: '8px'
                        }}>
                          Stock: {billCount}
                        </div>
                        
                        {/* Draggable Bills */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          {Array.from({length: Math.min(billCount, 5)}, (_, i) => (
                            <div 
                              key={i}
                              className="bill-draggable"
                              draggable
                              onDragStart={(e) => {
                                playSound('paper_rustle');
                                setDraggingBill(denom);
                                e.dataTransfer.setData('text/plain', JSON.stringify({
                                  denomination: denom,
                                  source: 'drawer',
                                  id: `${denom}_${Date.now()}_${Math.random()}`
                                }));
                                e.currentTarget.classList.add('bill-dragging');
                              }}
                              onDragEnd={(e) => {
                                setDraggingBill(null);
                                e.currentTarget.classList.remove('bill-dragging');
                              }}
                              style={{
                                width: '120px',
                                height: '50px',
                                background: `linear-gradient(135deg, ${getBillColor(denom)}, ${adjustBrightness(getBillColor(denom), -20)})`,
                                border: `2px solid ${adjustBrightness(getBillColor(denom), 30)}`,
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#000000',
                                cursor: billCount > 0 ? 'grab' : 'not-allowed',
                                opacity: billCount > 0 ? 1 : 0.3,
                                marginTop: i > 0 ? '-22px' : '0',
                                zIndex: 10 - i,
                                boxShadow: `0 1px 4px rgba(0, 0, 0, 0.4), 0 0 6px ${getBillColor(denom)}40`,
                                textShadow: '1px 1px 1px rgba(255, 255, 255, 0.8)'
                              }}
                            >
                              ${denom}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Center: Counter Area */}
              <div 
                style={{
                  background: 'linear-gradient(145deg, #2a2a1a, #1a1a0a)',
                  border: '3px solid #ffff00',
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative',
                  boxShadow: '0 0 20px rgba(255, 255, 0, 0.3)'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = 'linear-gradient(145deg, #3a3a2a, #2a2a1a)';
                  e.currentTarget.style.borderColor = '#ffff66';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(145deg, #2a2a1a, #1a1a0a)';
                  e.currentTarget.style.borderColor = '#ffff00';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = 'linear-gradient(145deg, #2a2a1a, #1a1a0a)';
                  e.currentTarget.style.borderColor = '#ffff00';
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.source === 'drawer' && totalCounted + data.denomination <= cashDrawerAmount) {
                      playSound('cash_register');
                      updateCashSupply(data.denomination, -1);
                      setTotalCounted(prev => prev + data.denomination);
                      setCounterBills(prev => [...prev, data.denomination]);
                    }
                  } catch (error) {
                    console.error('Drop error:', error);
                  }
                }}
              >
                <div style={{
                  color: '#ffff00',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: '10px',
                  textShadow: '0 0 6px #ffff00'
                }}>
                  ⚖️ COUNTER ⚖️
                </div>
                
                <div style={{
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'center',
                  marginBottom: '10px'
                }}>
                  Drop bills here
                </div>
                
                {/* Bills on Counter */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '3px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '80px'
                }}>
                  {counterBills.map((denom, index) => (
                    <div
                      key={index}
                      className="bill-draggable"
                      draggable
                      onDragStart={(e) => {
                        playSound('paper_rustle');
                        e.dataTransfer.setData('text/plain', JSON.stringify({
                          source: 'counter',
                          index: index,
                          denomination: denom
                        }));
                        e.currentTarget.classList.add('bill-dragging');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('bill-dragging');
                      }}
                      style={{
                        width: '100px',
                        height: '40px',
                        background: `linear-gradient(135deg, ${getBillColor(denom)}, ${adjustBrightness(getBillColor(denom), -15)})`,
                        border: `2px solid ${adjustBrightness(getBillColor(denom), 20)}`,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#000000',
                        cursor: 'grab',
                        boxShadow: `0 2px 4px rgba(0, 0, 0, 0.4), 0 0 4px ${getBillColor(denom)}60`,
                        textShadow: '1px 1px 1px rgba(255, 255, 255, 0.7)',
                        transform: `rotate(${(index % 5 - 2) * 3}deg)`,
                        margin: '2px'
                      }}
                    >
                      ${denom}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Right: Customer Envelope */}
              <div 
                style={{
                  background: envelopeSealed ? 
                    'linear-gradient(145deg, #1a2a1a, #0a1a0a)' : 
                    'linear-gradient(145deg, #2a1a1a, #1a0a0a)',
                  border: envelopeSealed ? 
                    '3px solid #00ff00' : 
                    '3px solid #ff4444',
                  borderRadius: '12px',
                  padding: '15px',
                  position: 'relative',
                  boxShadow: envelopeSealed ? 
                    '0 0 20px rgba(0, 255, 0, 0.3)' : 
                    '0 0 20px rgba(255, 68, 68, 0.3)'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!envelopeSealed) {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #3a2a2a, #2a1a1a)';
                    e.currentTarget.style.borderColor = '#ff6666';
                  }
                }}
                onDragLeave={(e) => {
                  if (!envelopeSealed) {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #2a1a1a, #1a0a0a)';
                    e.currentTarget.style.borderColor = '#ff4444';
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!envelopeSealed) {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #2a1a1a, #1a0a0a)';
                    e.currentTarget.style.borderColor = '#ff4444';
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                      if (data.source === 'counter') {
                        playSound('paper_rustle');
                        const denom = counterBills[data.index];
                        setCounterBills(prev => prev.filter((_, i) => i !== data.index));
                        setEnvelopeBills(prev => [...prev, denom]);
                      }
                    } catch (error) {
                      console.error('Envelope drop error:', error);
                    }
                  }
                }}
              >
                <div style={{
                  color: envelopeSealed ? '#00ff00' : '#ff4444',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: '10px',
                  textShadow: envelopeSealed ? '0 0 6px #00ff00' : '0 0 6px #ff4444'
                }}>
                  {envelopeSealed ? '✅ SEALED' : '📮 ENVELOPE'}
                </div>
                
                {!envelopeSealed && (
                  <div style={{
                    color: '#cccccc',
                    fontSize: '10px',
                    textAlign: 'center',
                    marginBottom: '10px'
                  }}>
                    Drop from counter
                  </div>
                )}
                
                {/* Bills in Envelope */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '80px',
                  opacity: envelopeSealed ? 0.7 : 1
                }}>
                  {envelopeBills.map((denom, index) => (
                    <div
                      key={index}
                      style={{
                        width: '80px',
                        height: '32px',
                        background: `linear-gradient(135deg, ${getBillColor(denom)}, ${adjustBrightness(getBillColor(denom), -10)})`,
                        border: `2px solid ${adjustBrightness(getBillColor(denom), 15)}`,
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#000000',
                        boxShadow: `0 2px 3px rgba(0, 0, 0, 0.3), 0 0 3px ${getBillColor(denom)}50`,
                        textShadow: '1px 1px 1px rgba(255, 255, 255, 0.6)',
                        transform: `rotate(${(index % 3 - 1) * 2}deg)`,
                        margin: '1px'
                      }}
                    >
                      ${denom}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Control Panel with SEAL ENVELOPE Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '15px',
              padding: '15px',
              background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
              border: '3px solid #444444',
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(68, 68, 68, 0.3)'
            }}>
              
              {/* Summary Display */}
              <div style={{
                color: '#00ff00',
                fontSize: '14px',
                fontWeight: 'bold',
                textShadow: '0 0 8px #00ff00'
              }}>
                Envelope Total: ${envelopeBills.reduce((sum, denom) => sum + denom, 0).toLocaleString()}
              </div>
              
              {/* SEAL ENVELOPE Button */}
              <button
                onClick={() => {
                  if (envelopeBills.length > 0 && !envelopeSealed) {
                    // ASMR envelope sealing sounds
                    playSound('paper_rustle');
                    setTimeout(() => {
                      // Create envelope sealing sound effect
                      try {
                        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                        
                        // Sticky peel sound
                        const oscillator1 = audioContext.createOscillator();
                        const gainNode1 = audioContext.createGain();
                        oscillator1.connect(gainNode1);
                        gainNode1.connect(audioContext.destination);
                        oscillator1.frequency.setValueAtTime(200, audioContext.currentTime);
                        oscillator1.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.3);
                        gainNode1.gain.setValueAtTime(0.1, audioContext.currentTime);
                        gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                        oscillator1.start();
                        oscillator1.stop(audioContext.currentTime + 0.3);
                        
                        // Firm press sound
                        setTimeout(() => {
                          const oscillator2 = audioContext.createOscillator();
                          const gainNode2 = audioContext.createGain();
                          oscillator2.connect(gainNode2);
                          gainNode2.connect(audioContext.destination);
                          oscillator2.frequency.setValueAtTime(80, audioContext.currentTime);
                          gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime);
                          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                          oscillator2.start();
                          oscillator2.stop(audioContext.currentTime + 0.2);
                        }, 300);
                        
                      } catch (error) {
                        console.log("Envelope sealing audio not available:", error);
                      }
                    }, 200);
                    
                    setEnvelopeSealed(true);
                    
                    // Check if amount matches requested amount
                    const envelopeTotal = envelopeBills.reduce((sum, denom) => sum + denom, 0);
                    if (envelopeTotal === cashDrawerAmount) {
                      playSound('completion_bell');
                      setTimeout(() => {
                        setShowCashDrawer(false);
                        setEnvelopeSealed(false);
                        setEnvelopeBills([]);
                        setCounterBills([]);
                        setTotalCounted(0);
                        
                        // Complete the withdrawal transaction
                        addCorrectTransaction();
                      }, 1000);
                    }
                  }
                }}
                disabled={envelopeBills.length === 0 || envelopeSealed}
                style={{
                  background: (envelopeBills.length > 0 && !envelopeSealed) 
                    ? 'linear-gradient(145deg, #006600, #004400)' 
                    : '#333333',
                  color: (envelopeBills.length > 0 && !envelopeSealed) 
                    ? '#00ff00' 
                    : '#666666',
                  border: '3px solid ' + ((envelopeBills.length > 0 && !envelopeSealed) 
                    ? '#00ff00' 
                    : '#555555'),
                  borderRadius: '12px',
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (envelopeBills.length > 0 && !envelopeSealed) 
                    ? 'pointer' 
                    : 'not-allowed',
                  fontFamily: 'monospace',
                  textShadow: (envelopeBills.length > 0 && !envelopeSealed) 
                    ? '0 0 10px #00ff00' 
                    : 'none',
                  boxShadow: (envelopeBills.length > 0 && !envelopeSealed) 
                    ? '0 0 20px rgba(0, 255, 0, 0.4)' 
                    : 'none'
                }}
              >
                {envelopeSealed ? '✅ ENVELOPE SEALED' : '📮 SEAL ENVELOPE'}
              </button>
              
              {/* Reset Button */}
              <button
                onClick={() => {
                  playSound('paper_rustle');
                  setCounterBills([]);
                  setEnvelopeBills([]);
                  setEnvelopeSealed(false);
                  setTotalCounted(0);
                  
                  // Reset cash supply
                  setCashSupply({
                    100: 50, 50: 50, 20: 50, 10: 50, 5: 50, 1: 50
                  });
                }}
                style={{
                  background: 'linear-gradient(145deg, #552200, #331100)',
                  border: '3px solid #cc8800',
                  color: '#ffaa00',
                  padding: '15px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                🔄 RESET
              </button>
            </div>

            {/* Close Cash Drawer Button */}
            <div style={{
              textAlign: 'center',
              marginTop: '15px'
            }}>
              <button
                onClick={() => {
                  playSound('drawer_close');
                  setTimeout(() => {
                    setShowCashDrawer(false);
                    setEnvelopeSealed(false);
                    setEnvelopeBills([]);
                    setCounterBills([]);
                    setTotalCounted(0);
                  }, 300);
                }}
                style={{
                  background: 'linear-gradient(145deg, #aa0000, #660000)',
                  border: '3px solid #ff0000',
                  color: '#ff4444',
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  textShadow: '0 0 10px #ff4444',
                  boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)'
                }}
              >
                ❌ CLOSE DRAWER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Printer System */}
      {showPrinter && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 8000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #2a2a1a, #1a1a0a)',
            border: '4px solid #cc8800',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '500px',
            height: '80%',
            boxShadow: '0 0 50px rgba(204, 136, 0, 0.5), inset 0 0 30px rgba(204, 136, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #004400, #006600)',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '3px solid #00ff00',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
            }}>
              <div style={{
                color: '#00ff00',
                fontSize: '20px',
                fontWeight: 'bold',
                textShadow: '0 0 10px #00ff00'
              }}>
                WESTRIDGE LEDGER BANK DOT MATRIX PRINTER
              </div>
            </div>
            
            <div style={{
              background: 'linear-gradient(145deg, #0a2a0a, #052a05)',
              border: '4px solid #00cc00',
              borderRadius: '15px',
              padding: '20px',
              height: 'calc(100% - 120px)',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#00ff00',
              overflow: 'auto',
              whiteSpace: 'pre-line',
              textShadow: '0 0 2px #00ff00'
            }}>
              {receiptContent || "No receipt content"}
            </div>
            
            <button
              onClick={() => setShowPrinter(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'linear-gradient(145deg, #440000, #220000)',
                border: '2px solid #cc0000',
                color: '#ff4444',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Cash Drawer System */}
      {showCashDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 7000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a2a1a, #0a1a0a)',
            border: '4px solid #cc8800',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            maxHeight: '600px',
            boxShadow: '0 0 50px rgba(204, 136, 0, 0.5), inset 0 0 30px rgba(204, 136, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #004400, #006600)',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '3px solid #00ff00',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
            }}>
              <div style={{
                color: '#00ff00',
                fontSize: '20px',
                fontWeight: 'bold',
                textShadow: '0 0 10px #00ff00'
              }}>
                CASH DRAWER - COUNT ${cashDrawerAmount}
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px',
              height: 'calc(100% - 200px)',
              marginBottom: '20px'
            }}>
              {[1, 5, 10, 20, 50, 100].map(denomination => (
                <div key={denomination} style={{
                  background: `linear-gradient(145deg, #${denomination === 1 ? '4a5d23' : denomination === 5 ? '5d4a23' : denomination === 10 ? '4a4a5d' : denomination === 20 ? '5d5d23' : denomination === 50 ? '5d235d' : '235d23'}, #${denomination === 1 ? '2a3d13' : denomination === 5 ? '3d2a13' : denomination === 10 ? '2a2a3d' : denomination === 20 ? '3d3d13' : denomination === 50 ? '3d133d' : '133d13'})`,
                  border: `3px solid #${denomination === 1 ? '88bb44' : denomination === 5 ? 'bb8844' : denomination === 10 ? '8888bb' : denomination === 20 ? 'bbbb44' : denomination === 50 ? 'bb44bb' : '44bb44'}`,
                  borderRadius: '15px',
                  padding: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  minHeight: '120px'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textShadow: '0 0 5px rgba(255,255,255,0.5)'
                  }}>
                    ${denomination}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                    flex: 1,
                    width: '100%'
                  }}>
                    {Array.from({length: Math.min(5, Math.floor(200 / denomination))}, (_, i) => (
                      <div
                        key={`${denomination}-${i}`}
                        draggable
                        onDragStart={(e) => {
                          const billId = `${denomination}-${Date.now()}-${Math.random()}`;
                          setDraggingBill(denomination);
                          e.dataTransfer.setData('text/plain', JSON.stringify({denomination, id: billId}));
                          playSound('bill_rustle');
                          e.currentTarget.style.opacity = '0.5';
                        }}
                        onDragEnd={(e) => {
                          setDraggingBill(null);
                          e.currentTarget.style.opacity = '1';
                        }}
                        style={{
                          width: '60px',
                          height: '25px',
                          background: `linear-gradient(90deg, #${denomination === 1 ? '88bb44' : denomination === 5 ? 'bb8844' : denomination === 10 ? '8888bb' : denomination === 20 ? 'bbbb44' : denomination === 50 ? 'bb44bb' : '44bb44'}, #${denomination === 1 ? 'aaddaa' : denomination === 5 ? 'ddaaaa' : denomination === 10 ? 'aaaadd' : denomination === 20 ? 'ddddaa' : denomination === 50 ? 'ddaadd' : 'aaddaa'})`,
                          border: `2px solid #${denomination === 1 ? 'aaddaa' : denomination === 5 ? 'ddaaaa' : denomination === 10 ? 'aaaadd' : denomination === 20 ? 'ddddaa' : denomination === 50 ? 'ddaadd' : 'aaddaa'}`,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: '#000000',
                          cursor: 'grab',
                          transform: `translateY(${i * -2}px)`,
                          zIndex: 10 - i,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = `translateY(${i * -2 - 3}px) scale(1.05)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = `translateY(${i * -2}px) scale(1)`;
                        }}
                      >
                        ${denomination}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              background: 'linear-gradient(145deg, #0a2a0a, #052a05)',
              border: '4px solid #00cc00',
              borderRadius: '15px',
              padding: '20px',
              minHeight: '100px',
              position: 'relative',
              boxShadow: 'inset 0 0 20px rgba(0, 204, 0, 0.2)',
              overflow: 'hidden'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = 'linear-gradient(145deg, #0a3a0a, #053a05)';
              e.currentTarget.style.boxShadow = 'inset 0 0 30px rgba(0, 255, 0, 0.4)';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #0a2a0a, #052a05)';
              e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0, 204, 0, 0.2)';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = 'linear-gradient(145deg, #0a2a0a, #052a05)';
              e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0, 204, 0, 0.2)';
              
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                setBillsOnCounter(prev => [...prev, {
                  id: data.id,
                  denomination: data.denomination,
                  x: Math.max(0, Math.min(x - 30, rect.width - 60)),
                  y: Math.max(0, Math.min(y - 12, rect.height - 25))
                }]);
                
                setTotalCounted(prev => prev + data.denomination);
                playSound('bill_rustle');
                playSound('cash_register');
              } catch (err) {
                console.error('Error handling bill drop:', err);
              }
            }}>
              <div style={{
                color: '#00ff00',
                fontSize: '14px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '10px',
                textShadow: '0 0 5px #00ff00'
              }}>
                COUNTING SURFACE - DRAG BILLS HERE
              </div>
              
              {billsOnCounter.map((bill, index) => (
                <div
                  key={bill.id}
                  style={{
                    position: 'absolute',
                    left: bill.x,
                    top: bill.y + 30,
                    width: '60px',
                    height: '25px',
                    background: `linear-gradient(90deg, #${bill.denomination === 1 ? '88bb44' : bill.denomination === 5 ? 'bb8844' : bill.denomination === 10 ? '8888bb' : bill.denomination === 20 ? 'bbbb44' : bill.denomination === 50 ? 'bb44bb' : '44bb44'}, #${bill.denomination === 1 ? 'aaddaa' : bill.denomination === 5 ? 'ddaaaa' : bill.denomination === 10 ? 'aaaadd' : bill.denomination === 20 ? 'ddddaa' : bill.denomination === 50 ? 'ddaadd' : 'aaddaa'})`,
                    border: `2px solid #${bill.denomination === 1 ? 'aaddaa' : bill.denomination === 5 ? 'ddaaaa' : bill.denomination === 10 ? 'aaaadd' : bill.denomination === 20 ? 'ddddaa' : bill.denomination === 50 ? 'ddaadd' : 'aaddaa'}`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#000000',
                    cursor: 'pointer',
                    zIndex: index + 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    transform: `rotate(${(index % 7 - 3) * 5}deg)`
                  }}
                  onClick={() => {
                    setBillsOnCounter(prev => prev.filter(b => b.id !== bill.id));
                    setTotalCounted(prev => prev - bill.denomination);
                    playSound('bill_rustle');
                  }}
                >
                  ${bill.denomination}
                </div>
              ))}
              
              {billsOnCounter.length === 0 && (
                <div style={{
                  color: '#666666',
                  fontSize: '12px',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  marginTop: '20px'
                }}>
                  Drop bills here to count them
                </div>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              padding: '15px',
              background: 'linear-gradient(145deg, #003300, #001100)',
              border: '3px solid #00aa00',
              borderRadius: '10px'
            }}>
              <div style={{
                color: totalCounted === cashDrawerAmount ? '#00ff00' : totalCounted > cashDrawerAmount ? '#ff4444' : '#ffaa00',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: `0 0 10px ${totalCounted === cashDrawerAmount ? '#00ff00' : totalCounted > cashDrawerAmount ? '#ff4444' : '#ffaa00'}`
              }}>
                COUNTED: ${totalCounted} / REQUIRED: ${cashDrawerAmount}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {totalCounted === cashDrawerAmount && (
                  <button
                    onClick={() => {
                      playSound('cash_register');
                      playSound('success');
                      playSound('correct');
                      setTerminalOutput(prev => [...prev, 
                        `> CASH COUNT VERIFIED: $${totalCounted}`,
                        "> TRANSACTION APPROVED",
                        "> DRAWER SECURED"
                      ]);
                      
                      handleCorrectTransaction();
                      setShowCashDrawer(false);
                      setCashDrawerOpen(false);
                      setBillsOnCounter([]);
                      setTotalCounted(0);
                      playSound('drawer_close');
                    }}
                    style={{
                      background: 'linear-gradient(145deg, #004400, #002200)',
                      border: '2px solid #00aa00',
                      color: '#00ff00',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
                    }}
                  >
                    ✓ CONFIRM COUNT
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setBillsOnCounter([]);
                    setTotalCounted(0);
                    playSound('bill_rustle');
                  }}
                  style={{
                    background: 'linear-gradient(145deg, #444400, #222200)',
                    border: '2px solid #aaaa00',
                    color: '#ffff00',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  CLEAR
                </button>
                
                <button
                  onClick={() => {
                    setShowCashDrawer(false);
                    setCashDrawerOpen(false);
                    setBillsOnCounter([]);
                    setTotalCounted(0);
                    playSound('drawer_close');
                    setTerminalOutput(prev => [...prev, 
                      "> CASH DRAWER CLOSED",
                      "> TRANSACTION CANCELLED"
                    ]);
                  }}
                  style={{
                    background: 'linear-gradient(145deg, #440000, #220000)',
                    border: '2px solid #aa0000',
                    color: '#ff4444',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowCashDrawer(false);
                setCashDrawerOpen(false);
                setBillsOnCounter([]);
                setTotalCounted(0);
                playSound('drawer_close');
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'linear-gradient(145deg, #440000, #220000)',
                border: '2px solid #cc0000',
                color: '#ff4444',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      


    </div>
  );
}

export default App;