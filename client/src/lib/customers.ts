import { Customer, Transaction, Document } from '../types/game';

const CUSTOMER_NAMES = [
  'John Smith', 'Mary Johnson', 'Robert Brown', 'Patricia Davis',
  'Michael Wilson', 'Linda Miller', 'William Moore', 'Elizabeth Taylor',
  'David Anderson', 'Barbara Thomas', 'Richard Jackson', 'Susan White',
  'Charles Harris', 'Jessica Martin', 'Joseph Thompson', 'Sarah Garcia'
];

const SUSPICIOUS_PATTERNS = [
  { type: 'name_mismatch', description: 'ID name doesn\'t match transaction slip' },
  { type: 'amount_mismatch', description: 'Amounts don\'t match between documents' },
  { type: 'account_invalid', description: 'Invalid account number format' },
  { type: 'signature_fake', description: 'Signature doesn\'t match records' },
  { type: 'large_amount', description: 'Unusually large transaction amount' },
  { type: 'fake_id', description: 'ID appears to be counterfeit' }
];

export function generateCustomer(level: number): Customer {
  const id = Math.random().toString(36).substr(2, 9);
  const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  const suspiciousLevel = Math.random() < (level * 0.15) ? Math.floor(Math.random() * 3) + 1 : 0;
  
  const transaction = generateTransaction(level, suspiciousLevel);
  const documents = generateDocuments(name, transaction, suspiciousLevel);
  
  return {
    id,
    name,
    sprite: `customer_${Math.floor(Math.random() * 4) + 1}`,
    transaction,
    documents,
    suspiciousLevel,
    patience: 100,
    maxPatience: 100 - (level * 5)
  };
}

function generateTransaction(level: number, suspiciousLevel: number): Transaction {
  const types: Transaction['type'][] = ['deposit', 'withdrawal', 'transfer'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let amount = Math.floor(Math.random() * 1000) + 50;
  if (level > 3) amount *= 2;
  if (suspiciousLevel > 0 && Math.random() < 0.3) {
    amount *= 10; // Suspiciously large amount
  }
  
  const accountNumber = generateAccountNumber();
  const targetAccount = type === 'transfer' ? generateAccountNumber() : undefined;
  
  return {
    type,
    amount,
    accountNumber,
    targetAccount
  };
}

function generateDocuments(customerName: string, transaction: Transaction, suspiciousLevel: number): Document[] {
  const documents: Document[] = [];
  
  // ID Document
  let idName = customerName;
  let hasNameError = false;
  if (suspiciousLevel > 0 && Math.random() < 0.4) {
    idName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    hasNameError = true;
  }
  
  documents.push({
    id: 'id_card',
    type: 'id',
    data: {
      name: idName,
      idNumber: Math.random().toString(36).substr(2, 9).toUpperCase()
    },
    isValid: !hasNameError,
    hasError: hasNameError ? 'Name mismatch with transaction slip' : undefined
  });
  
  // Transaction Slip
  let slipAmount = transaction.amount;
  let hasAmountError = false;
  if (suspiciousLevel > 0 && Math.random() < 0.3) {
    slipAmount = transaction.amount + Math.floor(Math.random() * 200) - 100;
    hasAmountError = true;
  }
  
  documents.push({
    id: 'transaction_slip',
    type: 'slip',
    data: {
      name: customerName,
      amount: slipAmount,
      accountNumber: transaction.accountNumber,
      targetAccount: transaction.targetAccount,
      type: transaction.type
    },
    isValid: !hasAmountError,
    hasError: hasAmountError ? 'Amount doesn\'t match bank book' : undefined
  });
  
  // Bank Book
  let bookAccount = transaction.accountNumber;
  let hasAccountError = false;
  if (suspiciousLevel > 0 && Math.random() < 0.25) {
    bookAccount = generateAccountNumber();
    hasAccountError = true;
  }
  
  documents.push({
    id: 'bank_book',
    type: 'bank_book',
    data: {
      name: customerName,
      accountNumber: bookAccount,
      balance: Math.floor(Math.random() * 5000) + 1000,
      amount: transaction.amount
    },
    isValid: !hasAccountError,
    hasError: hasAccountError ? 'Account number mismatch' : undefined
  });
  
  // Signature
  const isValidSignature = suspiciousLevel === 0 || Math.random() > 0.4;
  documents.push({
    id: 'signature',
    type: 'signature',
    data: {
      signature: generateSignature(customerName),
      name: customerName
    },
    isValid: isValidSignature,
    hasError: !isValidSignature ? 'Signature doesn\'t match records' : undefined
  });
  
  return documents;
}

function generateAccountNumber(): string {
  return Math.floor(Math.random() * 900000000 + 100000000).toString();
}

function generateSignature(name: string): string {
  // Generate a simple signature representation
  return name.split(' ').map(n => n.charAt(0)).join('') + '_signature';
}

export function validateDocuments(documents: Document[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  documents.forEach(doc => {
    if (!doc.isValid && doc.hasError) {
      errors.push(doc.hasError);
    }
  });
  
  // Cross-document validation
  const idDoc = documents.find(d => d.type === 'id');
  const slipDoc = documents.find(d => d.type === 'slip');
  const bookDoc = documents.find(d => d.type === 'bank_book');
  
  if (idDoc && slipDoc && idDoc.data.name !== slipDoc.data.name) {
    errors.push('Name mismatch between ID and transaction slip');
  }
  
  if (slipDoc && bookDoc && slipDoc.data.accountNumber !== bookDoc.data.accountNumber) {
    errors.push('Account number mismatch between slip and bank book');
  }
  
  if (slipDoc && bookDoc && slipDoc.data.amount !== bookDoc.data.amount) {
    errors.push('Amount mismatch between slip and bank book');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
