import React, { useState, useRef, useEffect } from 'react';
import { analyzeSignature, generateCustomer, generateDocuments } from './lib/customers';
import type { Customer, Document as GameDocument } from './types/game';

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
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
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

  // Initialize background music
  useEffect(() => {
    if (!musicMuted) {
      if (!backgroundMusicRef.current) {
        backgroundMusicRef.current = new Audio('/The Currency Hypnosis.mp3');
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.volume = 0.15; // Low volume background music
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
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, [musicMuted]);

  // Helper functions
  const playSound = (soundType: string) => {
    try {
      let audioFile = '';
      switch (soundType) {
        case 'typing': audioFile = '/attached_assets/mechanical-keyboard-02.wav'; break;
        case 'stamp': audioFile = '/attached_assets/office-stamp.wav'; break;
        case 'drawer': audioFile = '/attached_assets/cash-drawer.wav'; break;
        case 'cash': audioFile = '/attached_assets/cash-register.wav'; break;
        case 'receipt': audioFile = '/attached_assets/receipt-printer.wav'; break;
        case 'warning': audioFile = '/attached_assets/error-beep.wav'; break;
        case 'reject': audioFile = '/attached_assets/buzzer.wav'; break;
        case 'success': audioFile = '/attached_assets/success-chime.wav'; break;
        case 'correct': audioFile = '/attached_assets/correct-ding.wav'; break;
        default: return;
      }
      const audio = new Audio(audioFile);
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.log('Audio error:', error);
    }
  };

  const generateCustomerLocal = (): Customer => {
    const customer = generateCustomer(1);
    return customer;
  };

  // Account lookup function - NEVER automatically flags fraud, always returns account info
  const handleAccountLookup = (accountNumber: string) => {
    setTerminalOutput(prev => [...prev, 
      `> LOOKUP ${accountNumber}`,
      "CONNECTING TO DATABASE...",
      "SEARCHING..."
    ]);
    
    setTimeout(() => {
      // Always return account information - no automatic validation
      const balance = Math.floor(Math.random() * 3000) + 500;
      setAccountBalance(balance);
      setVerificationState(prev => ({...prev, accountLookedUp: true}));
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
    
    setGameScore(prev => {
      const newCount = prev.customersCalledWithoutService + 1;
      console.log("Dismissal count:", newCount, "Warning given:", prev.dismissalWarningGiven);
      
      if (newCount === 2 && !prev.dismissalWarningGiven) {
        // First warning at 2 dismissals
        setTerminalOutput(prevOutput => [...prevOutput,
          "",
          "⚠️ SUPERVISOR ALERT ⚠️",
          "WARNING: Customer service protocol violation",
          "You have dismissed 2 customers without service",
          "Warning: Two more dismissals will result in termination",
          "Please serve all customers properly",
          ""
        ]);
        playSound('reject');
        return { ...prev, customersCalledWithoutService: newCount, dismissalWarningGiven: true };
      } else if (newCount >= 4 && prev.dismissalWarningGiven) {
        // Termination at 4 dismissals (only if warning was already given)
        setTerminalOutput(prevOutput => [...prevOutput,
          "",
          "🚨 SUPERVISOR INTERVENTION 🚨",
          "TERMINATION: Excessive customer dismissals",
          "You have dismissed 4 customers without service",
          "This violates our customer service standards",
          "Your shift has been terminated",
          ""
        ]);
        setGamePhase('leaderboard');
        return { ...prev, customersCalledWithoutService: newCount };
      }
      
      return { ...prev, customersCalledWithoutService: newCount };
    });
    
    setCurrentCustomer(null);
    setVerificationState({ accountLookedUp: false, signatureCompared: false });
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

  const completeTransaction = (isCorrect: boolean) => {
    if (!currentCustomer) return;
    
    // Check if customer has document mismatches (fraud indicators)
    const hasFraudulentDocuments = currentCustomer.documents.some(doc => !doc.isValid);
    
    if (isCorrect && hasFraudulentDocuments) {
      // Player approved a fraudulent transaction - handle fraud consequence
      setGameScore(prev => {
        const newFraudCount = prev.fraudulentApprovals + 1;
        console.log("Fraud approval count:", newFraudCount);
        
        if (newFraudCount === 1) {
          // First fraud approval - warning
          setTerminalOutput(prevOutput => [...prevOutput,
            "",
            "⚠️ SECURITY ALERT ⚠️",
            "WARNING: You have approved a fraudulent transaction",
            "This has been flagged by our security system",
            "Warning: One more fraudulent approval will result in termination",
            "Please be more careful with document verification",
            ""
          ]);
          playSound('reject');
          return { ...prev, fraudulentApprovals: newFraudCount, score: prev.score - 200 };
        } else if (newFraudCount >= 2) {
          // Second fraud approval - termination
          setTerminalOutput(prevOutput => [...prevOutput,
            "",
            "🚨 SECURITY BREACH 🚨",
            "TERMINATION: Multiple fraudulent approvals detected",
            "You have approved 2 fraudulent transactions",
            "This poses a serious security risk to the bank",
            "Your access has been revoked immediately",
            ""
          ]);
          setGamePhase('leaderboard');
          return { ...prev, fraudulentApprovals: newFraudCount };
        }
        
        return { ...prev, fraudulentApprovals: newFraudCount };
      });
    } else if (isCorrect) {
      // Correct approval of legitimate transaction
      setGameScore(prev => ({
        ...prev,
        score: prev.score + 100,
        correctTransactions: prev.correctTransactions + 1
      }));
      playSound('cash');
    } else {
      // Incorrect decision
      setGameScore(prev => ({
        ...prev,
        errors: prev.errors + 1
      }));
      playSound('reject');
    }
    
    // Generate next customer after processing
    setTimeout(() => {
      setCurrentCustomer(generateCustomerLocal());
      setVerificationState({ accountLookedUp: false, signatureCompared: false });
    }, 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      color: '#00ff00',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {gamePhase === 'welcome' && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          border: '2px solid #00ff00',
          borderRadius: '10px',
          background: 'rgba(0, 255, 0, 0.1)'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
            🏦 BANK TELLER SIMULATOR
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '30px' }}>
            Experience the nostalgia of 1980s banking technology
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(145deg, #00aa00, #008800)',
              border: '2px solid #00ff00',
              color: '#ffffff',
              padding: '15px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            START SHIFT
          </button>
        </div>
      )}

      {gamePhase === 'working' && (
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          padding: '20px'
        }}>
          {/* Music Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '10px'
          }}>
            <button
              onClick={() => {
                setMusicMuted(!musicMuted);
                if (!musicMuted && backgroundMusicRef.current) {
                  backgroundMusicRef.current.pause();
                } else if (musicMuted && backgroundMusicRef.current) {
                  backgroundMusicRef.current.play().catch(e => console.log("Music play failed:", e));
                }
              }}
              style={{
                background: 'rgba(0, 100, 0, 0.6)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                padding: '8px 16px',
                fontSize: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              {musicMuted ? '♪ MUSIC OFF' : '♪ MUSIC ON'}
            </button>
          </div>

          {/* Account Lookup Controls */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => handleAccountLookup(currentCustomer.transaction.accountNumber)}
                  disabled={verificationState.accountLookedUp}
                  style={{
                    background: verificationState.accountLookedUp ? 'rgba(0, 100, 0, 0.8)' : 'rgba(100, 100, 0, 0.6)',
                    border: '2px solid ' + (verificationState.accountLookedUp ? '#00ff00' : '#ffff00'),
                    color: verificationState.accountLookedUp ? '#00ff00' : '#ffff00',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: verificationState.accountLookedUp ? 'not-allowed' : 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  {verificationState.accountLookedUp ? '✓ ACCOUNT VERIFIED' : 'LOOKUP ACCOUNT'}
                </button>
                
                <button
                  onClick={() => {
                    setVerificationState(prev => ({...prev, signatureCompared: true}));
                    setTerminalOutput(prev => [...prev, "Signature comparison completed manually"]);
                  }}
                  disabled={!verificationState.accountLookedUp || verificationState.signatureCompared}
                  style={{
                    background: verificationState.signatureCompared ? 'rgba(0, 100, 0, 0.8)' : 
                               !verificationState.accountLookedUp ? 'rgba(100, 100, 100, 0.3)' : 'rgba(100, 100, 0, 0.6)',
                    border: '2px solid ' + (verificationState.signatureCompared ? '#00ff00' : 
                                           !verificationState.accountLookedUp ? '#666666' : '#ffff00'),
                    color: verificationState.signatureCompared ? '#00ff00' : 
                           !verificationState.accountLookedUp ? '#666666' : '#ffff00',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: (!verificationState.accountLookedUp || verificationState.signatureCompared) ? 'not-allowed' : 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  {verificationState.signatureCompared ? '✓ SIGNATURE OK' : 'COMPARE SIGNATURE'}
                </button>
              </div>
            </div>
          )}

          {/* Terminal Display */}
          <div style={{
            background: '#000000',
            border: '3px solid #00aa00',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            height: '200px',
            overflow: 'auto'
          }}>
            {terminalOutput.map((line, index) => (
              <div key={index} style={{ color: '#00ff00', fontSize: '14px' }}>
                {line}
              </div>
            ))}
          </div>

          {/* Game Area */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            {/* Customer Area */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: '2px solid #00aa00',
              borderRadius: '10px',
              padding: '20px'
            }}>
              <h3>Current Customer</h3>
              {currentCustomer && (
                <div>
                  <p><strong>Name:</strong> {currentCustomer.name}</p>
                  <p><strong>Transaction:</strong> {currentCustomer.transaction.type}</p>
                  <p><strong>Amount:</strong> ${currentCustomer.transaction.amount}</p>
                  
                  {/* Documents - Detailed View for Manual Fraud Detection */}
                  <div style={{ marginTop: '20px' }}>
                    <h4>Customer Documents:</h4>
                    {currentCustomer.documents.map((doc, index) => (
                      <div key={index} style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#000000',
                        padding: '12px',
                        margin: '8px 0',
                        borderRadius: '5px',
                        fontSize: '11px',
                        border: doc.isValid ? '2px solid green' : '2px solid red'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                          {doc.type.toUpperCase()} {!doc.isValid && '⚠️'}
                        </div>
                        {doc.type === 'id' && (
                          <div>
                            <div><strong>Name:</strong> {doc.data.name}</div>
                            <div><strong>DOB:</strong> {doc.data.dateOfBirth}</div>
                            <div><strong>Address:</strong> {doc.data.address}</div>
                            <div><strong>ID Number:</strong> {doc.data.idNumber}</div>
                            <div><strong>License:</strong> {doc.data.licenseNumber}</div>
                          </div>
                        )}
                        {doc.type === 'slip' && (
                          <div>
                            <div><strong>Name:</strong> {doc.data.name}</div>
                            <div><strong>Type:</strong> {doc.data.type}</div>
                            <div><strong>Amount:</strong> ${doc.data.amount}</div>
                            <div><strong>Account:</strong> {doc.data.accountNumber}</div>
                          </div>
                        )}
                        {doc.type === 'bank_book' && (
                          <div>
                            <div><strong>Name:</strong> {doc.data.name}</div>
                            <div><strong>Account:</strong> {doc.data.accountNumber}</div>
                            <div><strong>Balance:</strong> ${doc.data.balance?.toLocaleString()}</div>
                            <div><strong>Transaction:</strong> ${doc.data.amount}</div>
                          </div>
                        )}
                        {doc.type === 'signature' && (
                          <div>
                            <div><strong>Signature:</strong> {doc.data.name}</div>
                            <div style={{ fontStyle: 'italic', fontSize: '10px' }}>
                              Style: {doc.data.signature?.split('|')[1] || 'standard'}
                            </div>
                          </div>
                        )}
                        {doc.hasError && (
                          <div style={{ color: 'red', fontSize: '10px', marginTop: '4px' }}>
                            Issue: {doc.hasError}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    marginTop: '20px'
                  }}>
                    <button
                      onClick={() => completeTransaction(true)}
                      disabled={!verificationState.accountLookedUp || !verificationState.signatureCompared}
                      style={{
                        background: (!verificationState.accountLookedUp || !verificationState.signatureCompared) ? 
                                   'rgba(100, 100, 100, 0.3)' : 'linear-gradient(145deg, #00aa00, #008800)',
                        border: '2px solid ' + ((!verificationState.accountLookedUp || !verificationState.signatureCompared) ? 
                                               '#666666' : '#00ff00'),
                        color: (!verificationState.accountLookedUp || !verificationState.signatureCompared) ? 
                               '#666666' : '#ffffff',
                        padding: '10px 16px',
                        fontSize: '12px',
                        borderRadius: '5px',
                        cursor: (!verificationState.accountLookedUp || !verificationState.signatureCompared) ? 
                                'not-allowed' : 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => completeTransaction(false)}
                      style={{
                        background: 'linear-gradient(145deg, #aa0000, #880000)',
                        border: '2px solid #ff0000',
                        color: '#ffffff',
                        padding: '10px 16px',
                        fontSize: '12px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      REJECT
                    </button>
                    <button
                      onClick={handleCustomerDismissal}
                      style={{
                        background: 'linear-gradient(145deg, #666666, #444444)',
                        border: '2px solid #888888',
                        color: '#ffffff',
                        padding: '10px 16px',
                        fontSize: '12px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      DISMISS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Score Area */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: '2px solid #00aa00',
              borderRadius: '10px',
              padding: '20px'
            }}>
              <h3>Performance</h3>
              <div style={{ fontSize: '14px' }}>
                <p><strong>Score:</strong> {gameScore.score}</p>
                <p><strong>Correct:</strong> {gameScore.correctTransactions}</p>
                <p><strong>Errors:</strong> {gameScore.errors}</p>
                <p><strong>Time:</strong> {Math.floor(gameScore.timeOnShift / 60)}:{(gameScore.timeOnShift % 60).toString().padStart(2, '0')}</p>
                
                <div style={{ marginTop: '16px', padding: '8px', background: 'rgba(100, 0, 0, 0.2)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#ff6666', fontWeight: 'bold', marginBottom: '4px' }}>
                    WARNING SYSTEM
                  </div>
                  <p style={{ fontSize: '11px', margin: '2px 0' }}>
                    <strong>Fraud Approvals:</strong> {gameScore.fraudulentApprovals}/2
                    {gameScore.fraudulentApprovals >= 1 && <span style={{ color: '#ff0000' }}> ⚠️</span>}
                  </p>
                  <p style={{ fontSize: '11px', margin: '2px 0' }}>
                    <strong>Dismissals:</strong> {gameScore.customersCalledWithoutService}/4
                    {gameScore.customersCalledWithoutService >= 2 && <span style={{ color: '#ff0000' }}> ⚠️</span>}
                  </p>
                  {gameScore.dismissalWarningGiven && (
                    <p style={{ fontSize: '10px', color: '#ff4444', fontStyle: 'italic' }}>
                      Dismissal warning issued
                    </p>
                  )}
                </div>

                {verificationState.accountLookedUp && (
                  <div style={{ marginTop: '16px', padding: '8px', background: 'rgba(0, 0, 100, 0.2)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#6666ff', fontWeight: 'bold', marginBottom: '4px' }}>
                      ACCOUNT INFO
                    </div>
                    <p style={{ fontSize: '11px', margin: '2px 0' }}>
                      <strong>Balance:</strong> ${accountBalance.toLocaleString()}
                    </p>
                    <p style={{ fontSize: '11px', margin: '2px 0' }}>
                      <strong>Status:</strong> Active
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;