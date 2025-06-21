import { GameState, Customer } from '../types/game';
import { generateCustomer, validateDocuments } from './customers';

export class GameLogic {
  private gameState: GameState;
  private onStateChange: (state: GameState) => void;
  private gameLoop: number | null = null;
  
  constructor(onStateChange: (state: GameState) => void) {
    this.onStateChange = onStateChange;
    this.gameState = this.getInitialState();
  }
  
  private getInitialState(): GameState {
    return {
      phase: 'intro',
      currentCustomer: null,
      score: 0,
      time: 480, // 8 hours in minutes
      maxTime: 480,
      mistakes: 0,
      maxMistakes: 5,
      level: 1,
      completedTransactions: 0,
      selectedDocument: null,
      processingState: 'idle',
      supervisorMessage: null
    };
  }
  
  startGame(): void {
    this.gameState = { ...this.getInitialState(), phase: 'working' };
    this.spawnNewCustomer();
    this.startGameLoop();
    this.onStateChange(this.gameState);
  }
  
  private startGameLoop(): void {
    this.gameLoop = window.setInterval(() => {
      this.updateGame();
    }, 100); // Update every 100ms
  }
  
  private updateGame(): void {
    if (this.gameState.phase !== 'working') return;
    
    // Decrease time
    this.gameState.time -= 0.1; // Decrease by 0.1 minutes (6 seconds)
    
    // Update customer patience
    if (this.gameState.currentCustomer) {
      this.gameState.currentCustomer.patience -= 0.2;
      
      if (this.gameState.currentCustomer.patience <= 0) {
        this.handleCustomerTimeout();
      }
    }
    
    // Check game end conditions
    if (this.gameState.time <= 0) {
      this.endGame();
    } else if (this.gameState.mistakes >= this.gameState.maxMistakes) {
      this.showSupervisor('Too many mistakes! Your shift is over!');
    }
    
    this.onStateChange(this.gameState);
  }
  
  private spawnNewCustomer(): void {
    this.gameState.currentCustomer = generateCustomer(this.gameState.level);
    this.gameState.processingState = 'idle';
    this.gameState.selectedDocument = null;
  }
  
  selectDocument(documentId: string): void {
    if (!this.gameState.currentCustomer) return;
    
    const document = this.gameState.currentCustomer.documents.find(d => d.id === documentId);
    if (document) {
      this.gameState.selectedDocument = document;
      this.onStateChange(this.gameState);
    }
  }
  
  processTransaction(): void {
    if (!this.gameState.currentCustomer || this.gameState.processingState !== 'idle') return;
    
    this.gameState.processingState = 'reviewing';
    
    // Validate all documents
    const validation = validateDocuments(this.gameState.currentCustomer.documents);
    
    setTimeout(() => {
      if (validation.isValid) {
        this.approveTransaction();
      } else {
        this.handleTransactionError(validation.errors);
      }
    }, 2000); // 2 second processing delay
  }
  
  private approveTransaction(): void {
    if (!this.gameState.currentCustomer) return;
    
    this.gameState.processingState = 'complete';
    this.gameState.score += 100;
    this.gameState.completedTransactions++;
    
    // Level up every 5 transactions
    if (this.gameState.completedTransactions % 5 === 0) {
      this.gameState.level++;
    }
    
    setTimeout(() => {
      this.spawnNewCustomer();
      this.onStateChange(this.gameState);
    }, 1500);
  }
  
  rejectTransaction(): void {
    if (!this.gameState.currentCustomer) return;
    
    const validation = validateDocuments(this.gameState.currentCustomer.documents);
    
    if (!validation.isValid) {
      // Correct rejection
      this.gameState.score += 150; // Bonus for catching fraud
      this.gameState.completedTransactions++;
      
      setTimeout(() => {
        this.spawnNewCustomer();
        this.onStateChange(this.gameState);
      }, 1000);
    } else {
      // Incorrect rejection
      this.gameState.mistakes++;
      this.gameState.score -= 50;
      
      if (this.gameState.mistakes >= 3) {
        this.showSupervisor('Be more careful with rejections!');
      }
      
      // Customer gets upset but transaction continues
      this.gameState.currentCustomer.patience -= 30;
    }
  }
  
  private handleTransactionError(errors: string[]): void {
    this.gameState.mistakes++;
    this.gameState.score -= 25;
    
    if (this.gameState.mistakes >= 2) {
      this.showSupervisor(`Mistake detected: ${errors[0]}`);
    }
    
    // Reset for another attempt
    this.gameState.processingState = 'idle';
  }
  
  private handleCustomerTimeout(): void {
    this.gameState.mistakes++;
    this.gameState.score -= 75;
    
    this.showSupervisor('Customer left due to long wait time!');
    
    setTimeout(() => {
      this.spawnNewCustomer();
      this.onStateChange(this.gameState);
    }, 2000);
  }
  
  private showSupervisor(message: string): void {
    this.gameState.supervisorMessage = message;
    this.gameState.phase = 'supervisor';
    
    setTimeout(() => {
      this.gameState.supervisorMessage = null;
      if (this.gameState.mistakes >= this.gameState.maxMistakes) {
        this.endGame();
      } else {
        this.gameState.phase = 'working';
        this.onStateChange(this.gameState);
      }
    }, 3000);
  }
  
  private endGame(): void {
    this.gameState.phase = 'ended';
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    this.onStateChange(this.gameState);
  }
  
  restartGame(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    this.startGame();
  }
  
  getGameState(): GameState {
    return this.gameState;
  }
  
  destroy(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }
}
