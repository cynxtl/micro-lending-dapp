import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LoanABI } from '../../contracts/abis/LoanABI';

function Marketplace({ contract, account, onLoanSelect, onPageChange }) {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contract) {
      loadLoans();
    }
  }, [contract]);

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get all loans
      const allLoans = await contract.getAllLoans();
      
      // Get loan details for each loan
      const loanDetails = await Promise.all(
        allLoans.map(async (loanAddress) => {
          try {
            const loanContract = new ethers.Contract(loanAddress, LoanABI, contract.runner);
            const details = await loanContract.getLoanDetails();
            const state = await loanContract.getLoanState();
            const isOverdue = await loanContract.isOverdue();
            
            return {
              address: loanAddress,
              borrower: details.borrower,
              lender: details.lender,
              amount: details.amount,
              interest: details.interest,
              duration: details.duration,
              collateral: details.collateral,
              dueDate: details.dueDate,
              state: state,
              createdAt: details.createdAt,
              isOverdue: isOverdue
            };
          } catch (error) {
            console.error('Error loading loan details:', error);
            return null;
          }
        })
      );

      // Filter out null values and sort by creation date
      const validLoans = loanDetails
        .filter(loan => loan !== null)
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

      setLoans(validLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
      setError('Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

  const getStateLabel = (state) => {
    const s = Number(state);
    switch (s) {
      case 0: return 'Pending';
      case 1: return 'Funded';
      case 2: return 'Repaid';
      case 3: return 'Defaulted';
      default: return 'Unknown';
    }
  };

  const getStateColor = (state, isOverdue) => {
    if (isOverdue) return 'bg-red-100 text-red-800';
    const s = Number(state);
    switch (s) {
      case 0: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp) => {
    if (Number(timestamp) === 0) return 'N/A';
    return new Date(Number(timestamp) * 1000).toUTCString();
  };

  const formatDuration = (seconds) => {
    const secs = Number(seconds);
    const days = Math.floor(secs / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const handleLoanClick = (loan) => {
    onLoanSelect(loan);
    onPageChange('details');
  };

  const handleRefresh = () => {
    loadLoans();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md max-w-md mx-auto">
          {error}
          <button
            onClick={handleRefresh}
            className="block mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Loan Marketplace</h2>
        <button
          onClick={handleRefresh}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-gray-50 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No loans available</h3>
            <p className="text-gray-500 mb-4">Be the first to create a loan request!</p>
            <button
              onClick={() => onPageChange('request')}
              className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create Loan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan, index) => (
            <div
              key={loan.address}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => handleLoanClick(loan)}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Loan #{index + 1}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(loan.state, loan.isOverdue)}`}>
                  {getStateLabel(loan.state)}
                  {loan.isOverdue && ' (Overdue)'}
                </span>
              </div>

              {/* Loan Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{ethers.formatEther(loan.amount)} ETH</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest:</span>
                  <span className="font-medium">{ethers.formatEther(loan.interest)} ETH</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{formatDuration(loan.duration)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Collateral:</span>
                  <span className="font-medium">{ethers.formatEther(loan.collateral)} ETH</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{formatDate(loan.dueDate)}</span>
                </div>
              </div>

              {/* Borrower Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Borrower:</span>
                  <span className="text-sm font-mono">
                    {loan.borrower === account ? 'You' : formatAddress(loan.borrower)}
                  </span>
                </div>
                
                {loan.lender !== ethers.ZeroAddress && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Lender:</span>
                    <span className="text-sm font-mono">
                      {loan.lender === account ? 'You' : formatAddress(loan.lender)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  className="w-full bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoanClick(loan);
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Marketplace; 