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
    consecutiveErrors: 0,
    errorDetails: [] as string[],
    customersCalledWithoutService: 0,
    dismissalWarningGiven: false
  });

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

  const startGame = () => {
    setGamePhase('working');
    setCurrentCustomer(generateCustomerLocal());
    setGameInitialized(true);
    playSound('cash');
  };

  const completeTransaction = (isCorrect: boolean) => {
    if (isCorrect) {
      setGameScore(prev => ({
        ...prev,
        score: prev.score + 100,
        correctTransactions: prev.correctTransactions + 1
      }));
      playSound('success');
    } else {
      setGameScore(prev => ({
        ...prev,
        errors: prev.errors + 1
      }));
      playSound('reject');
    }
    
    // Generate next customer
    setCurrentCustomer(generateCustomerLocal());
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
                  
                  {/* Documents */}
                  <div style={{ marginTop: '20px' }}>
                    <h4>Documents:</h4>
                    {currentCustomer.documents.map((doc, index) => (
                      <div key={index} style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#000000',
                        padding: '10px',
                        margin: '5px 0',
                        borderRadius: '5px',
                        fontSize: '12px'
                      }}>
                        <strong>{doc.type.toUpperCase()}:</strong> {doc.data.name || doc.data.accountNumber}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '20px'
                  }}>
                    <button
                      onClick={() => completeTransaction(true)}
                      style={{
                        background: 'linear-gradient(145deg, #00aa00, #008800)',
                        border: '2px solid #00ff00',
                        color: '#ffffff',
                        padding: '10px 20px',
                        fontSize: '14px',
                        borderRadius: '5px',
                        cursor: 'pointer'
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
                        padding: '10px 20px',
                        fontSize: '14px',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      REJECT
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
              <div style={{ fontSize: '16px' }}>
                <p><strong>Score:</strong> {gameScore.score}</p>
                <p><strong>Correct:</strong> {gameScore.correctTransactions}</p>
                <p><strong>Errors:</strong> {gameScore.errors}</p>
                <p><strong>Time:</strong> {Math.floor(gameScore.timeOnShift / 60)}:{(gameScore.timeOnShift % 60).toString().padStart(2, '0')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;