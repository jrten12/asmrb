import React, { useState, useRef, useEffect, useCallback } from 'react';

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

function App() {
  const [gamePhase, setGamePhase] = useState<'punch_in' | 'working' | 'leaderboard' | 'game_over' | 'punch_out' | 'supervisor' | 'police_arrest'>('punch_in');
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

  // AdMob state management
  const [admobInitialized, setAdmobInitialized] = useState(false);
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const [customersServed, setCustomersServed] = useState(0);

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
          if ((window.webkit.messageHandlers as any).admob) {
            (window.webkit.messageHandlers as any).admob.postMessage({
              action: 'initialize',
              appId: 'ca-app-pub-2744316013184797~4167964772', // Production App ID
              testDeviceIds: []
            });
          }
          
          (window as any).admobEvents = {
            onInterstitialLoaded: () => setIsInterstitialLoaded(true),
            onInterstitialFailedToLoad: () => setIsInterstitialLoaded(false)
          };
          
          setAdmobInitialized(true);
        } else {
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

  const startGame = () => {
    setGamePhase('working');
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
          <p style={{ margin: '5px 0', fontSize: '14px' }}>Production AdMob Integration Active</p>
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
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '50px',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          border: '1px solid #00ff00',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '12px',
          fontFamily: 'monospace',
          borderRadius: '4px'
        }}>
          AdMob Ready - Unit: ca-app-pub-2744316013184797/4741683992
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

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      color: '#00ff00',
      fontFamily: 'Share Tech Mono, monospace',
      padding: '20px',
      position: 'relative'
    }}>
      <h2 style={{ textShadow: '0 0 10px #00ff00' }}>Bank Teller Terminal</h2>
      <p>Score: {gameScore.score}</p>
      <p>Transactions: {gameScore.correctTransactions}</p>
      <p>Customers Served: {customersServed}</p>
      <p>Production AdMob Integration: ACTIVE</p>
      <p>App ID: ca-app-pub-2744316013184797~4167964772</p>
      <p>Interstitial Unit: ca-app-pub-2744316013184797/4741683992</p>
      <br />
      <p>Ready for iOS App Store deployment with EAS build</p>
      
      <button
        onClick={handleCorrectTransaction}
        style={{
          backgroundColor: '#000',
          color: '#00ff00',
          border: '1px solid #00ff00',
          padding: '10px 20px',
          fontSize: '14px',
          fontFamily: 'Share Tech Mono, monospace',
          cursor: 'pointer',
          marginTop: '20px',
          marginRight: '10px'
        }}
      >
        Process Transaction (+100 pts)
      </button>
      
      <button
        onClick={() => setGamePhase('punch_in')}
        style={{
          backgroundColor: '#000',
          color: '#00ff00',
          border: '1px solid #00ff00',
          padding: '10px 20px',
          fontSize: '14px',
          fontFamily: 'Share Tech Mono, monospace',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Return to Punch In
      </button>

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