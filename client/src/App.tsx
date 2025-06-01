import React from 'react';
import './index.css';

function App() {
  console.log('App component loading...');
  
  return (
    <div className="w-full h-full bg-black text-green-500 font-mono flex items-center justify-center">
      <div className="text-center p-8 border-2 border-green-500 bg-green-900 bg-opacity-20">
        <h1 className="text-4xl mb-4">TELLER'S WINDOW</h1>
        <p className="text-xl mb-6">1980s Bank Simulation</p>
        <button 
          className="text-lg bg-green-500 text-black px-6 py-3 border-none cursor-pointer"
          onClick={() => {
            console.log('Button clicked!');
            alert('Game is working! Touch detected.');
          }}
          onTouchEnd={() => {
            console.log('Touch detected!');
            alert('Touch is working!');
          }}
        >
          TAP TO TEST
        </button>
        <p className="text-sm mt-4 text-yellow-500">Testing touch interactions</p>
      </div>
    </div>
  );
}

export default App;
