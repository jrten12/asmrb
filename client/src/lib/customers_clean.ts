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
let accountNumberCounter = 1000;

export function generateCustomer(level: number): Customer {
  const id = Math.random().toString(36).substr(2, 9);
  const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  
  const transaction = generateTransaction(level);
  const documents = generateDocuments(name, transaction);
  
  return {
    id,
    name,
    sprite: `customer_${Math.floor(Math.random() * 6) + 1}`,
    transaction,
    documents,
    suspiciousLevel: 0,
    patience: 100,
    maxPatience: 100 - (level * 5),
    isFraudulent: false
  };
}

function generateTransaction(level: number): Transaction {
  const types: Transaction['type'][] = ['deposit', 'withdrawal', 'wire_transfer'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const amountRanges = [
    { min: 25, max: 200 },
    { min: 200, max: 800 },
    { min: 800, max: 2500 },
    { min: 2500, max: 5000 }
  ];
  
  const range = amountRanges[Math.min(Math.floor(Math.random() * amountRanges.length), amountRanges.length - 1)];
  const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  const accountNumber = generateAccountNumber();
  
  const baseTransaction: Transaction = {
    type,
    amount,
    accountNumber
  };
  
  if (type === 'wire_transfer') {
    const targetAccount = generateAccountNumber();
    const recipientNames = ['John Davis', 'Sarah Wilson', 'Michael Brown', 'Jennifer Lee', 'David Garcia', 'Lisa Martinez', 'James Johnson', 'Mary Smith'];
    const recipientName = recipientNames[Math.floor(Math.random() * recipientNames.length)];
    
    return {
      ...baseTransaction,
      targetAccount,
      recipientName,
      wireRoutingNumber: Math.floor(100000000 + Math.random() * 900000000).toString()
    };
  }
  
  return baseTransaction;
}

export function generateDocuments(customerName: string, transaction: Transaction): Document[] {
  const documents: Document[] = [];
  
  // Generate consistent customer information
  const currentYear = new Date().getFullYear();
  const minAge = 18;
  const maxAge = 80;
  const minBirthYear = currentYear - maxAge;
  const maxBirthYear = currentYear - minAge;
  const birthYear = Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1)) + minBirthYear;
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1;
  const birthday = `${birthMonth.toString().padStart(2, '0')}/${birthDay.toString().padStart(2, '0')}/${birthYear}`;
  
  const address = generateAddress();
  const idNumber = Math.random().toString(36).substr(2, 9).toUpperCase();
  const licenseNumber = 'DL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  
  // ID Card - always valid
  documents.push({
    id: 'id_card',
    type: 'id',
    data: {
      name: customerName,
      accountNumber: transaction.accountNumber,
      address: address,
      dateOfBirth: birthday,
      idNumber: idNumber,
      licenseNumber: licenseNumber
    },
    isValid: true
  });
  
  // Transaction Slip - always valid
  documents.push({
    id: 'transaction_slip',
    type: 'slip',
    data: {
      name: customerName,
      amount: transaction.amount,
      accountNumber: transaction.accountNumber,
      targetAccount: transaction.targetAccount,
      type: transaction.type
    },
    isValid: true
  });
  
  // Bank Book - always valid
  const balance = Math.floor(Math.random() * 5000) + 500;
  documents.push({
    id: 'bank_book',
    type: 'bank_book',
    data: {
      name: customerName,
      accountNumber: transaction.accountNumber,
      balance: balance,
      amount: transaction.amount
    },
    isValid: true
  });
  
  // Signature - always valid
  const signature = generateSignature(customerName, false);
  documents.push({
    id: 'signature',
    type: 'signature',
    data: {
      signature: signature,
      name: customerName
    },
    isValid: true
  });
  
  return documents;
}

function generateAccountNumber(): string {
  let accountNumber: string;
  do {
    accountNumberCounter++;
    accountNumber = `2000${accountNumberCounter.toString().padStart(4, '0')}`;
  } while (usedAccountNumbers.has(accountNumber));
  
  usedAccountNumbers.add(accountNumber);
  return accountNumber;
}

function generateAddress(): string {
  const streetNumber = Math.floor(Math.random() * 9999) + 1;
  const streetName = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  const town = TOWNS[Math.floor(Math.random() * TOWNS.length)];
  const zipCode = Math.floor(Math.random() * 90000) + 10000;
  
  return `${streetNumber} ${streetName}, ${town}, ${STATE_NAME} ${zipCode}`;
}

function generateSignature(name: string, isFraud: boolean = false): string {
  const nameParts = name.split(' ');
  const initials = nameParts.map(part => part[0]).join('');
  const lastName = nameParts[nameParts.length - 1];
  
  const styles = ['stylized', 'cursive', 'block'];
  const characteristics = ['looped', 'flourished', 'simple', 'bold', 'italic', 'faint'];
  
  const style = styles[Math.floor(Math.random() * styles.length)];
  const characteristic = characteristics[Math.floor(Math.random() * characteristics.length)];
  
  return `${initials}_${style}_${lastName}|${characteristic}|legitimate`;
}

export function validateDocuments(documents: Document[]): { isValid: boolean; errors: string[] } {
  return { isValid: true, errors: [] };
}

export function analyzeSignature(signature: string, customerName: string): {
  isValid: boolean;
  confidence: number;
  details: string;
} {
  return {
    isValid: true,
    confidence: 0.95,
    details: "Signature analysis complete"
  };
}