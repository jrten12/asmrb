import React, { useState, useRef, useEffect } from 'react';
import { analyzeSignature, generateCustomer, generateDocuments } from './lib/customers';
import type { Customer, Document as GameDocument } from './types/game';

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

interface LegacyDocument {
  type: string;
  title: string;
  data: Record<string, string | number>;
  isValid?: boolean;
  hasError?: string;
}

function App() {
  const [gamePhase, setGamePhase] = useState<'welcome' | 'tutorial' | 'punch_in' | 'working' | 'punch_out' | 'leaderboard'>('welcome');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "FIRST NATIONAL BANK SYSTEM v2.1",
    "TELLER AUTHENTICATION: APPROVED",
    "",
    "Ready for customer service"
  ]);
  
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    accountNotFound: false,
    signatureCompared: false,
    signatureFraud: false,
    transactionProcessed: false
  });

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

  const [isTerminated, setIsTerminated] = useState(false);
  const [accountBalance, setAccountBalance] = useState(0);
  const [fraudTracker, setFraudTracker] = useState<boolean[]>([]);
  const [shiftStartTime, setShiftStartTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const [musicMuted, setMusicMuted] = useState(true);

  // Generate customer with controlled 40% fraud rate
  const generateCustomerLocal = (): Customer => {
    const fraudPattern = [false, true, false, false, true, false, true, false, false, true];
    const currentIndex = fraudTracker.length % fraudPattern.length;
    const shouldBeFraud = fraudPattern[currentIndex];
    
    setFraudTracker(prev => [...prev, shouldBeFraud]);
    
    let customer = generateCustomer(1);
    
    if (shouldBeFraud && customer.suspiciousLevel === 0) {
      customer.suspiciousLevel = Math.floor(Math.random() * 2) + 1;
      customer.documents = generateDocuments(customer.name, customer.transaction, customer.suspiciousLevel);
    } else if (!shouldBeFraud && customer.suspiciousLevel > 0) {
      customer.suspiciousLevel = 0;
      customer.documents = generateDocuments(customer.name, customer.transaction, 0);
    }
    
    return customer;
  };

  const playSound = (soundName: string) => {
    try {
      if (!window.gameAudioContext) {
        window.gameAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = window.gameAudioContext;
      
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
        
        const bufferSource = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        bufferSource.buffer = buffer;
        bufferSource.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        bufferSource.start(audioContext.currentTime);
      };

      switch (soundName) {
        case 'keypress':
          createTone(1200 + Math.random() * 400, 0.015, 0.04);
          createTone(800 + Math.random() * 200, 0.008, 0.025);
          createNoise(0.012, 0.015);
          setTimeout(() => createTone(600, 0.006, 0.015), 8);
          setTimeout(() => createNoise(0.004, 0.008), 12);
          break;
        case 'approve':
          createTone(880, 0.2, 0.1);
          setTimeout(() => createTone(1100, 0.3, 0.12), 100);
          break;
        case 'reject':
          createTone(220, 0.3, 0.1);
          setTimeout(() => createTone(180, 0.25, 0.08), 150);
          break;
        case 'register_print':
          for (let i = 0; i < 20; i++) {
            setTimeout(() => {
              createTone(1600 + (i % 4) * 150, 0.02, 0.03);
              createNoise(0.008, 0.015);
            }, i * 45);
          }
          setTimeout(() => createTone(1200, 0.15, 0.06), 900);
          break;
        case 'legacy_processing':
          for (let i = 0; i < 12; i++) {
            setTimeout(() => {
              createTone(1200 + (i % 4) * 200, 0.04, 0.06);
              createNoise(0.01, 0.02);
            }, i * 80);
          }
          setTimeout(() => createTone(1800, 0.15, 0.08), 960);
          break;
        case 'wire_input':
          createTone(1400, 0.08, 0.05);
          setTimeout(() => createTone(1600, 0.06, 0.04), 80);
          break;
        default:
          createTone(500, 0.1, 0.05);
      }
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  const handleCommand = (command: string) => {
    const cmd = command.trim().toUpperCase();
    
    if (cmd === 'NEXT') {
      const customer = generateCustomerLocal();
      setCurrentCustomer(customer);
      setVerificationState({
        accountLookedUp: false,
        accountNotFound: false,
        signatureCompared: false,
        signatureFraud: false,
        transactionProcessed: false
      });
      setTerminalOutput(prev => [...prev, "> " + command, `Customer ${customer.name} approaching window...`, `REQUEST: ${customer.transaction.type.toUpperCase()} $${customer.transaction.amount}`, "Please verify identity before processing."]);
      playSound('keypress');
    } else if (cmd.startsWith('LOOKUP ')) {
      const accountNum = cmd.replace('LOOKUP ', '');
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "CONNECTING TO DATABASE...", "SEARCHING..."]);
      
      setTimeout(() => {
        const customerAccountNumber = currentCustomer.transaction.accountNumber;
        
        if (accountNum === customerAccountNumber) {
          const balance = Math.floor(Math.random() * 3000) + 500;
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
            "❌❌❌ ACCOUNT NOT FOUND ❌❌❌",
            "STATUS: NO RECORD IN SYSTEM",
            "ENTERED: " + accountNum,
            "ERROR: ACCOUNT DOES NOT EXIST"
          ]);
          playSound('reject');
        }
      }, 1200);
    } else if (cmd === 'COMPARE SIGNATURE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Must lookup account first"]);
        playSound('reject');
        return;
      }
      
      const signatureDoc = currentCustomer.documents.find(doc => doc.type === 'signature');
      if (!signatureDoc || !signatureDoc.data.signature) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No signature document found"]);
        playSound('reject');
        return;
      }
      
      const customerSignatureData = signatureDoc.data.signature as string;
      const name = currentCustomer.name;
      const analysis = analyzeSignature(customerSignatureData, name);
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "ANALYZING SIGNATURE PATTERNS...", "COMPARING WITH BANK RECORDS..."]);
      
      setTimeout(() => {
        const isFraudulent = !analysis.isAuthentic;
        setVerificationState(prev => ({...prev, signatureCompared: true, signatureFraud: isFraudulent}));
        
        if (isFraudulent) {
          setTerminalOutput(prev => [...prev,
            "⚠️ SIGNATURE ANALYSIS COMPLETE ⚠️",
            "DISCREPANCY DETECTED:",
            ...analysis.fraudIndicators,
            "RECOMMENDATION: INVESTIGATE FURTHER"
          ]);
          playSound('reject');
        } else {
          setTerminalOutput(prev => [...prev,
            "✓ SIGNATURE ANALYSIS COMPLETE ✓",
            "SIGNATURE VERIFIED AUTHENTIC",
            "HANDWRITING PATTERNS MATCH RECORDS",
            "CUSTOMER IDENTITY CONFIRMED"
          ]);
          playSound('approve');
        }
      }, 1500);
    } else if (cmd === 'APPROVE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp || !verificationState.signatureCompared) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Complete verification first", "1. LOOKUP account", "2. COMPARE SIGNATURE"]);
        playSound('reject');
        return;
      }
      
      setVerificationState(prev => ({...prev, transactionProcessed: true}));
      
      // Check if this is a fraudulent transaction being approved
      const isFraudApproval = currentCustomer.documents.some(doc => !doc.isValid);
      
      if (isFraudApproval) {
        setGameScore(prev => {
          const newFraudApprovals = prev.fraudulentApprovals + 1;
          
          if (newFraudApprovals === 1) {
            setTerminalOutput(prevOutput => [...prevOutput,
              "> " + command,
              "⚠️ SUPERVISOR NOTICE ⚠️",
              "WARNING: Document discrepancy detected after approval",
              "Employee review required - this is your first warning",
              "Future violations may result in termination"
            ]);
            playSound('reject');
          } else if (newFraudApprovals >= 2) {
            setTimeout(() => {
              setTerminalOutput(prevOutput => [...prevOutput,
                "🚨 IMMEDIATE TERMINATION 🚨",
                "Employee ID: " + Math.floor(Math.random() * 10000),
                "VIOLATION: Multiple fraudulent transaction approvals",
                "Your employment is hereby TERMINATED",
                "Security will escort you from the premises",
                "- Bank Management"
              ]);
              setGamePhase('punch_out');
              setIsTerminated(true);
            }, 2000);
          }
          
          return {
            ...prev,
            fraudulentApprovals: newFraudApprovals,
            errors: prev.errors + 1,
            errorDetails: [...prev.errorDetails, `Approved fraudulent transaction for ${currentCustomer.name}`]
          };
        });
      } else {
        setGameScore(prev => ({
          ...prev,
          score: prev.score + 100,
          correctTransactions: prev.correctTransactions + 1
        }));
        
        setTerminalOutput(prev => [...prev,
          "> " + command,
          "✓ TRANSACTION APPROVED ✓",
          "Processing complete - customer satisfied",
          "Printing receipt..."
        ]);
        
        // Show receipt for approved transactions
        setTimeout(() => {
          playSound('register_print');
          setTerminalOutput(prev => [...prev,
            "========== TRANSACTION RECEIPT ==========",
            `CUSTOMER: ${currentCustomer.name}`,
            `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
            `TYPE: ${currentCustomer.transaction.type.toUpperCase()}`,
            `AMOUNT: $${currentCustomer.transaction.amount}`,
            `DATE: ${new Date().toLocaleDateString()}`,
            `TIME: ${new Date().toLocaleTimeString()}`,
            "STATUS: APPROVED",
            "========================================"
          ]);
        }, 1000);
      }
      
      playSound('approve');
      
      setTimeout(() => {
        setCurrentCustomer(null);
        setVerificationState({
          accountLookedUp: false,
          accountNotFound: false,
          signatureCompared: false,
          signatureFraud: false,
          transactionProcessed: false
        });
        setTerminalOutput(prev => [...prev, "Ready for next customer"]);
      }, 3000);
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
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING WITHDRAWAL...", "PREPARING RECEIPT..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        playSound('register_print');
        setTerminalOutput(prev => [...prev, 
          "========== WITHDRAWAL APPROVED ==========",
          `AMOUNT: $${amount}`,
          `ACCOUNT: ${currentCustomer.transaction.accountNumber}`,
          `REMAINING BALANCE: $${(accountBalance - withdrawAmount).toLocaleString()}`,
          "STATUS: PROCESSING COMPLETE",
          "========================================"
        ]);
        
        setTimeout(() => {
          setCurrentCustomer(null);
          setVerificationState({
            accountLookedUp: false,
            accountNotFound: false,
            signatureCompared: false,
            signatureFraud: false,
            transactionProcessed: false
          });
          setTerminalOutput(prev => [...prev, "Transaction complete. Ready for next customer"]);
        }, 2000);
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
      
      playSound('wire_input');
      
      if (!destAccount || destAccount !== currentCustomer.transaction.targetAccount) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Destination account mismatch", `Expected: ${currentCustomer.transaction.targetAccount}`, `Entered: ${destAccount || 'NONE'}`, "WIRE TRANSFER DENIED"]);
        playSound('reject');
        return;
      }
      
      playSound('legacy_processing');
      setTerminalOutput(prev => [...prev, "> " + command, "PROCESSING WIRE TRANSFER...", "VALIDATING DESTINATION ACCOUNT..."]);
      
      setTimeout(() => {
        setVerificationState(prev => ({...prev, transactionProcessed: true}));
        setTerminalOutput(prev => [...prev, 
          "========== WIRE TRANSFER READY ==========",
          `AMOUNT: $${amount}`,
          `FROM: ${currentCustomer.transaction.accountNumber}`,
          `TO: ${destAccount}`,
          `FEES: $25.00`,
          "STATUS: AWAITING FINAL APPROVAL",
          "========================================"
        ]);
        playSound('approve');
      }, 2000);
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Command not recognized"]);
      playSound('reject');
    }
  };

  const handleCorrectTransaction = () => {
    setGameScore(prev => ({
      ...prev,
      customersCalledWithoutService: 0
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001a00, #003300)',
      color: '#00ff00',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px'
    }}>
      
      {gamePhase === 'working' && (
        <>
          <div style={{
            background: 'linear-gradient(145deg, #002200, #001100)',
            border: '3px solid #00ff00',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 0 10px #00ff00'
              }}>
                🏦 TELLER WORKSTATION
              </div>
              <button
                onClick={() => {
                  setMusicMuted(!musicMuted);
                  if (backgroundMusicRef.current) {
                    if (musicMuted) {
                      backgroundMusicRef.current.volume = 0.01;
                      backgroundMusicRef.current.play();
                    } else {
                      backgroundMusicRef.current.pause();
                    }
                  }
                }}
                style={{
                  background: musicMuted ? 'rgba(100, 0, 0, 0.6)' : 'rgba(0, 100, 0, 0.6)',
                  border: `2px solid ${musicMuted ? '#ff0000' : '#00ff00'}`,
                  color: musicMuted ? '#ff0000' : '#00ff00',
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {musicMuted ? '🔇 MUSIC OFF' : '🔊 MUSIC ON'}
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div>SCORE: {gameScore.score}</div>
              <div>TRANSACTIONS: {gameScore.correctTransactions}</div>
              <div>ERRORS: {gameScore.errors}</div>
              <div>FRAUD APPROVALS: {gameScore.fraudulentApprovals}</div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
            gap: '20px',
            height: 'calc(100vh - 200px)'
          }}>
            
            {/* Left Panel - Terminal */}
            <div style={{
              background: 'linear-gradient(145deg, #001100, #000800)',
              border: '3px solid #00ff00',
              borderRadius: '8px',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                background: '#000000',
                border: '2px solid #00aa00',
                borderRadius: '6px',
                padding: '15px',
                height: '400px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {terminalOutput.map((line, index) => (
                  <div key={index} style={{ marginBottom: '2px' }}>{line}</div>
                ))}
              </div>
              
              <div style={{
                marginTop: '15px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '8px'
              }}>
                <button
                  onClick={() => handleCommand('NEXT')}
                  style={{
                    background: 'rgba(0, 100, 0, 0.6)',
                    border: '2px solid #00ff00',
                    color: '#00ff00',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  CALL CUSTOMER
                </button>
                
                {currentCustomer && (
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type command..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const command = e.currentTarget.value;
                        if (command.trim()) {
                          handleCommand(command);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    style={{
                      background: '#000000',
                      border: '2px solid #00aa00',
                      color: '#00ff00',
                      padding: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      borderRadius: '4px',
                      gridColumn: 'span 2'
                    }}
                  />
                )}
              </div>
            </div>

            {/* Right Panel - Customer & Documents */}
            <div style={{
              background: 'linear-gradient(145deg, #001100, #000800)',
              border: '3px solid #00ff00',
              borderRadius: '8px',
              padding: '15px'
            }}>
              {currentCustomer ? (
                <>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '15px',
                    padding: '10px',
                    background: 'rgba(0, 255, 0, 0.1)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {currentCustomer.name}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                      REQUEST: {currentCustomer.transaction.type.toUpperCase()} ${currentCustomer.transaction.amount}
                    </div>
                  </div>

                  {/* Customer Documents */}
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {currentCustomer.documents.map((doc, index) => (
                      <div key={index} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid #00aa00',
                        borderRadius: '6px',
                        padding: '10px',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#00dddd'
                        }}>
                          {doc.type.toUpperCase()} DOCUMENT
                        </div>
                        {Object.entries(doc.data).map(([key, value]) => (
                          <div key={key} style={{
                            fontSize: '11px',
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span style={{ color: '#00dddd' }}>{key.toUpperCase()}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Bank Records - Only shown after account lookup */}
                  {verificationState.accountLookedUp && (
                    <div style={{
                      marginTop: '15px',
                      background: 'rgba(0, 80, 0, 0.3)',
                      border: '3px solid #00ff00',
                      borderRadius: '6px',
                      padding: '10px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: '#00ff00'
                      }}>
                        🏦 BANK SYSTEM RECORDS
                      </div>
                      <div style={{ fontSize: '11px' }}>
                        <div>NAME: {currentCustomer.name}</div>
                        <div>ACCOUNT: {currentCustomer.transaction.accountNumber}</div>
                        <div>BALANCE: ${accountBalance.toLocaleString()}</div>
                        <div>STATUS: ACTIVE</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#666666',
                  fontSize: '16px',
                  marginTop: '50px'
                }}>
                  No customer at window
                  <br /><br />
                  Click "CALL CUSTOMER" to begin
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {gamePhase === 'welcome' && (
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
          padding: '40px'
        }}>
          <h1 style={{
            fontSize: '36px',
            marginBottom: '20px',
            textShadow: '0 0 20px #00ff00'
          }}>
            TELLER'S WINDOW
          </h1>
          <p style={{
            fontSize: '16px',
            marginBottom: '30px',
            lineHeight: '1.6'
          }}>
            1980s bank teller simulation. Verify customer documents and detect fraud manually.
            Use LOOKUP, COMPARE SIGNATURE, and transaction commands.
          </p>
          <button
            onClick={() => setGamePhase('working')}
            style={{
              background: 'linear-gradient(145deg, #004400, #002200)',
              border: '3px solid #00ff00',
              color: '#00ff00',
              padding: '15px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              textShadow: '0 0 10px #00ff00'
            }}
          >
            START SHIFT
          </button>
        </div>
      )}
    </div>
  );
}

export default App;