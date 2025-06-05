import React, { useState, useRef, useEffect } from 'react';
import { analyzeSignature, generateCustomer } from './lib/customers';
import type { Customer, Document as GameDocument } from './types/game';

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
    consecutiveErrors: 0,
    errorDetails: [] as string[],
    customersCalledWithoutService: 0,
    dismissalWarningGiven: false
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

  // Enhanced error tracking and scoring system
  const addCorrectTransaction = () => {
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
        dismissalWarningGiven: false // Reset warning flag
      };
    });
    
    // Check if ad should be shown every 5 customers
    setCustomersServed(prev => {
      const newCount = prev + 1;
      if (newCount % 5 === 0) {
        showInterstitialAd();
      }
      return newCount;
    });
  };

  // Google AdMob Integration for iOS Monetization
  const [admobInitialized, setAdmobInitialized] = useState(false);
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const [isRewardedAdLoaded, setIsRewardedAdLoaded] = useState(false);

  // Initialize Google AdMob
  useEffect(() => {
    const initializeAdMob = () => {
      // Check if running in iOS app environment
      if (window.webkit && window.webkit.messageHandlers) {
        // Initialize AdMob for iOS
        window.webkit.messageHandlers.admob?.postMessage({
          action: 'initialize',
          appId: 'ca-app-pub-3940256099942544~1458002511', // Test App ID for development
          testDeviceIds: ['2077ef9a63d2b398840261c8221a0c9b'] // Test device ID
        });
        
        // Set up ad event listeners
        window.admobEvents = {
          onInterstitialLoaded: () => setIsInterstitialLoaded(true),
          onInterstitialFailedToLoad: () => setIsInterstitialLoaded(false),
          onRewardedAdLoaded: () => setIsRewardedAdLoaded(true),
          onRewardedAdFailedToLoad: () => setIsRewardedAdLoaded(false),
          onRewardedAdRewarded: () => {
            // Give player bonus for watching ad
            setGameScore(prev => ({
              ...prev,
              score: prev.score + 50
            }));
          }
        };
        
        setAdmobInitialized(true);
      } else {
        // Fallback for web testing
        console.log('AdMob: Running in web environment, using test mode');
        setAdmobInitialized(true);
        setIsInterstitialLoaded(true);
        setIsRewardedAdLoaded(true);
      }
    };

    initializeAdMob();
  }, []);

  // Load interstitial ad
  const loadInterstitialAd = () => {
    if (window.webkit && window.webkit.messageHandlers.admob) {
      window.webkit.messageHandlers.admob.postMessage({
        action: 'loadInterstitial',
        adUnitId: 'ca-app-pub-3940256099942544/4411468910' // Test Interstitial Ad Unit ID
      });
    }
  };

  // Show interstitial ad every 5 customers
  const showInterstitialAd = () => {
    if (isInterstitialLoaded) {
      if (window.webkit && window.webkit.messageHandlers.admob) {
        window.webkit.messageHandlers.admob.postMessage({
          action: 'showInterstitial'
        });
      } else {
        // Fallback for web testing
        showAdBreakScreen();
      }
      setIsInterstitialLoaded(false);
      // Load next ad
      setTimeout(loadInterstitialAd, 1000);
    }
  };

  // Load rewarded ad
  const loadRewardedAd = () => {
    if (window.webkit && window.webkit.messageHandlers.admob) {
      window.webkit.messageHandlers.admob.postMessage({
        action: 'loadRewarded',
        adUnitId: 'ca-app-pub-3940256099942544/1712485313' // Test Rewarded Ad Unit ID
      });
    }
  };

  // Show rewarded ad for bonus points
  const showRewardedAd = () => {
    if (isRewardedAdLoaded) {
      if (window.webkit && window.webkit.messageHandlers.admob) {
        window.webkit.messageHandlers.admob.postMessage({
          action: 'showRewarded'
        });
      }
      setIsRewardedAdLoaded(false);
      // Load next ad
      setTimeout(loadRewardedAd, 1000);
    }
  };

  // Fallback ad break screen for web testing
  const showAdBreakScreen = () => {
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

  // Load ads when AdMob is initialized
  useEffect(() => {
    if (admobInitialized) {
      loadInterstitialAd();
      loadRewardedAd();
    }
  }, [admobInitialized]);



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
  const [showAdBreak, setShowAdBreak] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [customersServed, setCustomersServed] = useState(0);
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [numberPadPosition, setNumberPadPosition] = useState({ x: 0, y: 0 });
  const [isTerminated, setIsTerminated] = useState(false);
  const [currentNumberInput, setCurrentNumberInput] = useState('');
  const [showWireInput, setShowWireInput] = useState(false);
  const [wireAmount, setWireAmount] = useState('');
  const [wireDestAccount, setWireDestAccount] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const [musicMuted, setMusicMuted] = useState(true); // Start muted by default

  const generateCustomerLocal = (): Customer => {
    // Use the centralized customer generation from customers.ts to ensure unique account numbers
    return generateCustomer(1); // Use level 1 for consistent generation
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
      setCurrentCustomer(generateCustomerLocal());
    }
  }, [gamePhase, currentCustomer, gameInitialized]);

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
          // Enhanced mechanical keyboard with medium hardness ASMR
          createTone(1200 + Math.random() * 400, 0.015, 0.04);
          createTone(800 + Math.random() * 200, 0.008, 0.025);
          createNoise(0.012, 0.015);
          setTimeout(() => createTone(600, 0.006, 0.015), 8);
          setTimeout(() => createNoise(0.004, 0.008), 12);
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
          // Enhanced ASMR dot matrix printer with authentic mechanical sounds - shortened
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              // Main printer head impact
              createTone(1600 + (i % 4) * 150, 0.025, 0.04);
              createTone(1200 + (i % 3) * 100, 0.015, 0.03);
              // Mechanical noise and paper feed
              createNoise(0.018, 0.025);
              // Carriage movement
              if (i % 4 === 0) createTone(800, 0.008, 0.02);
            }, i * 50);
          }
          // Paper tear sound at the end
          setTimeout(() => {
            createNoise(0.15, 0.08);
            createTone(400, 0.06, 0.04);
            setTimeout(() => createNoise(0.08, 0.05), 60);
          }, 10 * 50 + 150);
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
          // Play authentic dot matrix printer for 10 seconds
          try {
            const printerAudio = new Audio('/dot-matrix-printer.mp3');
            printerAudio.volume = 0.6;
            printerAudio.currentTime = 0;
            printerAudio.play().catch(e => {
              console.log('Dot matrix audio play failed:', e);
              // Fallback to synthesized printer sound
              for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                  createTone(1600 + (i % 4) * 150, 0.025, 0.04);
                  createNoise(0.018, 0.025);
                }, i * 50);
              }
            });
            // Stop after 10 seconds
            setTimeout(() => {
              printerAudio.pause();
              printerAudio.currentTime = 0;
            }, 10000);
          } catch (e) {
            console.log('Dot matrix audio creation failed:', e);
            // Fallback synthesized sound
            for (let i = 0; i < 15; i++) {
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
            if (currentCustomer.suspiciousLevel > 0) {
              setVerificationState(prev => ({...prev, accountLookedUp: false, accountNotFound: true}));
              setTerminalOutput(prev => [...prev, 
                "> LOOKUP " + accountNum,
                "❌❌❌ ACCOUNT NOT FOUND ❌❌❌",
                "STATUS: INVALID - NO RECORD IN SYSTEM",
                "WARNING: POTENTIAL FRAUD DETECTED",
                "ACTION: REJECT TRANSACTION IMMEDIATELY"
              ]);
              playSound('reject');
            } else if (accountNum === currentCustomer.transaction.accountNumber) {
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
        d.type === 'signature' || 
        d.type === 'SIGNATURE' || 
        (d as any).title === 'Signature Card'
      );
      if (!signatureDoc) {
        console.log("No signature document found", currentCustomer.documents);
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No signature document available"]);
        return;
      }
      
      console.log("Found signature document:", signatureDoc);
      
      const customerSignatureData = signatureDoc.data.signature as string;
      const name = currentCustomer.name;
      
      // Analyze signature using enhanced system
      const analysis = analyzeSignature(customerSignatureData, name);
      
      // Generate stylized bank signature for display
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
      
      // Generate customer signature display based on analysis
      let displaySignature = name;
      if (analysis.isAuthentic) {
        // Show variations for authentic signatures
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
        }
      } else {
        // Show fraud patterns for fraudulent signatures
        if (customerSignatureData.includes('_fraud_wrong')) {
          const wrongNames = ["Jane Doe", "Bob Smith", "Mary Jones"];
          displaySignature = wrongNames[Math.floor(Math.random() * wrongNames.length)];
        } else if (customerSignatureData.includes('_fraud_misspelled')) {
          displaySignature = name.replace(/[aeiou]/g, (match, offset) => 
            offset === 0 ? match : String.fromCharCode(97 + Math.floor(Math.random() * 26))
          );
        } else if (customerSignatureData.includes('_fraud_partial')) {
          displaySignature = name.split(' ')[Math.floor(Math.random() * name.split(' ').length)];
        } else if (customerSignatureData.includes('_fraud_shaky')) {
          displaySignature = name.split('').map(char => char + (Math.random() < 0.3 ? '~' : '')).join('');
        }
      }
      
      setSignatureModal({
        isOpen: true, 
        bankSignature, 
        customerSignature: displaySignature,
        analysis
      } as any);
      
      const terminalOutput = [
        "> " + command,
        "========== SIGNATURE COMPARISON ==========",
        "RETRIEVING SIGNATURE ON FILE...",
        "CUSTOMER SIGNING FRESH SIGNATURE...",
        "",
        `SYSTEM CONFIDENCE: ${analysis.confidence}%`,
        ""
      ];
      
      if (analysis.notes.length > 0) {
        terminalOutput.push("ANALYSIS NOTES:");
        analysis.notes.forEach(note => terminalOutput.push(`- ${note}`));
        terminalOutput.push("");
      }
      
      if (analysis.fraudIndicators.length > 0) {
        terminalOutput.push("⚠️ FRAUD INDICATORS:");
        analysis.fraudIndicators.forEach(indicator => terminalOutput.push(`- ${indicator}`));
        terminalOutput.push("");
      }
      
      terminalOutput.push(
        "VISUAL COMPARISON REQUIRED",
        "EXAMINE BOTH SIGNATURES CAREFULLY",
        "LOOK FOR:",
        "- Letter formation differences",
        "- Spacing and flow variations", 
        "- Pressure and pen strokes",
        "- Overall handwriting style",
        "",
        "USE YOUR JUDGMENT TO DETERMINE AUTHENTICITY",
        "========================================"
      );
      
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
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING DEPOSIT...", "VALIDATING FUNDS...", "UPDATING ACCOUNT BALANCE..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== DEPOSIT PROCESSED ==========",
          `AMOUNT: $${amount}`,
          `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
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
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING WITHDRAWAL...", "CHECKING AVAILABLE FUNDS...", "PREPARING CASH DISPENSING..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== WITHDRAWAL APPROVED ==========",
          `AMOUNT: $${amount}`,
          `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
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
      accountNumber: currentCustomer.transaction.accountNumber,
      transactionType: currentCustomer.transaction.type,
      amount: currentCustomer.transaction.amount,
      balance: accountBalance,
      destinationAccount: currentCustomer.transaction.targetAccount
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
        // Use the correct path for the background music file
        backgroundMusicRef.current = new Audio('/The Currency Hypnosis.mp3');
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.volume = 0.0; // Completely silent by default
        backgroundMusicRef.current.preload = 'auto';
        
        // Add error handler for music loading
        backgroundMusicRef.current.addEventListener('error', () => {
          console.log('Background music file not found or failed to load');
        });
      }
      
      // Stop any existing music first to prevent overlapping
      if (backgroundMusicRef.current.currentTime > 0) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
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
    const timeWorked = Math.floor((Date.now() - shiftStartTime) / 60000);
    setGameScore(prev => ({ ...prev, timeOnShift: timeWorked }));
    
    // Stop background music when shift ends
    stopBackgroundMusic();
    
    // Always show punch-out screen, then go back to punch in
    setGamePhase('punch_out');
    setPunchStatus('ENDING SHIFT');
    
    // After punch animation, always go back to main menu
    setTimeout(() => {
      setGamePhase('punch_in');
      resetGame();
      setPunchStatus(null);
    }, 2000);
  };

  const resetGame = () => {
    setGameScore({ 
      score: 0, 
      correctTransactions: 0, 
      errors: 0, 
      timeOnShift: 0, 
      consecutiveErrors: 0, 
      errorDetails: [],
      customersCalledWithoutService: 0,
      dismissalWarningGiven: false
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
        dismissalWarningGiven: false // Reset warning flag
      };
    });
    
    // Check if ad should be shown every 5 customers
    setCustomersServed(prev => {
      const newCount = prev + 1;
      if (newCount % 5 === 0) {
        showInterstitialAd();
      }
      return newCount;
    });
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
        textAlign: 'center'
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
            
            <button
              onClick={toggleMusic}
              style={{
                background: musicMuted ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)',
                border: '1px solid ' + (musicMuted ? '#ff0000' : '#00ff00'),
                borderRadius: '50%',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 5px rgba(0, 255, 0, 0.3)',
                transition: 'all 0.2s',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={musicMuted ? "Unmute music" : "Mute music"}
            >
              {musicMuted ? '🔇' : '🎵'}
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
        overflowY: 'auto'
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
            <img 
              src="/bank-teller-1988-logo.png" 
              alt="Bank Teller 1988"
              style={{
                width: window.innerWidth < 768 ? '100px' : '120px',
                maxWidth: '70vw',
                height: 'auto',
                marginTop: '5px',
                filter: 'drop-shadow(0 0 10px #00ff00)',
                imageRendering: 'pixelated'
              }}
            />
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
      

      
      {/* Westridge Ledger Bank Logo - Subtle placement */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 100,
        opacity: 0.7
      }}>
        <img 
          src="./westridge-logo.png" 
          alt="Westridge Ledger Bank"
          style={{
            width: '45px',
            height: 'auto',
            filter: 'brightness(1.2) sepia(1) hue-rotate(90deg) saturate(2)'
          }}
          onError={(e) => {
            console.log('Logo failed to load:', e);
            // Fallback to text-based logo
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '<div style="color: #00ff00; font-size: 10px; font-weight: bold; text-align: center; line-height: 1.2;">WESTRIDGE<br/>LEDGER<br/>BANK</div>';
            }
          }}
        />
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
          borderRadius: '4px'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#ffff00' }}>
            CUSTOMER: {currentCustomer.name}
          </h1>
          <div style={{ color: '#00ff00', marginBottom: '4px', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px' }}>
            ACCOUNT: {currentCustomer.transaction.accountNumber}
          </div>
          <div style={{ color: '#ffff00', fontWeight: 'bold', fontSize: '18px' }}>
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
          minHeight: window.innerWidth < 768 ? '280px' : '320px',
          maxHeight: window.innerWidth < 768 ? '380px' : '420px',
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
                    {doc.type === 'ID Card' ? '🆔' : 
                     doc.type === 'Transaction Slip' ? '📝' : 
                     doc.type === 'Bank Book' ? '📖' : 
                     doc.type === 'Signature Card' ? '✍️' : '📄'} {doc.title}
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gap: '6px',
                    fontSize: window.innerWidth < 768 ? '14px' : '16px'
                  }}>
                    {Object.entries(doc.data).map(([key, value]) => (
                      <div key={key} style={{ 
                        padding: '6px 10px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                        gap: window.innerWidth < 768 ? '2px' : '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <span style={{ 
                          color: '#00dddd', 
                          fontSize: window.innerWidth < 768 ? '12px' : '14px',
                          fontWeight: 'bold',
                          minWidth: window.innerWidth < 768 ? 'auto' : '120px',
                          letterSpacing: '0.5px'
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                        </span>
                        <span style={{ 
                          color: '#ffffff', 
                          fontWeight: 'bold', 
                          fontSize: window.innerWidth < 768 ? '14px' : '16px',
                          fontFamily: 'monospace',
                          background: 'rgba(255, 255, 255, 0.15)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          letterSpacing: '0.3px'
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
                          if (currentCustomer.suspiciousLevel > 2) return "NO RECORD FOUND";
                          return currentCustomer.name;
                        })()}</div>
                        <div><strong>ACCT:</strong> {(() => {
                          if (currentCustomer.suspiciousLevel > 2) return "INVALID";
                          return currentCustomer.transaction.accountNumber;
                        })()}</div>
                        <div><strong>DOB:</strong> {(() => {
                          if (currentCustomer.suspiciousLevel > 2) return "NO RECORD";
                          
                          const idDoc = currentCustomer.documents.find(d => d.type === 'id');
                          if (!idDoc || !idDoc.data.dateOfBirth) return '03/15/1985';
                          
                          const customerDOB = String(idDoc.data.dateOfBirth);
                          
                          // For fraud cases with DOB-related fraud, show a different "bank record" DOB
                          if (currentCustomer.isFraud && Math.random() < 0.3) {
                            const [month, day, year] = customerDOB.split('/');
                            const bankYear = parseInt(year) + Math.floor(Math.random() * 6) - 3;
                            return `${month}/${day}/${bankYear}`;
                          }
                          
                          // For legitimate customers, show their actual DOB
                          return customerDOB;
                        })()}</div>
                        <div><strong>ADDR:</strong> {(() => {
                          if (currentCustomer.suspiciousLevel > 2) return "NO RECORD";
                          if (currentCustomer.suspiciousLevel === 1) {
                            // System shows correct address, document shows wrong one
                            const correctStreetNumber = Math.floor(Math.random() * 9999) + 1;
                            const correctStreet = ['Oak Street', 'Pine Avenue', 'Elm Drive'][Math.floor(Math.random() * 3)];
                            const correctTown = ['Millbrook', 'Riverside', 'Fairview'][Math.floor(Math.random() * 3)];
                            const correctZip = Math.floor(Math.random() * 90000) + 10000;
                            return `${correctStreetNumber} ${correctStreet}, ${correctTown}, Westfield ${correctZip}`;
                          }
                          return currentCustomer.documents.find(d => d.type === 'ID')?.data.address || 'N/A';
                        })()}</div>
                        <div><strong>BAL:</strong> {(() => {
                          if (currentCustomer.suspiciousLevel > 2) return "$0.00";
                          return `$${accountBalance.toLocaleString()}`;
                        })()}</div>
                        <div><strong>STATUS:</strong> {(() => {
                          if (currentCustomer.suspiciousLevel > 2) return "INVALID ACCOUNT";
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
                        <div><strong>FORM ACCT:</strong> {currentCustomer.documents.find(d => d.type === 'SLIP')?.data.accountNumber || 'N/A'}</div>
                        <div><strong>ID NAME:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.name || 'N/A'}</div>
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
                      <div><strong>DOB:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.dateOfBirth || '1985-03-15'}</div>
                      <div><strong>ADDRESS:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.address || 'N/A'}</div>
                      <div><strong>LICENSE:</strong> {currentCustomer.documents.find(d => d.type === 'ID')?.data.licenseNumber || 'DL-12345'}</div>
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
                      <div><strong>ACCOUNT:</strong> {currentCustomer.isFraud ? "INVALID" : currentCustomer.accountNumber}</div>
                      <div><strong>TYPE:</strong> {currentCustomer.isFraud ? "NO RECORD" : "CHECKING"}</div>
                      <div><strong>BALANCE:</strong> {currentCustomer.isFraud ? "$0.00" : `$${accountBalance.toLocaleString()}`}</div>
                      <div><strong>STATUS:</strong> {currentCustomer.isFraud ? "INVALID ACCOUNT" : "ACTIVE"}</div>
                      <div><strong>OPENED:</strong> {currentCustomer.isFraud ? "NO RECORD" : "2020-01-15"}</div>
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
                    <div><strong>TYPE:</strong> {currentCustomer.transactionType}</div>
                    <div><strong>AMOUNT:</strong> ${currentCustomer.requestedAmount.toLocaleString()}</div>
                    {currentCustomer.destinationAccount && (
                      <div><strong>WIRE TO:</strong> {currentCustomer.destinationAccount}</div>
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
            gridTemplateColumns: '1fr',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <button
              onClick={() => {
                // Check if current customer was dismissed without service
                if (currentCustomer && !verificationState.transactionProcessed && !isTerminated) {
                  const currentDismissals = gameScore.customersCalledWithoutService + 1;
                  
                  // Fire at 5 dismissals - immediate termination
                  if (currentDismissals >= 5) {
                    console.log('FIRING EMPLOYEE - 5 dismissals reached');
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
                  
                  // Warning at exactly 3 dismissals
                  if (currentDismissals === 3 && !gameScore.dismissalWarningGiven) {
                    console.log('WARNING EMPLOYEE - 3 dismissals reached');
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
                  playSound('police_radio');
                  setTerminalOutput(prev => [...prev, 
                    "> FRAUD ALERT ACTIVATED",
                    "*** CALLING BANK SECURITY ***",
                    "Radio dispatch: Units responding...",
                    "Customer being detained for investigation"
                  ]);
                  
                  // Start arrest animation sequence
                  setTimeout(() => {
                    setShowArrestAnimation(true);
                    
                    // Close animation and proceed to next customer
                    setTimeout(() => {
                      setShowArrestAnimation(false);
                      handleCorrectTransaction();
                      
                      // Generate next customer after brief pause
                      setTimeout(() => {
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
                          "> Next customer approaching...",
                          "Ready to process transaction"
                        ]);
                      }, 1000);
                    }, 4000);
                  }, 2000);
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
                gridColumn: 'span 2'
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
                punchOut();
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

      {/* Beautiful CSS Arrest Animation */}
      {showArrestAnimation && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, #000000, #001100)',
            zIndex: 3000,
            overflow: 'hidden'
          }}
          ref={(el) => {
            if (el) {
              // Auto-close animation after 6 seconds
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
                  "> Fraud suspect removed from premises",
                  "> Next customer approaching window",
                  "Ready to process transaction"
                ]);
              }, 6000);
            }
          }}
        >
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
          
          {/* Bank Scene */}
          <div style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
            right: '0px',
            height: '100px',
            background: 'linear-gradient(180deg, #003300 0%, #001100 100%)',
            border: '2px solid #00ff00',
            borderBottom: 'none'
          }} />
          
          {/* Teller Counter */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '10%',
            width: '200px',
            height: '80px',
            background: 'linear-gradient(180deg, #004400 0%, #002200 100%)',
            border: '2px solid #00ff00'
          }} />
          
          {/* FRAUD DETECTED Alert */}
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ff0000',
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'fraudAlert 2s infinite',
            textShadow: '0 0 20px #ff0000',
            fontFamily: 'monospace'
          }}>
            🚨 FRAUD DETECTED 🚨
          </div>
          
          {/* Police Officer */}
          <div style={{
            position: 'absolute',
            bottom: '180px',
            right: '200px',
            fontSize: '80px',
            animation: 'officerApproach 3s ease-in-out forwards'
          }}>
            👮‍♂️
          </div>
          
          {/* Fraudulent Customer */}
          <div style={{
            position: 'absolute',
            bottom: '180px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '80px',
            animation: 'customerArrest 4s ease-in-out forwards'
          }}>
            🧑‍💼
          </div>
          
          {/* Handcuffs Effect */}
          <div style={{
            position: 'absolute',
            bottom: '220px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '40px',
            animation: 'handcuffsAppear 4s ease-in-out forwards',
            opacity: 0
          }}>
            🔗
          </div>
          
          {/* Police Car */}
          <div style={{
            position: 'absolute',
            bottom: '180px',
            right: '-200px',
            fontSize: '60px',
            animation: 'policeCarArrive 2s ease-in-out forwards'
          }}>
            🚔
          </div>
          
          {/* Arrest Dialog */}
          <div style={{
            position: 'absolute',
            bottom: '300px',
            left: '50px',
            color: '#ff4444',
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            animation: 'arrestDialog 5s linear forwards',
            opacity: 0
          }}>
            <div style={{ animation: 'textFadeIn 5s linear forwards' }}>
              "You're under arrest for attempted fraud"
            </div>
          </div>
          
          {/* Success Message */}
          <div style={{
            position: 'absolute',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#00ff00',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'monospace',
            animation: 'successMessage 6s linear forwards',
            opacity: 0,
            textShadow: '0 0 15px #00ff00'
          }}>
            FRAUD SUSPECT ARRESTED<br/>
            EXCELLENT DETECTIVE WORK
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fraudAlert {
          0%, 50%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          25%, 75% { opacity: 0.7; transform: translateX(-50%) scale(1.1); }
        }
        
        @keyframes officerApproach {
          0% { right: 100vw; }
          60% { right: 200px; }
          100% { right: 200px; }
        }
        
        @keyframes customerArrest {
          0% { transform: translateX(-50%) rotate(0deg); }
          60% { transform: translateX(-50%) rotate(0deg); }
          80% { transform: translateX(-50%) rotate(-10deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }
        
        @keyframes handcuffsAppear {
          0% { opacity: 0; }
          60% { opacity: 0; }
          70% { opacity: 1; transform: translateX(-50%) scale(1.5); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes policeCarArrive {
          0% { right: -200px; }
          100% { right: 50px; }
        }
        
        @keyframes arrestDialog {
          0% { opacity: 0; }
          30% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 1; }
        }
        
        @keyframes textFadeIn {
          0% { opacity: 0; }
          50% { opacity: 0; }
          60% { opacity: 1; }
          100% { opacity: 1; }
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
        
        @keyframes customerArrest {
          0% { transform: translateX(0px) rotate(0deg); }
          25% { transform: translateX(-10px) rotate(-5deg); }
          50% { transform: translateX(-20px) rotate(-10deg); }
          75% { transform: translateX(-30px) rotate(-15deg); }
          100% { transform: translateX(-40px) rotate(-20deg); }
        }
        
        @keyframes officer1Approach {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-150px); }
        }
        
        @keyframes officer2Approach {
          0% { transform: translateX(0px); }
          100% { transform: translateX(400px); }
        }
        
        @keyframes handcuffsApply {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 0; transform: scale(0); }
          60% { opacity: 1; transform: scale(1.5) rotate(180deg); }
          100% { opacity: 1; transform: scale(1) rotate(360deg); }
        }
        
        @keyframes policeCarArrive {
          0% { transform: translateX(0px); }
          100% { transform: translateX(150px); }
        }
        
        @keyframes textStep1 {
          0% { opacity: 0; }
          10% { opacity: 1; }
          30% { opacity: 1; }
          35% { opacity: 0; }
          100% { opacity: 0; }
        }
        
        @keyframes textStep2 {
          0% { opacity: 0; }
          35% { opacity: 0; }
          40% { opacity: 1; }
          65% { opacity: 1; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        
        @keyframes textStep3 {
          0% { opacity: 0; }
          70% { opacity: 0; }
          75% { opacity: 1; }
          100% { opacity: 1; }
        }
        
        @keyframes finalMessage {
          0% { opacity: 0; }
          80% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* AdMob Ad Break Screen */}
      {showAdBreak && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, #000000, #001100)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          color: '#00ff00',
          fontFamily: 'monospace'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            AD BREAK
          </div>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
            color: '#00ff00',
            textShadow: '0 0 10px #00ff00'
          }}>
            {adCountdown}
          </div>
          <div style={{
            fontSize: '16px',
            opacity: 0.7
          }}>
            Returning to game...
          </div>
        </div>
      )}



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

      {/* Google AdMob Ad Break Overlay */}
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
            <div style={{ fontSize: '32px', marginBottom: '20px' }}>
              📺 AD BREAK 📺
            </div>
            <div style={{ fontSize: '18px', marginBottom: '20px' }}>
              Thanks for playing Bank Teller 1988!
            </div>
            <div style={{ fontSize: '48px', color: '#ffff00', textShadow: '0 0 10px #ffff00' }}>
              {adCountdown}
            </div>
            <div style={{ fontSize: '14px', marginTop: '20px', color: '#888888' }}>
              Resuming in {adCountdown} seconds...
            </div>
          </div>
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
            Transaction #{currentBadge.milestone} completed
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
      `}</style>

    </div>
  );
}

export default App;