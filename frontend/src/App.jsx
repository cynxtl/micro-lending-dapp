import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Navbar from './components/Navbar';
import RequestLoan from './components/RequestLoan';
import Marketplace from './components/Marketplace';
import LoanDetails from './components/LoanDetails';
import { LoanFactoryABI } from '../contracts/abis/LoanFactoryABI';
import { LoanABI } from '../contracts/abis/LoanABI';

// Contract address is provided via Vite env var. Set VITE_LOAN_FACTORY_ADDRESS in frontend/.env
const LOAN_FACTORY_ADDRESS = import.meta.env.VITE_LOAN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [currentPage, setCurrentPage] = useState('marketplace');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setAccount(accounts[0]);
        setProvider(provider);
        setSigner(signer);
        
        // Initialize contract
        const contract = new ethers.Contract(LOAN_FACTORY_ADDRESS, LoanFactoryABI, signer);
        setContract(contract);
        
        console.log('Wallet connected:', accounts[0]);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    }
  };

  // Handle account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setProvider(null);
          setSigner(null);
          setContract(null);
        }
      });
    }
  }, []);

  // Auto-connect if already authorized
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.selectedAddress) {
      connectWallet();
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'request':
        return <RequestLoan contract={contract} account={account} onSuccess={() => setCurrentPage('marketplace')} />;
      case 'marketplace':
        return <Marketplace contract={contract} account={account} onLoanSelect={setSelectedLoan} onPageChange={setCurrentPage} />;
      case 'details':
        return <LoanDetails loan={selectedLoan} account={account} onBack={() => setCurrentPage('marketplace')} />;
      default:
        return <Marketplace contract={contract} account={account} onLoanSelect={setSelectedLoan} onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        account={account} 
        onConnect={connectWallet}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      
      <main className="container mx-auto px-4 py-8">
        {LOAN_FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000' && (
          <div className="mb-6 p-4 rounded border border-yellow-300 bg-yellow-50 text-yellow-800">
            <strong>Config needed:</strong> Set VITE_LOAN_FACTORY_ADDRESS in frontend/.env to your deployed LoanFactory address.
          </div>
        )}
        {!account ? (
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to DeFi Micro-Lending
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect your wallet to start borrowing and lending
            </p>
            <button
              onClick={connectWallet}
              className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div>
            {isLoading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-700">Processing transaction...</p>
                </div>
              </div>
            )}
            {renderPage()}
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 