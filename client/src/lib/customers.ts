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

// Track used account numbers to prevent duplicates
const usedAccountNumbers = new Set<string>();
let accountNumberCounter = 1000; // Start with clean 8-digit numbers (10001000+)

// Clear cache to force new account numbers
usedAccountNumbers.clear();

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
  
  // 50% fraud rate for challenging but fair gameplay
  const isFraud = Math.random() < 0.5;
  const suspiciousLevel = isFraud ? Math.floor(Math.random() * 4) + 1 : 0;
  
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
  // Only basic transactions with working game mechanics
  const types: Transaction['type'][] = ['deposit', 'withdrawal', 'inquiry'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  // Realistic transaction amounts
  const amountRanges = [
    { min: 25, max: 200 },      // Small transactions
    { min: 200, max: 800 },     // Medium transactions
    { min: 800, max: 2500 },    // Large transactions
    { min: 2500, max: 5000 }    // Very large transactions
  ];
  
  const range = amountRanges[Math.floor(Math.random() * amountRanges.length)];
  let amount = Math.floor(Math.random() * (range.max - range.min)) + range.min;
  
  // Adjust for level
  if (level > 3) amount = Math.floor(amount * 1.5);
  
  // Suspiciously large amounts for fraud cases
  if (suspiciousLevel > 0 && Math.random() < 0.4) {
    amount *= 3; // Very suspicious large amount
  }
  
  // Cap withdrawal amounts at $1000 for cash register functionality
  if (type === 'withdrawal' && amount > 1000) {
    amount = Math.floor(Math.random() * 900) + 100; // $100 to $1000
  }
  
  // For inquiries, set amount to 0
  if (type === 'inquiry') {
    amount = 0;
  }
  
  const accountNumber = generateAccountNumber();
  const targetAccount = (type === 'transfer' || type === 'wire_transfer') ? generateAccountNumber() : undefined;
  
  // Generate additional data for specific transaction types
  const recipientName = (type === 'wire_transfer' || type === 'cashiers_check' || type === 'money_order') 
    ? CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)] 
    : undefined;
    
  const wireRoutingNumber = type === 'wire_transfer' 
    ? `${Math.floor(Math.random() * 900000000) + 100000000}` 
    : undefined;
  
  return {
    type,
    amount,
    accountNumber,
    targetAccount,
    recipientName,
    wireRoutingNumber
  };
}

export function generateDocuments(customerName: string, transaction: Transaction, suspiciousLevel: number): Document[] {
  const documents: Document[] = [];
  
  // Generate a realistic birthday (ages 18-80, but not after 2005)
  const currentYear = new Date().getFullYear();
  const maxBirthYear = Math.min(2005, currentYear - 18); // No one born after 2005
  const minBirthYear = currentYear - 80; // Maximum 80 years old
  const birthYear = Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1)) + minBirthYear;
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1; // Safe day range for all months
  const realBirthday = `${birthMonth.toString().padStart(2, '0')}/${birthDay.toString().padStart(2, '0')}/${birthYear}`;
  
  // Only fraudulent customers (suspiciousLevel > 0) get fraudulent documents
  const isFraudulentCustomer = suspiciousLevel > 0;
  
  // For fraudulent customers, select which documents will have errors (1-2 types of fraud max)
  let fraudDocumentTypes: string[] = [];
  if (isFraudulentCustomer) {
    const fraudTypes = ['id', 'slip', 'bank_book', 'signature', 'id_correlation'];
    const numFraudTypes = Math.floor(Math.random() * 2) + 1; // 1-2 fraud types maximum
    
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
  
  // Handle ID/License correlation fraud
  const hasCorrelationFraud = fraudDocumentTypes.includes('id_correlation');
  let idNumber = Math.random().toString(36).substr(2, 9).toUpperCase();
  let licenseNumber = 'DL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  
  if (hasCorrelationFraud) {
    // Create completely unrelated ID and license numbers (obvious mismatch)
    idNumber = Math.random().toString(36).substr(2, 9).toUpperCase();
    licenseNumber = 'DL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    // Ensure they have no correlation (first 3 chars completely different)
    while (idNumber.substring(0, 3) === licenseNumber.substring(3, 6)) {
      licenseNumber = 'DL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
    
    hasIdError = true;
    errorType = hasIdError && errorType ? errorType + '; ID/License correlation suspicious' : 'ID/License correlation suspicious';
  } else if (!hasIdError) {
    // For legitimate customers, create some correlation between ID and license
    const basePattern = Math.random().toString(36).substr(2, 3).toUpperCase();
    idNumber = basePattern + Math.random().toString(36).substr(2, 6).toUpperCase();
    licenseNumber = 'DL-' + basePattern + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  documents.push({
    id: 'id_card',
    type: 'id',
    data: {
      name: idName,
      accountNumber: idAccountNumber,
      address: generateAddress(),
      dateOfBirth: idBirthday,
      idNumber: idNumber,
      licenseNumber: licenseNumber
    },
    isValid: !hasIdError,
    hasError: hasIdError ? errorType : undefined
  });
  
  // Transaction Slip
  const slipHasFraud = fraudDocumentTypes.includes('slip');
  let slipAmount = transaction.amount;
  let hasAmountError = false;
  
  if (slipHasFraud) {
    // Create subtle amount discrepancies for pattern recognition
    const discrepancyTypes = [
      () => transaction.amount + Math.floor(Math.random() * 50) + 10, // Small addition
      () => transaction.amount - Math.floor(Math.random() * 30) - 5,  // Small subtraction
      () => Math.floor(transaction.amount * 1.1), // 10% increase
      () => Math.floor(transaction.amount * 0.95), // 5% decrease
      () => transaction.amount + (Math.random() < 0.5 ? 100 : -100), // Flat $100 difference
      () => transaction.amount * 10, // Decimal point error
      () => Math.floor(transaction.amount / 10) // Missing zero
    ];
    const discrepancyMethod = discrepancyTypes[Math.floor(Math.random() * discrepancyTypes.length)];
    slipAmount = discrepancyMethod();
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
  
  // Generate realistic account balance (lower amounts)
  let accountBalance = Math.floor(Math.random() * 3000) + 500; // $500 to $3500
  
  // Ensure sufficient balance for withdrawals
  if (transaction.type === 'withdrawal') {
    accountBalance = Math.max(accountBalance, transaction.amount + Math.floor(Math.random() * 500) + 100);
  }
  
  documents.push({
    id: 'bank_book',
    type: 'bank_book',
    data: {
      name: customerName,
      accountNumber: bookAccount,
      balance: accountBalance,
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
  let accountNumber: string;
  let attempts = 0;
  const maxAttempts = 50;
  
  do {
    // Generate normal 8-digit account numbers (20000000-99999999)
    const baseNumber = 20000000 + accountNumberCounter + Math.floor(Math.random() * 10000);
    accountNumber = baseNumber.toString();
    
    // Ensure it's exactly 8 digits and doesn't exceed 99999999
    if (accountNumber.length > 8 || parseInt(accountNumber) > 99999999) {
      accountNumber = (20000000 + (accountNumberCounter % 70000000)).toString();
    }
    
    attempts++;
    if (attempts >= maxAttempts) {
      // Fallback: use counter directly to guarantee uniqueness
      accountNumber = (20000000 + (accountNumberCounter % 70000000)).toString();
      break;
    }
  } while (usedAccountNumbers.has(accountNumber));
  
  usedAccountNumbers.add(accountNumber);
  accountNumberCounter += Math.floor(Math.random() * 100) + 1; // Increment by 1-100
  
  return accountNumber;
}

function generateAddress(): string {
  const streetNumber = Math.floor(Math.random() * 9999) + 1;
  const street = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  const town = TOWNS[Math.floor(Math.random() * TOWNS.length)];
  const zipCode = Math.floor(Math.random() * 90000) + 10000;
  
  return `${streetNumber} ${street}, ${town}, ${STATE_NAME} ${zipCode}`;
}

function generateSignature(name: string, isFraud: boolean = false): string {
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';
  
  // Realistic signature characteristics
  const characteristics = {
    pressure: Math.random() < 0.7 ? 'medium' : Math.random() < 0.5 ? 'heavy' : 'light',
    speed: Math.random() < 0.6 ? 'normal' : Math.random() < 0.5 ? 'fast' : 'slow',
    slant: Math.random() < 0.4 ? 'forward' : Math.random() < 0.3 ? 'backward' : 'upright',
    size: Math.random() < 0.5 ? 'medium' : Math.random() < 0.5 ? 'large' : 'small',
    loops: Math.random() < 0.7,
    flourishes: Math.random() < 0.3,
    legibility: Math.random() < 0.6 ? 'readable' : 'stylized'
  };
  
  if (isFraud) {
    // Advanced fraud patterns with realistic mismatches
    const fraudTypes = [
      'completely_different_name',
      'first_name_wrong', 
      'last_name_wrong',
      'misspelled_signature',
      'wrong_handwriting_style',
      'trembling_forgery',
      'practiced_forgery',
      'similar_sounding_name',
      'reversed_names',
      'missing_middle_initial'
    ];
    
    const fraudType = fraudTypes[Math.floor(Math.random() * fraudTypes.length)];
    
    switch (fraudType) {
      case 'completely_different_name':
        const randomName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
        return createSignaturePattern(randomName, characteristics, 'different_name');
        
      case 'first_name_wrong':
        const wrongFirst = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)].split(' ')[0];
        return createSignaturePattern(`${wrongFirst} ${lastName}`, characteristics, 'wrong_first');
        
      case 'last_name_wrong':
        const wrongLast = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)].split(' ')[1] || 'Smith';
        return createSignaturePattern(`${firstName} ${wrongLast}`, characteristics, 'wrong_last');
        
      case 'misspelled_signature':
        const misspelled = name.replace(/([aeiou])/gi, (match) => {
          const vowels = ['a', 'e', 'i', 'o', 'u'];
          return Math.random() < 0.3 ? vowels[Math.floor(Math.random() * vowels.length)] : match;
        });
        return createSignaturePattern(misspelled, characteristics, 'misspelled');
        
      case 'wrong_handwriting_style':
        const wrongStyle = {
          ...characteristics,
          pressure: characteristics.pressure === 'heavy' ? 'light' : 'heavy',
          slant: characteristics.slant === 'forward' ? 'backward' : 'forward',
          loops: !characteristics.loops,
          size: characteristics.size === 'large' ? 'small' : 'large'
        };
        return createSignaturePattern(name, wrongStyle, 'style_mismatch');
        
      case 'trembling_forgery':
        return createSignaturePattern(name, { ...characteristics, pressure: 'unsteady', speed: 'hesitant' }, 'trembling');
        
      case 'practiced_forgery':
        return createSignaturePattern(name, { ...characteristics, pressure: 'controlled', speed: 'deliberate' }, 'practiced_fake');
        
      case 'similar_sounding_name':
        const similar = generateSimilarName(name);
        return createSignaturePattern(similar, characteristics, 'similar_sound');
        
      case 'reversed_names':
        return createSignaturePattern(`${lastName} ${firstName}`, characteristics, 'name_reversed');
        
      case 'missing_middle_initial':
        if (nameParts.length > 2) {
          return createSignaturePattern(`${firstName} ${lastName}`, characteristics, 'missing_middle');
        }
        return createSignaturePattern(`${firstName} M. ${lastName}`, characteristics, 'added_middle');
        
      default:
        return createSignaturePattern(name, characteristics, 'generic_fraud');
    }
  } else {
    // Legitimate signature
    return createSignaturePattern(name, characteristics, 'legitimate');
  }
}

function generateSimilarName(originalName: string): string {
  const nameParts = originalName.split(' ');
  const firstName = nameParts[0];
  
  // Common name substitutions that sound similar
  const similarNames: { [key: string]: string[] } = {
    'John': ['Jon', 'Jonathan', 'Johnny'],
    'Michael': ['Mitchell', 'Mike', 'Micheal'],
    'David': ['Dave', 'Daveed', 'Daivd'],
    'Robert': ['Rob', 'Bob', 'Robbert'],
    'William': ['Will', 'Bill', 'Willem'],
    'James': ['Jim', 'Jamie', 'Jemes'],
    'Mary': ['Marie', 'Maria', 'Mery'],
    'Jennifer': ['Jenny', 'Jen', 'Jenifer'],
    'Lisa': ['Liza', 'Leesa', 'Lissa'],
    'Susan': ['Sue', 'Susie', 'Suzan']
  };
  
  const similar = similarNames[firstName];
  if (similar && similar.length > 0) {
    const newFirst = similar[Math.floor(Math.random() * similar.length)];
    return originalName.replace(firstName, newFirst);
  }
  
  // Fallback: slight misspelling
  return originalName.replace(/([aeiou])/i, (match) => {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    return vowels[Math.floor(Math.random() * vowels.length)];
  });
}

function createSignaturePattern(name: string, characteristics: any, signatureType: string): string {
  const nameParts = name.split(' ');
  let pattern = '';
  
  // Build realistic signature representation
  if (characteristics.legibility === 'readable') {
    pattern = name;
  } else {
    // Stylized version with initials and flowing elements
    const initials = nameParts.map(part => part.charAt(0)).join('');
    pattern = `${initials}_stylized_${nameParts[nameParts.length - 1]}`;
  }
  
  // Add style characteristics to pattern
  const styleMarkers = [];
  
  if (characteristics.pressure === 'heavy') styleMarkers.push('bold');
  if (characteristics.pressure === 'light') styleMarkers.push('faint');
  if (characteristics.pressure === 'unsteady') styleMarkers.push('shaky');
  
  if (characteristics.speed === 'fast') styleMarkers.push('rushed');
  if (characteristics.speed === 'slow') styleMarkers.push('careful');
  if (characteristics.speed === 'hesitant') styleMarkers.push('uncertain');
  
  if (characteristics.slant === 'forward') styleMarkers.push('italic');
  if (characteristics.slant === 'backward') styleMarkers.push('backslant');
  
  if (characteristics.loops) styleMarkers.push('looped');
  if (characteristics.flourishes) styleMarkers.push('flourished');
  
  if (characteristics.size === 'large') styleMarkers.push('large');
  if (characteristics.size === 'small') styleMarkers.push('small');
  
  return `${pattern}|${styleMarkers.join('_')}|${signatureType}`;
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

  // Note: ID validation is intentionally removed - it's the player's job to spot inconsistencies
  
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

export function analyzeSignature(signature: string, customerName: string): {
  isAuthentic: boolean;
  confidence: number;
  notes: string[];
  fraudIndicators: string[];
} {
  const parts = signature.split('|');
  const signatureName = parts[0] || signature;
  const styleMarkers = parts[1] ? parts[1].split('_') : [];
  const signatureType = parts[2] || 'unknown';
  
  const isAuthentic = signatureType === 'legitimate';
  let confidence = 0;
  const notes: string[] = [];
  const fraudIndicators: string[] = [];
  
  if (isAuthentic) {
    confidence = Math.floor(Math.random() * 15) + 85; // 85-100% confidence for authentic
    
    // Analyze style characteristics for authentic signatures
    if (styleMarkers.includes('bold')) {
      notes.push('Strong, confident pen pressure observed');
    }
    if (styleMarkers.includes('italic')) {
      notes.push('Consistent forward slant throughout signature');
    }
    if (styleMarkers.includes('looped')) {
      notes.push('Natural loop formations in letters');
    }
    if (styleMarkers.includes('flourished')) {
      notes.push('Decorative elements consistent with personality');
    }
    if (styleMarkers.includes('careful')) {
      notes.push('Deliberate, measured signing pace');
    }
    
    notes.push('Signature matches bank records within acceptable variance');
    notes.push('Natural flow and rhythm consistent with authentic signing');
    
  } else {
    confidence = Math.floor(Math.random() * 40) + 15; // 15-55% confidence for fraud
    
    // Detailed fraud analysis based on signature type
    switch (signatureType) {
      case 'different_name':
        fraudIndicators.push('CRITICAL: Name completely different from account holder');
        fraudIndicators.push('No similarity to recorded signature whatsoever');
        fraudIndicators.push('Possible identity theft or document forgery');
        confidence = Math.floor(Math.random() * 20) + 5; // Very low confidence
        break;
        
      case 'wrong_first':
        fraudIndicators.push('First name does not match bank records');
        fraudIndicators.push('Last name appears correct but suspicious inconsistency');
        fraudIndicators.push('May indicate attempted partial identity fraud');
        break;
        
      case 'wrong_last':
        fraudIndicators.push('Last name mismatch with account records');
        fraudIndicators.push('First name matches but surname is incorrect');
        fraudIndicators.push('Possible marriage name change not updated or fraud');
        break;
        
      case 'misspelled':
        fraudIndicators.push('Spelling errors in customer name signature');
        fraudIndicators.push('Indicates unfamiliarity with correct name spelling');
        fraudIndicators.push('Common sign of attempted forgery');
        break;
        
      case 'style_mismatch':
        fraudIndicators.push('Handwriting style dramatically different from records');
        fraudIndicators.push('Pressure, slant, and letter formation inconsistent');
        fraudIndicators.push('Suggests different person attempting signature');
        break;
        
      case 'trembling':
        fraudIndicators.push('Unsteady, hesitant line quality observed');
        fraudIndicators.push('Trembling suggests nervousness or unfamiliarity');
        fraudIndicators.push('Inconsistent with natural signing behavior');
        break;
        
      case 'practiced_fake':
        fraudIndicators.push('Overly careful, deliberate signing pattern');
        fraudIndicators.push('Suggests practiced forgery attempt');
        fraudIndicators.push('Lacks natural flow of authentic signature');
        break;
        
      case 'similar_sound':
        fraudIndicators.push('Name sounds similar but spelling differs');
        fraudIndicators.push('May be attempt to use phonetically similar identity');
        fraudIndicators.push('Common fraud technique using name confusion');
        break;
        
      case 'name_reversed':
        fraudIndicators.push('First and last names appear reversed');
        fraudIndicators.push('Unusual signing pattern not matching records');
        fraudIndicators.push('May indicate confusion or deliberate misdirection');
        break;
        
      case 'missing_middle':
        fraudIndicators.push('Middle initial present in records but missing from signature');
        fraudIndicators.push('Incomplete signature compared to bank records');
        break;
        
      case 'added_middle':
        fraudIndicators.push('Extra middle initial not present in bank records');
        fraudIndicators.push('Signature contains elements not on file');
        break;
        
      default:
        fraudIndicators.push('Signature anomalies detected');
        fraudIndicators.push('Does not match established bank records');
    }
    
    // Additional style-based fraud indicators
    if (styleMarkers.includes('shaky')) {
      fraudIndicators.push('Trembling hand movements suggest nervousness');
    }
    if (styleMarkers.includes('uncertain')) {
      fraudIndicators.push('Hesitant signing pattern indicates unfamiliarity');
    }
    if (styleMarkers.includes('rushed')) {
      fraudIndicators.push('Hurried execution may indicate attempted deception');
    }
  }
  
  // Add technical analysis notes
  if (styleMarkers.includes('large')) {
    notes.push('Large signature size - may indicate confidence or compensation');
  }
  if (styleMarkers.includes('small')) {
    notes.push('Compact signature style - could suggest caution or privacy');
  }
  if (styleMarkers.includes('faint')) {
    notes.push('Light pen pressure - unusual for typical banking signatures');
  }
  
  return {
    isAuthentic,
    confidence,
    notes,
    fraudIndicators
  };
}
