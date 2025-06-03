import { Customer, Transaction, Document } from '../types/game';

const CUSTOMER_NAMES = [
  'John Smith', 'Mary Johnson', 'Robert Brown', 'Patricia Davis',
  'Michael Wilson', 'Linda Miller', 'William Moore', 'Elizabeth Taylor',
  'David Anderson', 'Barbara Thomas', 'Richard Jackson', 'Susan White',
  'Charles Harris', 'Jessica Martin', 'Joseph Thompson', 'Sarah Garcia',
  'Christopher Martinez', 'Nancy Rodriguez', 'Matthew Lopez', 'Betty Lee',
  'Anthony Gonzalez', 'Helen Clark', 'Mark Lewis', 'Sandra Robinson',
  'Paul Walker', 'Donna Hall', 'Steven Allen', 'Carol Young',
  'Kenneth King', 'Ruth Wright', 'Joshua Scott', 'Sharon Green',
  'Kevin Adams', 'Michelle Baker', 'Brian Nelson', 'Lisa Hill',
  'George Ramirez', 'Karen Campbell', 'Edward Mitchell', 'Emily Roberts',
  'Ronald Carter', 'Kimberly Phillips', 'Timothy Evans', 'Deborah Turner',
  'James Washington', 'Maria Fernandez', 'Thomas Anderson', 'Jennifer Clark',
  'Daniel Rodriguez', 'Lisa Martinez', 'Andrew Thompson', 'Angela White',
  'Joshua Williams', 'Amanda Jones', 'Christopher Davis', 'Stephanie Miller',
  'Matthew Garcia', 'Michelle Wilson', 'Anthony Moore', 'Kimberly Taylor',
  'Mark Johnson', 'Amy Brown', 'Steven Jackson', 'Rebecca Lee',
  'Kevin Martin', 'Laura Anderson', 'Brian Thompson', 'Sarah Wilson',
  'Gary Harris', 'Nicole Young', 'Jeffrey King', 'Jessica Scott',
  'Ryan Adams', 'Ashley Green', 'Jacob Baker', 'Samantha Nelson',
  'Nicholas Hill', 'Brittany Wright', 'Jonathan Campbell', 'Megan Roberts',
  'Justin Mitchell', 'Kayla Carter', 'Brandon Phillips', 'Danielle Evans',
  'Tyler Collins', 'Rachel Stewart', 'Aaron Morris', 'Heather Rogers',
  'Jose Reed', 'Julie Cook', 'Adam Bailey', 'Christina Cooper',
  'Nathan Ward', 'Lauren Richardson', 'Zachary Cox', 'Melissa Howard',
  'Jeremy Ward', 'Kelly Torres', 'Sean Peterson', 'Andrea Gray',
  'Luke Ramirez', 'Tiffany James', 'Benjamin Watson', 'Crystal Brooks',
  'Alexander Kelly', 'Vanessa Sanders', 'Samuel Price', 'Amber Bennett',
  'Frank Wood', 'Theresa Barnes', 'Gregory Ross', 'Marie Henderson',
  'Raymond Coleman', 'Diana Jenkins', 'Jesse Perry', 'Janet Powell'
];

const TOWNS = [
  'Millbrook', 'Riverside', 'Fairview', 'Cedar Falls', 'Pine Ridge',
  'Oakwood', 'Sunset Valley', 'Green Hills', 'Silver Creek', 'Maple Grove'
];

const STREET_NAMES = [
  'Oak Street', 'Pine Avenue', 'Elm Drive', 'Cedar Lane', 'Maple Court',
  'Birch Road', 'Willow Way', 'Cherry Street', 'Spruce Avenue', 'Ash Drive',
  'River Road', 'Hill Street', 'Park Avenue', 'Garden Lane', 'Valley Drive',
  'Forest Street', 'Lake Avenue', 'Spring Road', 'Sunset Boulevard', 'Dawn Street'
];

const STATE_NAME = 'Westfield';

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
  
  // 30% fraud rate consistently
  const isFraud = Math.random() < 0.3;
  const suspiciousLevel = isFraud ? Math.floor(Math.random() * 3) + 1 : 0;
  
  const transaction = generateTransaction(level, suspiciousLevel);
  const documents = generateDocuments(name, transaction, suspiciousLevel);
  
  return {
    id,
    name,
    sprite: `customer_${Math.floor(Math.random() * 6) + 1}`,
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
  
  // More varied transaction amounts
  const amountRanges = [
    { min: 50, max: 500 },      // Small transactions
    { min: 500, max: 2000 },    // Medium transactions
    { min: 2000, max: 10000 },  // Large transactions
    { min: 10000, max: 50000 }  // Very large transactions
  ];
  
  const range = amountRanges[Math.floor(Math.random() * amountRanges.length)];
  let amount = Math.floor(Math.random() * (range.max - range.min)) + range.min;
  
  // Adjust for level
  if (level > 3) amount = Math.floor(amount * 1.5);
  
  // Suspiciously large amounts for fraud cases
  if (suspiciousLevel > 0 && Math.random() < 0.4) {
    amount *= 3; // Very suspicious large amount
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
  
  // Generate a realistic birthday (ages 18-80)
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * 62) - 18; // 18-80 years old
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1; // Safe day range for all months
  const realBirthday = `${birthMonth.toString().padStart(2, '0')}/${birthDay.toString().padStart(2, '0')}/${birthYear}`;
  
  // ID Document - 30% fraud rate for name, account, or DOB matching
  const idFraud = Math.random() < 0.3;
  let idName = customerName;
  let idAccountNumber = transaction.accountNumber;
  let idBirthday = realBirthday;
  let hasIdError = false;
  let errorType = '';
  
  if (idFraud) {
    // For fraud cases, mismatch name, account number, or birthday
    const fraudType = Math.floor(Math.random() * 3);
    if (fraudType === 0) {
      idName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
      hasIdError = true;
      errorType = 'Name mismatch with transaction slip';
    } else if (fraudType === 1) {
      idAccountNumber = generateAccountNumber();
      hasIdError = true;
      errorType = 'Account number mismatch';
    } else {
      // Generate a different birthday (within 5 years)
      const altYear = birthYear + Math.floor(Math.random() * 10) - 5;
      const altMonth = Math.floor(Math.random() * 12) + 1;
      const altDay = Math.floor(Math.random() * 28) + 1;
      idBirthday = `${altMonth.toString().padStart(2, '0')}/${altDay.toString().padStart(2, '0')}/${altYear}`;
      hasIdError = true;
      errorType = 'Date of birth mismatch with bank records';
    }
  }
  
  documents.push({
    id: 'id_card',
    type: 'id',
    data: {
      name: idName,
      accountNumber: idAccountNumber,
      address: generateAddress(),
      dateOfBirth: idBirthday,
      idNumber: Math.random().toString(36).substr(2, 9).toUpperCase()
    },
    isValid: !hasIdError,
    hasError: hasIdError ? errorType : undefined
  });
  
  // Transaction Slip - 30% fraud rate for amount matching
  const slipFraud = Math.random() < 0.3;
  let slipAmount = transaction.amount;
  let hasAmountError = false;
  
  if (slipFraud) {
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
  
  // Bank Book - 30% fraud rate for account matching
  const bookFraud = Math.random() < 0.3;
  let bookAccount = transaction.accountNumber;
  let hasAccountError = false;
  
  if (bookFraud) {
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
  
  // Signature - 30% fraud rate for signatures specifically
  const signatureFraud = Math.random() < 0.3;
  documents.push({
    id: 'signature',
    type: 'signature',
    data: {
      signature: generateSignature(customerName, signatureFraud),
      name: customerName
    },
    isValid: !signatureFraud,
    hasError: signatureFraud ? 'Signature doesn\'t match records' : undefined
  });
  
  return documents;
}

function generateAccountNumber(): string {
  return Math.floor(Math.random() * 900000000 + 100000000).toString();
}

function generateAddress(): string {
  const streetNumber = Math.floor(Math.random() * 9999) + 1;
  const street = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  const town = TOWNS[Math.floor(Math.random() * TOWNS.length)];
  const zipCode = Math.floor(Math.random() * 90000) + 10000;
  
  return `${streetNumber} ${street}, ${town}, ${STATE_NAME} ${zipCode}`;
}

function generateSignature(name: string, isFraud: boolean = false): string {
  const styles = [
    'cursive', 'print', 'mixed', 'stylized', 'simple', 'elaborate'
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];
  
  if (isFraud) {
    // Generate mismatched signature for fraud cases
    const fakeName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    return `${fakeName}_${style}_sig`;
  }
  
  // Generate matching signature
  return `${name}_${style}_sig`;
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
