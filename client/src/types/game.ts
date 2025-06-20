export interface Customer {
  id: string;
  name: string;
  sprite: string;
  transaction: Transaction;
  documents: Document[];
  suspiciousLevel: number;
  patience: number;
  maxPatience: number;
  isFraudulent: boolean;
}

export interface Transaction {
  type: 'deposit' | 'withdrawal' | 'transfer' | 'wire_transfer' | 'cashiers_check' | 'money_order' | 'inquiry';
  amount: number;
  accountNumber: string;
  targetAccount?: string;
  recipientName?: string;
  wireRoutingNumber?: string;
}

export interface Document {
  id: string;
  type: 'id' | 'bank_book' | 'slip' | 'signature';
  data: {
    name?: string;
    accountNumber?: string;
    amount?: number;
    signature?: string;
    [key: string]: any;
  };
  isValid: boolean;
  hasError?: string;
}

export interface GameState {
  phase: 'intro' | 'working' | 'supervisor' | 'ended';
  currentCustomer: Customer | null;
  score: number;
  time: number;
  maxTime: number;
  mistakes: number;
  maxMistakes: number;
  level: number;
  completedTransactions: number;
  selectedDocument: Document | null;
  processingState: 'idle' | 'reviewing' | 'processing' | 'complete';
  supervisorMessage: string | null;
}

export interface SoundEffects {
  typing: HTMLAudioElement;
  stamp: HTMLAudioElement;
  drawer: HTMLAudioElement;
  cash: HTMLAudioElement;
  receipt: HTMLAudioElement;
  warning: HTMLAudioElement;
}
