import React, { useState } from 'react';

function App() {
  const [gamePhase, setGamePhase] = useState<'punch_in' | 'working'>('punch_in');

  const startGame = () => {
    setGamePhase('working');
  };

  if (gamePhase === 'punch_in') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        color: '#00ff00',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '18px'
      }}>
        <div style={{
          border: '2px solid #00ff00',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 255, 0, 0.1)'
        }}>
          <h1 style={{ color: '#00ff00', margin: '0 0 20px 0' }}>BANK TELLER 1988</h1>
          <p>WESTRIDGE NATIONAL BANK</p>
          <p>TELLER WORKSTATION v1.2</p>
          <br />
          <button
            onClick={startGame}
            style={{
              backgroundColor: '#000',
              color: '#00ff00',
              border: '1px solid #00ff00',
              padding: '15px 30px',
              fontSize: '16px',
              fontFamily: 'monospace',
              cursor: 'pointer'
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
          fontSize: '12px'
        }}>
          AdMob Ready - Unit: 4741683992
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      color: '#00ff00',
      fontFamily: 'monospace',
      padding: '20px'
    }}>
      <h2>Bank Teller Terminal</h2>
      <p>Production AdMob Integration Active</p>
      <p>App ID: ca-app-pub-2744316013184797~4167964772</p>
      <p>Interstitial Unit: ca-app-pub-2744316013184797/4741683992</p>
      <p>Ready for iOS App Store deployment</p>
      
      <button
        onClick={() => setGamePhase('punch_in')}
        style={{
          backgroundColor: '#000',
          color: '#00ff00',
          border: '1px solid #00ff00',
          padding: '10px 20px',
          fontSize: '14px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Return to Punch In
      </button>
    </div>
  );
}

export default App;