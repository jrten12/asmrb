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
  
  // Account lookup state (no automatic fraud detection)
  const [accountBalance, setAccountBalance] = useState(0);
  const [verificationState, setVerificationState] = useState({
    accountLookedUp: false,
    signatureCompared: false
  });

  // AdMob state management
  const [admobInitialized, setAdmobInitialized] = useState(false);
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);

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
          audio.volume = 0.4;
          break;
        case 'warning':
          audio = new Audio('/dot-matrix-printer.mp3');
          audio.volume = 0.5;
          break;
        default:
          return;
      }
      
      audio.play().catch(() => {
        // Silently handle audio failures
      });
    } catch (error) {
      // Silently handle audio creation failures
    }
  };

  // AdMob integration with production IDs
  const loadInterstitialAd = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && (window.webkit.messageHandlers as any).admob) {
        (window.webkit.messageHandlers as any).admob.postMessage({
          action: 'loadInterstitial',
          adUnitId: 'ca-app-pub-2744316013184797/4741683992'
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
        setTimeout(loadInterstitialAd, 1000);
      }
    } catch (error) {
      console.log('AdMob showInterstitialAd error (web environment):', error);
    }
  }, [isInterstitialLoaded, loadInterstitialAd]);

  // Initialize AdMob
  useEffect(() => {
    const initializeAdMob = () => {
      try {
        if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers) {
          if ((window.webkit.messageHandlers as any).admob) {
            (window.webkit.messageHandlers as any).admob.postMessage({
              action: 'initialize',
              appId: 'ca-app-pub-2744316013184797~4167964772',
              testDeviceIds: []
            });
          }
          
          (window as any).admobEvents = {
            onInterstitialLoaded: () => setIsInterstitialLoaded(true),
            onInterstitialFailedToLoad: () => setIsInterstitialLoaded(false)
          };
          
          setAdmobInitialized(true);
        } else {
          setAdmobInitialized(true);
          setIsInterstitialLoaded(true);
        }
      } catch (error) {
        setAdmobInitialized(true);
        setIsInterstitialLoaded(true);
      }
    };

    initializeAdMob();
  }, []);

  useEffect(() => {
    if (admobInitialized) {
      try {
        loadInterstitialAd();
      } catch (error) {
        console.log('Error loading initial ad (web environment):', error);
      }
    }
  }, [admobInitialized, loadInterstitialAd]);

  // Generate customer with full document system
  const generateCustomerLocal = (): Customer => {
    const customer = generateCustomer(1);
    const documents = generateDocuments(customer.name, customer.transaction, customer.suspiciousLevel);
    
    return {
      ...customer,
      documents: documents.map(doc => ({
        id: `${customer.id}-${doc.type}`,
        type: doc.type as 'id' | 'bank_book' | 'slip' | 'signature',
        data: doc.data,
        isValid: doc.isValid,
        hasError: doc.hasError
      }))
    };
  };

  // Start game and generate first customer
  const startGame = () => {
    const customer = generateCustomerLocal();
    setCurrentCustomer(customer);
    setGamePhase('working');
    setGameInitialized(true);
    playSound('punch_clock');
    setTerminalOutput([
      "SHIFT STARTED",
      "CUSTOMER APPROACHING WINDOW",
      "",
      `Customer: ${customer.name}`,
      `Transaction: ${customer.transaction.type.toUpperCase()}`,
      `Amount: $${customer.transaction.amount.toFixed(2)}`,
      "",
      "Use LOOKUP to verify account",
      "Use VERIFY to check documents",
      "Use APPROVE or REJECT"
    ]);
  };

  // Process terminal commands
  const processCommand = (command: string) => {
    if (!currentCustomer) return;
    
    const cmd = command.toLowerCase().trim();
    playSound('typing');
    
    switch (cmd) {
      case 'lookup':
        if (!verificationState.accountLookedUp) {
          const balance = Math.floor(Math.random() * 50000) + 1000;
          setAccountBalance(balance);
          setVerificationState(prev => ({ ...prev, accountLookedUp: true }));
          setTerminalOutput(prev => [...prev, 
            "",
            `ACCOUNT LOOKUP: ${currentCustomer.transaction.accountNumber}`,
            `Balance: $${balance.toFixed(2)}`,
            `Status: ACTIVE`,
            ""
          ]);
        }
        break;
        
      case 'verify':
        if (!verificationState.signatureCompared) {
          setVerificationState(prev => ({ ...prev, signatureCompared: true }));
          const sigDoc = currentCustomer.documents.find(d => d.type === 'signature');
          if (sigDoc) {
            const analysis = analyzeSignature(sigDoc.data.signature || '', currentCustomer.name);
            setTerminalOutput(prev => [...prev,
              "",
              "SIGNATURE ANALYSIS:",
              `Match confidence: ${analysis.confidence}%`,
              `Authentic: ${analysis.isAuthentic ? 'YES' : 'NO'}`,
              `Notes: ${analysis.notes.join(', ')}`,
              ""
            ]);
          }
        }
        break;
        
      case 'approve':
        handleApproval();
        break;
        
      case 'reject':
        handleRejection();
        break;
        
      default:
        setTerminalOutput(prev => [...prev, `Unknown command: ${command}`]);
    }
    
    setTerminalInput('');
  };

  // Handle transaction approval
  const handleApproval = () => {
    if (!currentCustomer) return;
    
    playSound('cash');
    
    // Check if customer is actually fraudulent
    const isFraudulent = currentCustomer.isFraudulent;
    
    if (isFraudulent) {
      // Player approved a fraudulent transaction
      setGameScore(prev => ({
        ...prev,
        errors: prev.errors + 1,
        fraudulentApprovals: prev.fraudulentApprovals + 1,
        consecutiveErrors: prev.consecutiveErrors + 1,
        errorDetails: [...prev.errorDetails, `Approved fraudulent ${currentCustomer.transaction.type} for ${currentCustomer.name}`]
      }));
      
      setTerminalOutput(prev => [...prev,
        "",
        "TRANSACTION APPROVED",
        "*** SECURITY ALERT ***",
        "Fraudulent transaction detected",
        "",
        "Supervisor notified"
      ]);
      
      // Show interstitial ad occasionally
      if (Math.random() < 0.2) {
        showInterstitialAd();
      }
      
      setTimeout(() => {
        setGamePhase('supervisor');
      }, 2000);
    } else {
      // Correct approval
      setGameScore(prev => ({
        ...prev,
        score: prev.score + 100,
        correctTransactions: prev.correctTransactions + 1,
        consecutiveErrors: 0
      }));
      
      setTerminalOutput(prev => [...prev,
        "",
        "TRANSACTION APPROVED",
        "Processing...",
        "Transaction complete",
        "+100 points"
      ]);
      
      // Show interstitial ad every 5 customers
      if ((gameScore.correctTransactions + 1) % 5 === 0) {
        showInterstitialAd();
      }
      
      setTimeout(nextCustomer, 2000);
    }
  };

  // Handle transaction rejection  
  const handleRejection = () => {
    if (!currentCustomer) return;
    
    playSound('reject');
    
    const isFraudulent = currentCustomer.isFraudulent;
    
    if (isFraudulent) {
      // Correct rejection
      setGameScore(prev => ({
        ...prev,
        score: prev.score + 200,
        correctTransactions: prev.correctTransactions + 1,
        consecutiveErrors: 0
      }));
      
      setTerminalOutput(prev => [...prev,
        "",
        "TRANSACTION REJECTED",
        "Fraud detected successfully",
        "+200 points"
      ]);
    } else {
      // Incorrect rejection
      setGameScore(prev => ({
        ...prev,
        errors: prev.errors + 1,
        consecutiveErrors: prev.consecutiveErrors + 1,
        errorDetails: [...prev.errorDetails, `Rejected legitimate ${currentCustomer.transaction.type} for ${currentCustomer.name}`]
      }));
      
      setTerminalOutput(prev => [...prev,
        "",
        "TRANSACTION REJECTED",
        "*** WARNING ***",
        "Legitimate transaction rejected",
        "Customer complaint filed"
      ]);
    }
    
    setTimeout(nextCustomer, 2000);
  };

  // Generate next customer
  const nextCustomer = () => {
    const customer = generateCustomerLocal();
    setCurrentCustomer(customer);
    setVerificationState({ accountLookedUp: false, signatureCompared: false });
    setSelectedDocument(null);
    
    setTerminalOutput([
      "NEXT CUSTOMER",
      "",
      `Customer: ${customer.name}`,
      `Transaction: ${customer.transaction.type.toUpperCase()}`,
      `Amount: $${customer.transaction.amount.toFixed(2)}`,
      "",
      "Use LOOKUP to verify account",
      "Use VERIFY to check documents",
      "Use APPROVE or REJECT"
    ]);
  };

  // Render document with canvas
  const renderDocument = (doc: GameDocument, index: number) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const renderer = getDocumentRenderer(doc.type);
          renderer.render(ctx, doc, 0, 0, canvas.width, canvas.height);
        }
      }
    }, [doc]);

    return (
      <div
        key={doc.id}
        className={`document-viewer ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
        onClick={() => setSelectedDocument(doc)}
        style={{
          border: selectedDocument?.id === doc.id ? '2px solid #00ff00' : '1px solid #00ff00',
          backgroundColor: 'rgba(0, 255, 0, 0.05)',
          padding: '10px',
          margin: '5px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}
      >
        <h4 style={{ color: '#00ff00', margin: '0 0 10px 0', fontSize: '14px' }}>
          {doc.type.toUpperCase()} DOCUMENT
        </h4>
        <canvas
          ref={canvasRef}
          width={200}
          height={120}
          style={{
            border: '1px solid #00ff00',
            backgroundColor: '#000',
            display: 'block',
            width: '100%',
            maxWidth: '200px'
          }}
        />
        {doc.hasError && (
          <div style={{ color: '#ff0000', fontSize: '12px', marginTop: '5px', fontFamily: 'monospace' }}>
            Error: {doc.hasError}
          </div>
        )}
      </div>
    );
  };

  // Supervisor phase
  if (gamePhase === 'supervisor') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        color: '#00ff00',
        fontFamily: 'Share Tech Mono, monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{
          border: '2px solid #ff0000',
          padding: '30px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          borderRadius: '8px',
          maxWidth: '600px'
        }}>
          <h2 style={{ color: '#ff0000', textShadow: '0 0 10px #ff0000' }}>
            SUPERVISOR MEETING
          </h2>
          <p style={{ color: '#00ff00', margin: '20px 0' }}>
            You approved a fraudulent transaction. This is a serious security breach.
          </p>
          <p style={{ color: '#00ff00', margin: '20px 0' }}>
            Score: {gameScore.score} | Errors: {gameScore.errors} | Fraud Approved: {gameScore.fraudulentApprovals}
          </p>
          {gameScore.fraudulentApprovals >= 3 && (
            <p style={{ color: '#ff0000', margin: '20px 0' }}>
              Too many security breaches. You are being terminated.
            </p>
          )}
          <button
            onClick={() => {
              if (gameScore.fraudulentApprovals >= 3) {
                setGamePhase('game_over');
              } else {
                nextCustomer();
                setGamePhase('working');
              }
            }}
            style={{
              backgroundColor: '#000',
              color: '#00ff00',
              border: '2px solid #00ff00',
              padding: '15px 30px',
              fontSize: '16px',
              fontFamily: 'Share Tech Mono, monospace',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            {gameScore.fraudulentApprovals >= 3 ? 'ACKNOWLEDGE TERMINATION' : 'RETURN TO WORK'}
          </button>
        </div>
      </div>
    );
  }

  // Game over phase
  if (gamePhase === 'game_over') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        color: '#00ff00',
        fontFamily: 'Share Tech Mono, monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{
          border: '2px solid #ff0000',
          padding: '30px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          borderRadius: '8px'
        }}>
          <h2 style={{ color: '#ff0000', textShadow: '0 0 10px #ff0000' }}>
            EMPLOYMENT TERMINATED
          </h2>
          <p style={{ color: '#00ff00', margin: '20px 0' }}>
            Final Score: {gameScore.score}
          </p>
          <p style={{ color: '#00ff00', margin: '10px 0' }}>
            Correct Transactions: {gameScore.correctTransactions}
          </p>
          <p style={{ color: '#00ff00', margin: '10px 0' }}>
            Errors: {gameScore.errors}
          </p>
          <p style={{ color: '#00ff00', margin: '10px 0' }}>
            Fraudulent Approvals: {gameScore.fraudulentApprovals}
          </p>
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
              setVerificationState({ accountLookedUp: false, signatureCompared: false });
            }}
            style={{
              backgroundColor: '#000',
              color: '#00ff00',
              border: '2px solid #00ff00',
              padding: '15px 30px',
              fontSize: '16px',
              fontFamily: 'Share Tech Mono, monospace',
              cursor: 'pointer',
              borderRadius: '4px',
              marginTop: '20px'
            }}
          >
            APPLY FOR NEW POSITION
          </button>
        </div>
      </div>
    );
  }

  // Punch in screen
  if (gamePhase === 'punch_in') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        color: '#00ff00',
        fontFamily: 'Share Tech Mono, monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '18px',
        position: 'relative'
      }}>
        <div style={{
          border: '2px solid #00ff00',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          borderRadius: '8px'
        }}>
          <h1 style={{ color: '#00ff00', margin: '0 0 20px 0', textShadow: '0 0 10px #00ff00' }}>
            BANK TELLER 1988
          </h1>
          <p style={{ margin: '5px 0' }}>WESTRIDGE NATIONAL BANK</p>
          <p style={{ margin: '5px 0' }}>TELLER WORKSTATION v1.2</p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>Manual Fraud Detection System</p>
          <br />
          <button
            onClick={startGame}
            style={{
              backgroundColor: '#000',
              color: '#00ff00',
              border: '2px solid #00ff00',
              padding: '15px 30px',
              fontSize: '16px',
              fontFamily: 'Share Tech Mono, monospace',
              cursor: 'pointer',
              borderRadius: '4px',
              textShadow: '0 0 5px #00ff00',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000';
            }}
          >
            PUNCH IN TO START SHIFT
          </button>
        </div>
        
        {/* AdMob Banner */}
        <AdMobBannerAd
          adUnitId="ca-app-pub-2744316013184797/1234567890"
          testDeviceID="test-device-id"
        />

        {/* CRT Scanlines Effect */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
          zIndex: 1000
        }} />
      </div>
    );
  }

  // Main game screen
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      color: '#00ff00',
      fontFamily: 'Share Tech Mono, monospace',
      display: 'flex',
      position: 'relative'
    }}>
      {/* Left panel - Terminal */}
      <div style={{
        width: '40%',
        height: '100%',
        borderRight: '2px solid #00ff00',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Terminal output */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
          backgroundColor: 'rgba(0, 255, 0, 0.05)',
          border: '1px solid #00ff00',
          margin: '10px'
        }}>
          {terminalOutput.map((line, index) => (
            <div key={index} style={{ margin: '2px 0', fontSize: '14px' }}>
              {line}
            </div>
          ))}
        </div>
        
        {/* Command input */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            Commands: LOOKUP | VERIFY | APPROVE | REJECT
          </div>
          <input
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                processCommand(terminalInput);
              }
            }}
            style={{
              width: '100%',
              backgroundColor: '#000',
              color: '#00ff00',
              border: '1px solid #00ff00',
              padding: '10px',
              fontSize: '14px',
              fontFamily: 'Share Tech Mono, monospace'
            }}
            placeholder="Enter command..."
          />
        </div>
        
        {/* Score display */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #00ff00',
          backgroundColor: 'rgba(0, 255, 0, 0.05)'
        }}>
          <div style={{ fontSize: '14px' }}>
            Score: {gameScore.score} | Correct: {gameScore.correctTransactions} | Errors: {gameScore.errors}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Fraud Approvals: {gameScore.fraudulentApprovals}
          </div>
        </div>
      </div>

      {/* Right panel - Documents */}
      <div style={{
        width: '60%',
        height: '100%',
        padding: '20px',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 20px 0', textShadow: '0 0 10px #00ff00' }}>
          CUSTOMER DOCUMENTS
        </h3>
        
        {currentCustomer && (
          <>
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              border: '1px solid #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.05)',
              borderRadius: '4px'
            }}>
              <p style={{ margin: '5px 0' }}>Customer: {currentCustomer.name}</p>
              <p style={{ margin: '5px 0' }}>
                Transaction: {currentCustomer.transaction.type.toUpperCase()} 
                ${currentCustomer.transaction.amount.toFixed(2)}
              </p>
              <p style={{ margin: '5px 0' }}>
                Account: {currentCustomer.transaction.accountNumber}
              </p>
              {verificationState.accountLookedUp && (
                <p style={{ margin: '5px 0', color: '#ffff00' }}>
                  Balance: ${accountBalance.toFixed(2)}
                </p>
              )}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '15px'
            }}>
              {currentCustomer.documents.map((doc, index) => renderDocument(doc, index))}
            </div>
          </>
        )}
      </div>

      {/* CRT Scanlines Effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
        backgroundSize: '100% 4px',
        zIndex: 1000
      }} />
    </div>
  );
}

export default App;