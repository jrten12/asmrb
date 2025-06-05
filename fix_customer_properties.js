// Script to find and replace all outdated Customer property references
const fs = require('fs');

const filePath = 'client/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all outdated Customer property references
const replacements = [
  // Account number fixes
  { old: 'currentCustomer.accountNumber', new: 'currentCustomer.transaction.accountNumber' },
  
  // Transaction type fixes
  { old: 'currentCustomer.transactionType', new: 'currentCustomer.transaction.type' },
  
  // Amount fixes
  { old: 'currentCustomer.requestedAmount', new: 'currentCustomer.transaction.amount' },
  
  // Destination account fixes
  { old: 'currentCustomer.destinationAccount', new: 'currentCustomer.transaction.targetAccount' },
  
  // Fraud detection fixes
  { old: 'currentCustomer.isFraud', new: 'currentCustomer.suspiciousLevel > 0' },
  { old: 'currentCustomer.fraudType', new: 'currentCustomer.suspiciousLevel' }
];

replacements.forEach(({ old, new: newProp }) => {
  const regex = new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  content = content.replace(regex, newProp);
});

fs.writeFileSync(filePath, content);
console.log('Fixed all Customer property references');