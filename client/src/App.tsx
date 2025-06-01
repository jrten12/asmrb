import React, { useState } from 'react';
import './index.css';

function App() {
  const [gamePhase, setGamePhase] = useState('intro');
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const customer = {
    name: 'John Smith',
    transaction: { type: 'DEPOSIT', amount: 500 },
    documents: [
      { id: 1, type: 'ID CARD', name: 'John Smith', details: 'ID: 12345', valid: true },
      { id: 2, type: 'BANK BOOK', name: 'John Smith', details: 'Account: 987654321', valid: true },
      { id: 3, type: 'TRANSACTION SLIP', name: 'John Smith', details: 'DEPOSIT $500', valid: true },
      { id: 4, type: 'SIGNATURE', name: 'John Smith', details: 'Signature on file', valid: true }
    ]
  };
  
  const suspiciousCustomer = {
    name: 'Mary Johnson',
    transaction: { type: 'WITHDRAWAL', amount: 200 },
    documents: [
      { id: 1, type: 'ID CARD', name: 'Mary Johnson', details: 'ID: 54321', valid: true },
      { id: 2, type: 'BANK BOOK', name: 'Mary Johnson', details: 'Account: 123456789', valid: true },
      { id: 3, type: 'TRANSACTION SLIP', name: 'Mary Johnson', details: 'WITHDRAWAL $250', valid: false, error: 'Amount mismatch!' },
      { id: 4, type: 'SIGNATURE', name: 'Mary Johnson', details: 'Signature invalid', valid: false, error: 'Signature does not match' }
    ]
  };
  
  const [currentCustomer, setCurrentCustomer] = useState(customer);

  const startGame = () => {
    setGamePhase('playing');
  };

  const selectDocument = (docId) => {
    setSelectedDoc(docId);
  };

  const processTransaction = () => {
    const hasErrors = currentCustomer.documents.some(doc => !doc.valid);
    if (hasErrors) {
      setMistakes(mistakes + 1);
      setScore(score - 50);
      alert('MISTAKE! Transaction had errors but was processed!');
    } else {
      setScore(score + 100);
      alert('SUCCESS! Transaction processed correctly!');
    }
    nextCustomer();
  };

  const rejectTransaction = () => {
    const hasErrors = currentCustomer.documents.some(doc => !doc.valid);
    if (hasErrors) {
      setScore(score + 150);
      alert('GOOD CATCH! Fraudulent transaction rejected!');
    } else {
      setMistakes(mistakes + 1);
      setScore(score - 25);
      alert('MISTAKE! Valid transaction was rejected!');
    }
    nextCustomer();
  };

  const nextCustomer = () => {
    setTimeout(() => {
      setCurrentCustomer(Math.random() > 0.5 ? customer : suspiciousCustomer);
      setSelectedDoc(null);
    }, 1500);
  };

  if (gamePhase === 'intro') {
    return (
      <div className="w-full h-screen bg-black text-green-500 font-mono flex items-center justify-center">
        <div className="text-center p-8 border-2 border-green-500 bg-green-900 bg-opacity-20 max-w-lg">
          <h1 className="text-4xl mb-4">TELLER'S WINDOW</h1>
          <p className="text-xl mb-6">1980s Bank Simulation</p>
          <button 
            className="text-lg bg-green-500 text-black px-8 py-4 border-none cursor-pointer hover:bg-green-400 transition-colors"
            onClick={startGame}
          >
            START SHIFT
          </button>
          <div className="text-sm mt-6 text-yellow-500 text-left">
            <p>• Examine customer documents</p>
            <p>• Check for errors and fraud</p>
            <p>• Process valid transactions</p>
            <p>• Reject suspicious requests</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black text-green-500 font-mono flex flex-col">
      {/* Header */}
      <div className="bg-black border-b-2 border-green-500 p-4 flex justify-between">
        <div>
          <div>SCORE: {score}</div>
          <div>LEVEL: 1</div>
        </div>
        <div>
          <div>TIME: 08:00</div>
          <div>MISTAKES: {mistakes}/5</div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="p-4 border-b-2 border-green-500 bg-green-900 bg-opacity-10">
        <h3>CUSTOMER: {currentCustomer.name}</h3>
        <p>REQUEST: {currentCustomer.transaction.type} ${currentCustomer.transaction.amount}</p>
      </div>

      {/* Documents */}
      <div className="flex-1 p-4 overflow-auto">
        <h3 className="mb-4">EXAMINE DOCUMENTS - CLICK TO INSPECT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {currentCustomer.documents.map((doc) => (
            <div
              key={doc.id}
              className={`border-2 p-4 cursor-pointer transition-all ${
                selectedDoc === doc.id
                  ? 'border-yellow-500 bg-yellow-900 bg-opacity-20'
                  : doc.valid
                  ? 'border-green-500 hover:bg-green-900 hover:bg-opacity-20'
                  : 'border-red-500 hover:bg-red-900 hover:bg-opacity-20'
              }`}
              onClick={() => selectDocument(doc.id)}
            >
              <h4 className="font-bold mb-2">{doc.type}</h4>
              <p className="text-sm">Name: {doc.name}</p>
              <p className="text-sm">{doc.details}</p>
              {doc.error && (
                <p className="text-red-500 text-xs mt-2 border-t border-red-500 pt-2">
                  ERROR: {doc.error}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={processTransaction}
            className="flex-1 bg-green-500 text-black py-4 text-lg font-bold hover:bg-green-400 transition-colors"
          >
            PROCESS
          </button>
          <button
            onClick={rejectTransaction}
            className="flex-1 bg-red-500 text-white py-4 text-lg font-bold hover:bg-red-400 transition-colors"
          >
            REJECT
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-xs text-green-400 space-y-1">
          <p>• Click documents to examine them</p>
          <p>• Check names, amounts match across documents</p>
          <p>• Look for suspicious patterns or errors</p>
          <p>• Process valid transactions, reject fraudulent ones</p>
        </div>
      </div>
    </div>
  );
}

export default App;
