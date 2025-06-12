import React, { useState, useEffect } from 'react';

// Mock React Native components for development
const StyleSheet = {
  create: (styles: any) => styles
};

const View = ({ children, style, ...props }: any) => (
  <div style={style} {...props}>{children}</div>
);

const Text = ({ children, style, ...props }: any) => (
  <span style={style} {...props}>{children}</span>
);

const TouchableOpacity = ({ children, style, onPress, ...props }: any) => (
  <button style={style} onClick={onPress} {...props}>{children}</button>
);

const ScrollView = ({ children, style, ...props }: any) => (
  <div style={{ ...style, overflowY: 'auto' }} {...props}>{children}</div>
);

import AdMobBannerAd from './components/AdMobBannerAd';

// Test AdMob IDs
const BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

interface Customer {
  id: string;
  name: string;
  accountNumber: string;
  transactionType: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  isFraudulent: boolean;
  documents: string[];
}

interface GameState {
  score: number;
  level: number;
  customersProcessed: number;
  fraudDetected: number;
  timeRemaining: number;
}

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    customersProcessed: 0,
    fraudDetected: 0,
    timeRemaining: 300 // 5 minutes
  });
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    // AdMob initialization will be handled when building with EAS
    console.log('AdMob initialized for development');
  }, []);

  useEffect(() => {
    if (gameStarted && gameState.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameState.timeRemaining]);

  const generateCustomer = (): Customer => {
    const names = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'David Brown'];
    const transactionTypes: ('deposit' | 'withdrawal' | 'transfer')[] = ['deposit', 'withdrawal', 'transfer'];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: names[Math.floor(Math.random() * names.length)],
      accountNumber: `ACC${Math.floor(Math.random() * 900000) + 100000}`,
      transactionType: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
      amount: Math.floor(Math.random() * 5000) + 100,
      isFraudulent: Math.random() < 0.3, // 30% chance of fraud
      documents: ['ID Card', 'Account Statement', 'Transaction Slip']
    };
  };

  const startGame = () => {
    setGameStarted(true);
    setCurrentCustomer(generateCustomer());
    setGameState({
      score: 0,
      level: 1,
      customersProcessed: 0,
      fraudDetected: 0,
      timeRemaining: 300
    });
  };

  const processTransaction = (action: 'approve' | 'reject') => {
    if (!currentCustomer) return;

    let scoreChange = 0;
    let fraudDetectedChange = 0;

    // Scoring logic
    if (currentCustomer.isFraudulent && action === 'reject') {
      scoreChange = 100; // Correctly identified fraud
      fraudDetectedChange = 1;
    } else if (!currentCustomer.isFraudulent && action === 'approve') {
      scoreChange = 50; // Correctly approved legitimate transaction
    } else {
      scoreChange = -25; // Incorrect decision
    }

    setGameState(prev => ({
      ...prev,
      score: prev.score + scoreChange,
      customersProcessed: prev.customersProcessed + 1,
      fraudDetected: prev.fraudDetected + fraudDetectedChange,
      level: Math.floor((prev.customersProcessed + 1) / 10) + 1
    }));

    // Generate next customer
    setTimeout(() => {
      setCurrentCustomer(generateCustomer());
      setSelectedAction(null);
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!gameStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.menuContainer}>
          <Text style={styles.title}>TELLER'S WINDOW</Text>
          <Text style={styles.subtitle}>Bank Fraud Detection Simulator</Text>
          <Text style={styles.description}>
            As a bank teller, examine customer documents and detect fraudulent transactions. 
            Look for inconsistencies, suspicious amounts, and forged documents.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>START SHIFT</Text>
          </TouchableOpacity>
        </View>
        
        {/* Banner Ad */}
        <View style={styles.adContainer}>
          <AdMobBannerAd
            adUnitId={BANNER_AD_UNIT_ID}
            bannerSize="smartBannerPortrait"
            testDeviceID="EMULATOR"
            onDidFailToReceiveAdWithError={(error: string) => console.log('Banner ad error:', error)}
          />
        </View>
      </View>
    );
  }

  if (gameState.timeRemaining <= 0) {
    return (
      <View style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>SHIFT COMPLETE</Text>
          <Text style={styles.finalScore}>Final Score: {gameState.score}</Text>
          <Text style={styles.stats}>Customers Processed: {gameState.customersProcessed}</Text>
          <Text style={styles.stats}>Fraud Detected: {gameState.fraudDetected}</Text>
          <Text style={styles.stats}>Level Reached: {gameState.level}</Text>
          <TouchableOpacity style={styles.startButton} onPress={() => setGameStarted(false)}>
            <Text style={styles.startButtonText}>NEW SHIFT</Text>
          </TouchableOpacity>
        </View>
        
        {/* Banner Ad */}
        <View style={styles.adContainer}>
          <AdMobBannerAd
            adUnitId={BANNER_AD_UNIT_ID}
            bannerSize="smartBannerPortrait"
            testDeviceID="EMULATOR"
            onDidFailToReceiveAdWithError={(error: string) => console.log('Banner ad error:', error)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>WESTRIDGE NATIONAL BANK</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>Score: {gameState.score}</Text>
          <Text style={styles.statText}>Level: {gameState.level}</Text>
          <Text style={styles.statText}>Time: {formatTime(gameState.timeRemaining)}</Text>
        </View>
      </View>

      {/* Customer Information */}
      <ScrollView style={styles.gameArea}>
        {currentCustomer && (
          <View style={styles.customerCard}>
            <Text style={styles.customerTitle}>Current Customer</Text>
            <Text style={styles.customerInfo}>Name: {currentCustomer.name}</Text>
            <Text style={styles.customerInfo}>Account: {currentCustomer.accountNumber}</Text>
            <Text style={styles.customerInfo}>
              Transaction: {currentCustomer.transactionType.toUpperCase()}
            </Text>
            <Text style={styles.customerInfo}>Amount: ${currentCustomer.amount.toLocaleString()}</Text>
            
            <View style={styles.documentsSection}>
              <Text style={styles.documentsTitle}>Documents Provided:</Text>
              {currentCustomer.documents.map((doc, index) => (
                <Text key={index} style={styles.documentItem}>• {doc}</Text>
              ))}
            </View>

            {/* Fraud indicators (for demonstration - in real game, player must discover these) */}
            <View style={styles.warningSection}>
              <Text style={styles.warningTitle}>⚠️ Review Carefully:</Text>
              <Text style={styles.warningText}>
                Check signatures, amounts, and account details for inconsistencies
              </Text>
              {currentCustomer.isFraudulent && (
                <Text style={styles.hiddenHint}>
                  [Hidden: This transaction contains fraudulent elements]
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => processTransaction('approve')}
        >
          <Text style={styles.actionButtonText}>APPROVE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => processTransaction('reject')}
        >
          <Text style={styles.actionButtonText}>REJECT</Text>
        </TouchableOpacity>
      </View>

      {/* Banner Ad */}
      <View style={styles.adContainer}>
        <AdMobBannerAd
          adUnitId={BANNER_AD_UNIT_ID}
          bannerSize="smartBannerPortrait"
          testDeviceID="EMULATOR"
          onDidFailToReceiveAdWithError={(error: string) => console.log('Banner ad error:', error)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 18,
    color: '#00cc00',
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  description: {
    fontSize: 14,
    color: '#00aa00',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#003300',
    borderColor: '#00ff00',
    borderWidth: 2,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 5,
  },
  startButtonText: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  header: {
    backgroundColor: '#003300',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#00ff00',
  },
  headerText: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statText: {
    color: '#00cc00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  gameArea: {
    flex: 1,
    padding: 15,
  },
  customerCard: {
    backgroundColor: '#001100',
    borderColor: '#00ff00',
    borderWidth: 1,
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  customerTitle: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  customerInfo: {
    color: '#00cc00',
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  documentsSection: {
    marginTop: 15,
    marginBottom: 15,
  },
  documentsTitle: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  documentItem: {
    color: '#00aa00',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  warningSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#330000',
    borderColor: '#ff6600',
    borderWidth: 1,
    borderRadius: 3,
  },
  warningTitle: {
    color: '#ff6600',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  warningText: {
    color: '#cc4400',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  hiddenHint: {
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 5,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  approveButton: {
    backgroundColor: '#003300',
    borderColor: '#00ff00',
  },
  rejectButton: {
    backgroundColor: '#330000',
    borderColor: '#ff3300',
  },
  actionButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  finalScore: {
    fontSize: 24,
    color: '#00cc00',
    marginBottom: 15,
    fontFamily: 'monospace',
  },
  stats: {
    fontSize: 16,
    color: '#00aa00',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  adContainer: {
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
  },
});