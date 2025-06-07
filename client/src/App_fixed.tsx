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
  const [gamePhase, setGamePhase] = useState<'start' | 'working' | 'ended'>('start');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "WESTRIDGE BANKING TERMINAL v2.1",
    "System initialized - Ready for operations",
    "Type HELP for available commands"
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

  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    accountNotFound: false,
    signatureCompared: false,
    signatureFraud: false,
    transactionProcessed: false
  });

  const [accountBalance, setAccountBalance] = useState(0);
  const [shiftStartTime, setShiftStartTime] = useState<number | null>(null);

  const generateCustomerLocal = (): Customer => {
    return generateCustomer(1); // Always use level 1 for consistent difficulty
  };

  const resetVerificationState = () => {
    setVerificationState({
      accountLookedUp: false,
      accountNotFound: false,
      signatureCompared: false,
      signatureFraud: false,
      transactionProcessed: false
    });
  };

  const playSound = (soundType: string) => {
    try {
      if (!window.gameAudioContext) {
        window.gameAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = window.gameAudioContext;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const createTone = (frequency: number, duration: number, volume: number = 0.1) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      };

      const createNoise = (volume: number, duration: number) => {
        const bufferSize = ctx.sampleRate * duration;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * volume;
        }
        
        const noiseSource = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        
        noiseSource.start(ctx.currentTime);
      };

      switch (soundType) {
        case 'keypress':
          createTone(800 + Math.random() * 400, 0.05, 0.03);
          break;
        case 'approve':
          createTone(800, 0.2, 0.08);
          setTimeout(() => createTone(1000, 0.15, 0.06), 150);
          break;
        case 'reject':
          createTone(300, 0.3, 0.1);
          createTone(280, 0.3, 0.1);
          break;
        case 'button_click':
          createTone(1200, 0.08, 0.05);
          break;
        case 'punch':
          createTone(600, 0.1, 0.08);
          createNoise(0.03, 0.05);
          break;
        case 'legacy_processing':
          createTone(1200, 0.1, 0.08);
          setTimeout(() => createTone(1400, 0.08, 0.06), 200);
          setTimeout(() => createTone(1600, 0.06, 0.04), 400);
          break;
        case 'account_verification':
          createTone(800, 0.1, 0.05);
          setTimeout(() => createTone(1000, 0.08, 0.04), 150);
          break;
      }
    } catch (error) {
      console.log('Audio context error:', error);
    }
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
      playSound('button_click');
    } else if (cmd === 'LOOKUP' || cmd.startsWith('LOOKUP ')) {
      if (cmd === 'LOOKUP') {
        setTerminalOutput(prev => [...prev, "> " + command, "Enter account number to verify:"]);
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
            // Always return account information - no automatic validation
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
          }, 800);
        }, 1200);
      }
    } else if (cmd === 'COMPARE SIGNATURE') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      if (!verificationState.accountLookedUp) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Complete account lookup first"]);
        playSound('reject');
        return;
      }
      
      console.log("Current customer documents:", currentCustomer.documents);
      
      const signatureDoc = currentCustomer.documents.find(d => d.type === 'signature');
      if (!signatureDoc) {
        console.log("No signature document found", currentCustomer.documents);
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No signature document available"]);
        return;
      }
      
      console.log("Found signature document:", signatureDoc);
      
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
              setGamePhase('ended');
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
          "Next customer may approach window"
        ]);
      }
      
      playSound('approve');
      
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
      }, 2000);
      
    } else if (cmd === 'REJECT') {
      if (!currentCustomer) {
        setTerminalOutput(prev => [...prev, "> " + command, "ERROR: No customer present"]);
        return;
      }
      
      setVerificationState(prev => ({...prev, transactionProcessed: true}));
      
      const isFraudulent = currentCustomer.documents.some(doc => !doc.isValid);
      
      if (isFraudulent) {
        setGameScore(prev => ({
          ...prev,
          score: prev.score + 200,
          correctTransactions: prev.correctTransactions + 1
        }));
        
        setTerminalOutput(prev => [...prev,
          "> " + command,
          "✓ TRANSACTION REJECTED ✓", 
          "Fraudulent documents detected - good catch!",
          "Customer escorted by security"
        ]);
      } else {
        setGameScore(prev => ({
          ...prev,
          errors: prev.errors + 1,
          errorDetails: [...prev.errorDetails, `Incorrectly rejected valid transaction for ${currentCustomer.name}`]
        }));
        
        setTerminalOutput(prev => [...prev,
          "> " + command,
          "⚠️ TRANSACTION REJECTED ⚠️",
          "Valid customer turned away - service error",
          "Supervisor notification sent"
        ]);
      }
      
      playSound('reject');
      
      setTimeout(() => {
        setCurrentCustomer(null);
        resetVerificationState();
      }, 2000);
      
    } else if (cmd === 'HELP') {
      setTerminalOutput(prev => [...prev,
        "> " + command,
        "AVAILABLE COMMANDS:",
        "NEXT - Call next customer",
        "LOOKUP [account] - Verify account information",
        "COMPARE SIGNATURE - Analyze customer signature",
        "APPROVE - Process transaction approval",
        "REJECT - Reject suspicious transaction",
        "HELP - Show this help menu"
      ]);
    } else {
      setTerminalOutput(prev => [...prev, "> " + command, "ERROR: Command not recognized", "Type HELP for available commands"]);
      playSound('reject');
    }
  };

  const startShift = () => {
    setShiftStartTime(Date.now());
    setGamePhase('working');
    setTerminalOutput(prev => [...prev, 
      "",
      "=== SHIFT STARTED ===",
      "Welcome to Westridge Banking",
      "Your workstation is now active",
      "Type NEXT to call your first customer"
    ]);
    playSound('button_click');
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gamePhase === 'working' && shiftStartTime) {
      interval = setInterval(() => {
        setGameScore(prev => ({
          ...prev,
          timeOnShift: Math.floor((Date.now() - shiftStartTime) / 1000)
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gamePhase, shiftStartTime]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(45deg, #000000, #001100)',
      color: '#00ff00',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      {gamePhase === 'start' && (
        <div style={{
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h1 style={{
            fontSize: '48px',
            marginBottom: '20px',
            textShadow: '0 0 20px #00ff00'
          }}>
            WESTRIDGE BANKING
          </h1>
          <h2 style={{
            fontSize: '24px',
            marginBottom: '40px',
            color: '#88ff88'
          }}>
            Teller Training Simulation
          </h2>
          <p style={{
            fontSize: '18px',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Welcome to your first day as a bank teller. Your job is to verify customer documents 
            and detect fraudulent transactions. Use the LOOKUP and COMPARE SIGNATURE commands 
            to manually verify each customer before approving or rejecting their transaction.
          </p>
          <button
            onClick={startShift}
            style={{
              background: 'linear-gradient(145deg, #00aa00, #008800)',
              border: '3px solid #00ff00',
              color: '#ffffff',
              padding: '20px 40px',
              fontSize: '20px',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              textShadow: '0 0 10px #ffffff',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
            }}
          >
            START SHIFT
          </button>
        </div>
      )}

      {gamePhase === 'working' && (
        <div style={{
          width: '100%',
          maxWidth: '1400px',
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '20px'
        }}>
          {/* Main Terminal Area */}
          <div>
            {/* Terminal Display */}
            <div style={{
              background: '#000000',
              border: '3px solid #00aa00',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              height: '300px',
              overflow: 'auto',
              fontSize: '14px'
            }}>
              {terminalOutput.map((line, index) => (
                <div key={index} style={{ 
                  color: line.includes('ERROR') ? '#ff4444' : 
                        line.includes('WARNING') || line.includes('⚠️') ? '#ffaa00' :
                        line.includes('✓') ? '#44ff44' : '#00ff00',
                  marginBottom: '2px'
                }}>
                  {line}
                </div>
              ))}
            </div>

            {/* Command Input */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <input
                type="text"
                placeholder="Enter command (type HELP for commands)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      handleCommand(input.value);
                      input.value = '';
                    }
                  }
                }}
                style={{
                  flex: 1,
                  background: '#000000',
                  border: '2px solid #00aa00',
                  color: '#00ff00',
                  padding: '12px',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  borderRadius: '4px'
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  if (input?.value.trim()) {
                    handleCommand(input.value);
                    input.value = '';
                  }
                }}
                style={{
                  background: 'linear-gradient(145deg, #00aa00, #008800)',
                  border: '2px solid #00ff00',
                  color: '#ffffff',
                  padding: '12px 20px',
                  fontSize: '16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                EXECUTE
              </button>
            </div>

            {/* Customer Information */}
            {currentCustomer && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '2px solid #00aa00',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>
                  Current Customer: {currentCustomer.name}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '15px'
                }}>
                  {/* Transaction Details */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid #00ff00',
                    padding: '12px',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff00', marginBottom: '8px' }}>
                      TRANSACTION REQUEST
                    </div>
                    <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: '1.6', fontFamily: 'monospace' }}>
                      <div><strong>TYPE:</strong> {currentCustomer.transaction.type.toUpperCase()}</div>
                      <div><strong>AMOUNT:</strong> ${currentCustomer.transaction.amount.toLocaleString()}</div>
                      <div><strong>ACCOUNT:</strong> {currentCustomer.transaction.accountNumber}</div>
                    </div>
                  </div>

                  {/* Account Information */}
                  {verificationState.accountLookedUp && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '2px solid #00ff00',
                      padding: '12px',
                      borderRadius: '4px'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff00', marginBottom: '8px' }}>
                        ACCOUNT INFORMATION
                      </div>
                      <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: '1.6', fontFamily: 'monospace' }}>
                        <div><strong>ACCOUNT:</strong> {currentCustomer.transaction.accountNumber}</div>
                        <div><strong>TYPE:</strong> CHECKING</div>
                        <div><strong>BALANCE:</strong> ${accountBalance.toLocaleString()}</div>
                        <div><strong>STATUS:</strong> ACTIVE</div>
                        <div><strong>OPENED:</strong> 2020-01-15</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Documents Display */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>Customer Documents:</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '10px'
                  }}>
                    {currentCustomer.documents.map((doc, index) => (
                      <div key={index} style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: '#000000',
                        padding: '10px',
                        borderRadius: '5px',
                        fontSize: '12px',
                        border: doc.isValid ? '2px solid #00aa00' : '2px solid #aa0000'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {doc.type.toUpperCase()}
                        </div>
                        {Object.entries(doc.data).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key.toUpperCase()}:</strong> {value}
                          </div>
                        ))}
                        {!doc.isValid && doc.hasError && (
                          <div style={{ color: '#aa0000', fontWeight: 'bold', marginTop: '5px' }}>
                            ⚠️ {doc.hasError}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div>
            {/* Score Panel */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.8)',
              border: '2px solid #00aa00',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>Performance</h3>
              <div style={{ fontSize: '16px', lineHeight: '1.8' }}>
                <div><strong>Score:</strong> {gameScore.score}</div>
                <div><strong>Correct:</strong> {gameScore.correctTransactions}</div>
                <div><strong>Errors:</strong> {gameScore.errors}</div>
                <div><strong>Time:</strong> {Math.floor(gameScore.timeOnShift / 60)}:{(gameScore.timeOnShift % 60).toString().padStart(2, '0')}</div>
                <div><strong>Fraud Approvals:</strong> {gameScore.fraudulentApprovals}</div>
              </div>
            </div>

            {/* Quick Commands */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.8)',
              border: '2px solid #00aa00',
              borderRadius: '10px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>Quick Commands</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => handleCommand('NEXT')}
                  style={{
                    background: 'rgba(0, 100, 0, 0.6)',
                    border: '2px solid #00ff00',
                    color: '#00ff00',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  CALL CUSTOMER
                </button>
                
                {currentCustomer && (
                  <>
                    <button
                      onClick={() => handleCommand('LOOKUP ' + currentCustomer.transaction.accountNumber)}
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
                      onClick={() => handleCommand('COMPARE SIGNATURE')}
                      disabled={!verificationState.accountLookedUp || verificationState.signatureCompared}
                      style={{
                        background: verificationState.signatureCompared ? 
                          (verificationState.signatureFraud ? 'rgba(100, 0, 0, 0.8)' : 'rgba(0, 100, 0, 0.8)') : 
                          'rgba(100, 100, 0, 0.6)',
                        border: '2px solid ' + (verificationState.signatureCompared ? 
                          (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : '#ffff00'),
                        color: verificationState.signatureCompared ? 
                          (verificationState.signatureFraud ? '#ff0000' : '#00ff00') : '#ffff00',
                        padding: '10px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: (!verificationState.accountLookedUp || verificationState.signatureCompared) ? 'not-allowed' : 'pointer',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {verificationState.signatureCompared ? 
                        (verificationState.signatureFraud ? '⚠️ FRAUD DETECTED' : '✓ SIGNATURE OK') : 
                        'COMPARE SIGNATURE'}
                    </button>
                    
                    {verificationState.accountLookedUp && verificationState.signatureCompared && !verificationState.transactionProcessed && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleCommand('APPROVE')}
                          style={{
                            background: 'linear-gradient(145deg, #00aa00, #008800)',
                            border: '2px solid #00ff00',
                            color: '#ffffff',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            flex: 1
                          }}
                        >
                          APPROVE
                        </button>
                        <button
                          onClick={() => handleCommand('REJECT')}
                          style={{
                            background: 'linear-gradient(145deg, #aa0000, #880000)',
                            border: '2px solid #ff0000',
                            color: '#ffffff',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            flex: 1
                          }}
                        >
                          REJECT
                        </button>
                      </div>
                    )}
                  </>
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