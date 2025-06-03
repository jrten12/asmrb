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
  
  const transaction = generateTransaction(level, 0); // Initial transaction without fraud consideration
  
  // No fraud for deposits (customers giving money TO the bank)
  // 30% fraud rate for withdrawals and transfers only
  const isFraud = transaction.type !== 'deposit' && Math.random() < 0.3;
  const suspiciousLevel = isFraud ? Math.floor(Math.random() * 3) + 1 : 0;
  
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
  
  // Only fraudulent customers (suspiciousLevel > 0) get fraudulent documents
  const isFraudulentCustomer = suspiciousLevel > 0;
  
  // For fraudulent customers, select which documents will have errors (1-3 types of fraud)
  let fraudDocumentTypes: string[] = [];
  if (isFraudulentCustomer) {
    const fraudTypes = ['id', 'slip', 'bank_book', 'signature'];
    const numFraudTypes = Math.floor(Math.random() * 3) + 1; // 1-3 fraud types
    
    // Shuffle and pick fraud types
    const shuffled = [...fraudTypes].sort(() => Math.random() - 0.5);
    fraudDocumentTypes = shuffled.slice(0, numFraudTypes);
  }
  
  // ID Document
  const idHasFraud = fraudDocumentTypes.includes('id');
  let idName = customerName;
  let idAccountNumber = transaction.accountNumber;
  let idBirthday = realBirthday;
  let hasIdError = false;
  let errorType = '';
  
  if (idHasFraud) {
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
  
  // Transaction Slip
  const slipHasFraud = fraudDocumentTypes.includes('slip');
  let slipAmount = transaction.amount;
  let hasAmountError = false;
  
  if (slipHasFraud) {
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
  const bookHasFraud = fraudDocumentTypes.includes('bank_book');
  let bookAccount = transaction.accountNumber;
  let hasAccountError = false;
  
  if (bookHasFraud) {
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
  const signatureHasFraud = fraudDocumentTypes.includes('signature');
  documents.push({
    id: 'signature',
    type: 'signature',
    data: {
      signature: generateSignature(customerName, signatureHasFraud),
      name: customerName
    },
    isValid: !signatureHasFraud,
    hasError: signatureHasFraud ? 'Signature doesn\'t match records' : undefined
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
  const signatureTypes = [
    'full_cursive',     // Complete cursive script
    'print_style',      // Block letter printing
    'mixed_case',       // Mix of cursive and print
    'stylized_loops',   // Decorative with loops
    'simple_script',    // Basic cursive
    'elaborate_flourish', // Ornate with flourishes
    'initials_only',    // Just initials
    'compact_dense',    // Cramped writing
    'loose_flowing',    // Spread out script
    'angular_sharp'     // Sharp, geometric style
  ];
  
  const style = signatureTypes[Math.floor(Math.random() * signatureTypes.length)];
  
  if (isFraud) {
    const fraudTypes = [
      'wrong_name',       // Completely different name
      'misspelled',       // Name with spelling errors
      'partial_match',    // Only first or last name matches
      'similar_name',     // Name that sounds similar
      'shaky_hand',       // Trembling, inconsistent lines
      'different_style',  // Dramatically different writing style
      'pressure_off',     // Too light or too heavy pressure
      'rushed_sloppy'     // Hurried, careless appearance
    ];
    
    const fraudType = fraudTypes[Math.floor(Math.random() * fraudTypes.length)];
    
    switch (fraudType) {
      case 'wrong_name':
        const fakeName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
        return `${fakeName}_${style}_fraud_wrong`;
        
      case 'misspelled':
        const misspelled = name.split(' ').map(part => {
          if (Math.random() < 0.7) {
            // Add/remove/change a letter
            const chars = part.split('');
            const index = Math.floor(Math.random() * chars.length);
            if (Math.random() < 0.5) {
              chars[index] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
            } else {
              chars.splice(index, 1);
            }
            return chars.join('');
          }
          return part;
        }).join(' ');
        return `${misspelled}_${style}_fraud_misspelled`;
        
      case 'partial_match':
        const nameParts = name.split(' ');
        const partialName = Math.random() < 0.5 ? nameParts[0] : nameParts[nameParts.length - 1];
        return `${partialName}_${style}_fraud_partial`;
        
      case 'similar_name':
        const similarNames = [
          'John Johnson', 'Mike Mitchell', 'Bob Roberts', 'Jim James',
          'Mary Maria', 'Sue Susan', 'Tom Thomas', 'Bill William'
        ];
        const similar = similarNames[Math.floor(Math.random() * similarNames.length)];
        return `${similar}_${style}_fraud_similar`;
        
      case 'shaky_hand':
        return `${name}_${style}_fraud_shaky`;
        
      case 'different_style':
        const conflictingStyle = signatureTypes[Math.floor(Math.random() * signatureTypes.length)];
        return `${name}_${conflictingStyle}_fraud_style`;
        
      case 'pressure_off':
        return `${name}_${style}_fraud_pressure`;
        
      case 'rushed_sloppy':
        return `${name}_${style}_fraud_rushed`;
        
      default:
        return `${name}_${style}_fraud_generic`;
    }
  }
  
  // Generate authentic signature with consistent style for legitimate customers
  const authenticity = Math.random();
  let modifier = '';
  
  if (authenticity < 0.2) {
    modifier = '_aged';  // Slightly different due to age/time
  } else if (authenticity < 0.4) {
    modifier = '_careful'; // More deliberate, formal signing
  } else if (authenticity < 0.6) {
    modifier = '_casual'; // Relaxed, everyday signing
  } else if (authenticity < 0.8) {
    modifier = '_confident'; // Bold, assured signature
  } else {
    modifier = '_standard'; // Regular signature
  }
  
  return `${name}_${style}${modifier}_authentic`;
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
  const signatureDoc = documents.find(d => d.type === 'signature');
  
  if (idDoc && slipDoc && idDoc.data.name !== slipDoc.data.name) {
    errors.push('Name mismatch between ID and transaction slip');
  }
  
  if (slipDoc && bookDoc && slipDoc.data.accountNumber !== bookDoc.data.accountNumber) {
    errors.push('Account number mismatch between slip and bank book');
  }
  
  if (slipDoc && bookDoc && slipDoc.data.amount !== bookDoc.data.amount) {
    errors.push('Amount mismatch between slip and bank book');
  }
  
  // Enhanced signature validation
  if (signatureDoc && idDoc) {
    const signatureData = signatureDoc.data.signature as string;
    const customerName = idDoc.data.name as string;
    
    if (signatureData.includes('_fraud_')) {
      const fraudType = signatureData.split('_fraud_')[1];
      switch (fraudType) {
        case 'wrong':
          errors.push('Signature belongs to different person entirely');
          break;
        case 'misspelled':
          errors.push('Signature has spelling errors in name');
          break;
        case 'partial':
          errors.push('Signature only partially matches customer name');
          break;
        case 'similar':
          errors.push('Signature resembles but doesn\'t match customer name');
          break;
        case 'shaky':
          errors.push('Signature shows signs of forgery (trembling lines)');
          break;
        case 'style':
          errors.push('Signature style inconsistent with bank records');
          break;
        case 'pressure':
          errors.push('Signature pressure doesn\'t match normal patterns');
          break;
        case 'rushed':
          errors.push('Signature appears hurried and sloppy');
          break;
        default:
          errors.push('Signature doesn\'t match bank records');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// New function to get signature authenticity details for teller review
export function analyzeSignature(signature: string, customerName: string): {
  isAuthentic: boolean;
  confidence: number;
  notes: string[];
  fraudIndicators: string[];
} {
  const isAuthentic = !signature.includes('_fraud_');
  let confidence = 0;
  const notes: string[] = [];
  const fraudIndicators: string[] = [];
  
  if (isAuthentic) {
    confidence = Math.floor(Math.random() * 15) + 85; // 85-100% confidence for authentic
    
    if (signature.includes('_aged')) {
      notes.push('Signature shows natural aging variations');
    }
    if (signature.includes('_careful')) {
      notes.push('Deliberate, formal signing style observed');
    }
    if (signature.includes('_casual')) {
      notes.push('Relaxed, everyday signature pattern');
    }
    if (signature.includes('_confident')) {
      notes.push('Bold, assured signature characteristics');
    }
    if (signature.includes('_standard')) {
      notes.push('Standard signature pattern matches records');
    }
  } else {
    confidence = Math.floor(Math.random() * 40) + 10; // 10-50% confidence for fraud
    
    const fraudType = signature.split('_fraud_')[1];
    switch (fraudType) {
      case 'wrong':
        fraudIndicators.push('Name completely different from account holder');
        fraudIndicators.push('No similarity to recorded signature');
        break;
      case 'misspelled':
        fraudIndicators.push('Spelling errors in customer name');
        fraudIndicators.push('Possible unfamiliarity with correct spelling');
        break;
      case 'partial':
        fraudIndicators.push('Only partial name signed');
        fraudIndicators.push('Missing required signature elements');
        break;
      case 'similar':
        fraudIndicators.push('Name sounds similar but is different');
        fraudIndicators.push('Possible identity confusion or deception');
        break;
      case 'shaky':
        fraudIndicators.push('Trembling or unsteady pen strokes');
        fraudIndicators.push('Possible nervousness or inexperience with name');
        break;
      case 'style':
        fraudIndicators.push('Writing style dramatically different from records');
        fraudIndicators.push('Inconsistent with customer\'s usual signature');
        break;
      case 'pressure':
        fraudIndicators.push('Pen pressure too light or too heavy');
        fraudIndicators.push('Unnatural writing pressure patterns');
        break;
      case 'rushed':
        fraudIndicators.push('Hurried, careless appearance');
        fraudIndicators.push('Possible attempt to avoid scrutiny');
        break;
    }
  }
  
  return {
    isAuthentic,
    confidence,
    notes,
    fraudIndicators
  };
}
