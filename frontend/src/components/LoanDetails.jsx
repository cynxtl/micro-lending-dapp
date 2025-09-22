import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LoanABI } from '../../contracts/abis/LoanABI';

function LoanDetails({ loan, account, onBack }) {
  const [loanContract, setLoanContract] = useState(null);
  const [loanData, setLoanData] = useState(loan);
  const [currentState, setCurrentState] = useState(Number(loan.state));
  const [isOverdue, setIsOverdue] = useState(loan.isOverdue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (loan && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(loan.address, LoanABI, provider);
      setLoanContract(contract);
      setLoanData(loan);
    }
  }, [loan]);

  // Refresh details once the contract is ready (ensures latest state/overdue/dueDate)
  useEffect(() => {
    if (loanContract) {
      (async () => {
        await refreshLoanDetails();
      })();
    }
  }, [loanContract]);

  const refreshLoanDetails = async () => {
    if (!loanContract) return;
    try {
      const details = await loanContract.getLoanDetails();
      const state = await loanContract.getLoanState();
      const overdue = await loanContract.isOverdue();

      // Update composite loan data used by UI
      setLoanData(prev => ({
        ...prev,
        address: loan.address,
        borrower: details.borrower,
        lender: details.lender,
        amount: details.amount,
        interest: details.interest,
        duration: details.duration,
        collateral: details.collateral,
        dueDate: details.dueDate,
        state: state,
        createdAt: details.createdAt,
        isOverdue: overdue
      }));

      setCurrentState(Number(state));
      setIsOverdue(overdue);
    } catch (error) {
      console.error('Error refreshing loan details:', error);
    }
  };

  const handleFundLoan = async () => {
    if (!loanContract) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const signer = await loanContract.runner.provider.getSigner();
      const contractWithSigner = loanContract.connect(signer);
      
      const tx = await contractWithSigner.fundLoan({ value: loan.amount });
      await tx.wait();
      
      setSuccess('Loan funded successfully!');
      await refreshLoanDetails();
    } catch (error) {
      console.error('Error funding loan:', error);
      setError(error.message || 'Failed to fund loan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepayLoan = async () => {
    if (!loanContract) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const signer = await loanContract.runner.provider.getSigner();
      const contractWithSigner = loanContract.connect(signer);
      
      const totalAmount = loan.amount + loan.interest;
      const tx = await contractWithSigner.repayLoan({ value: totalAmount });
      await tx.wait();
      
      setSuccess('Loan repaid successfully!');
      await refreshLoanDetails();
    } catch (error) {
      console.error('Error repaying loan:', error);
      setError(error.message || 'Failed to repay loan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLiquidateLoan = async () => {
    if (!loanContract) return;
    
    if (!confirm('Are you sure you want to liquidate this loan? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const signer = await loanContract.runner.provider.getSigner();
      const contractWithSigner = loanContract.connect(signer);
      
      const tx = await contractWithSigner.liquidateLoan();
      await tx.wait();
      
      setSuccess('Loan liquidated successfully!');
      await refreshLoanDetails();
    } catch (error) {
      console.error('Error liquidating loan:', error);
      setError(error.message || 'Failed to liquidate loan');
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

  const getStateColor = (state) => {
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

  const equalsAddress = (a = '', b = '') => a.toLowerCase() === b.toLowerCase();

  const canFund = Number(currentState) === 0 && !equalsAddress(account, loanData.borrower);
  const canRepay = Number(currentState) === 1 && equalsAddress(account, loanData.borrower) && !isOverdue;
  const canLiquidate = Number(currentState) === 1 && equalsAddress(account, loanData.lender) && isOverdue;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={onBack}
          className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← Back to Marketplace
        </button>
        <h2 className="text-3xl font-bold text-gray-900">Loan Details</h2>
      </div>

      {/* Loan Information Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        {/* Status Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Loan Information</h3>
            <p className="text-gray-600">Created on {formatDate(loanData.createdAt)}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStateColor(currentState)}`}>
            {getStateLabel(currentState)}
            {isOverdue && ' (Overdue)'}
          </span>
        </div>

        {/* Loan Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Loan Amount</label>
              <p className="text-2xl font-bold text-gray-900">{ethers.formatEther(loanData.amount)} ETH</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Interest</label>
              <p className="text-xl font-semibold text-gray-900">{ethers.formatEther(loanData.interest)} ETH</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total to Repay</label>
              <p className="text-xl font-semibold text-primary">{ethers.formatEther(loanData.amount + loanData.interest)} ETH</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Duration</label>
              <p className="text-lg font-medium text-gray-900">{formatDuration(loanData.duration)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Collateral</label>
              <p className="text-lg font-medium text-gray-900">{ethers.formatEther(loanData.collateral)} ETH</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
              <p className="text-lg font-medium text-gray-900">{formatDate(loanData.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Participants</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Borrower</label>
              <p className="font-mono text-gray-900">
                {equalsAddress(loanData.borrower, account) ? 'You' : formatAddress(loanData.borrower)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Lender</label>
              <p className="font-mono text-gray-900">
                {loanData.lender === ethers.ZeroAddress ? 'Not funded yet' : 
                 equalsAddress(loanData.lender, account) ? 'You' : formatAddress(loanData.lender)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Actions</h4>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
            {success}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {canFund && (
            <button
              onClick={handleFundLoan}
              disabled={isLoading}
              className="bg-secondary hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? 'Processing...' : `Fund Loan (${ethers.formatEther(loan.amount)} ETH)`}
            </button>
          )}
          
          {canRepay && (
            <button
              onClick={handleRepayLoan}
              disabled={isLoading}
              className="bg-primary hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? 'Processing...' : `Repay Loan (${ethers.formatEther(loan.amount + loan.interest)} ETH)`}
            </button>
          )}
          
          {canLiquidate && (
            <button
              onClick={handleLiquidateLoan}
              disabled={isLoading}
              className="bg-danger hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? 'Processing...' : 'Liquidate Loan'}
            </button>
          )}
          
          {!canFund && !canRepay && !canLiquidate && (
            <p className="text-gray-500 italic">No actions available for this loan</p>
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-3">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• <strong>Pending:</strong> Loan is created and waiting for funding</li>
          <li>• <strong>Funded:</strong> Loan is active and borrower can repay</li>
          <li>• <strong>Repaid:</strong> Loan is completed and collateral returned</li>
          <li>• <strong>Defaulted:</strong> Loan is overdue and can be liquidated</li>
          <li>• <strong>Overdue:</strong> Loan has passed its due date</li>
        </ul>
      </div>
    </div>
  );
}

export default LoanDetails; 