import React, { useState } from 'react';
import { ethers } from 'ethers';

function RequestLoan({ contract, account, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: '',
    interest: '',
    duration: '',
    collateral: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!formData.amount || !formData.interest || !formData.duration || !formData.collateral) {
        throw new Error('All fields are required');
      }

      const amount = ethers.parseEther(formData.amount);
      const interest = ethers.parseEther(formData.interest);
      const duration = parseInt(formData.duration) * 86400; // Convert days to seconds
      const collateral = ethers.parseEther(formData.collateral);

      // Validate amounts
      if (amount <= 0 || interest <= 0 || duration <= 0 || collateral <= 0) {
        throw new Error('All values must be greater than 0');
      }

      if (collateral < amount) {
        throw new Error('Collateral must be greater than or equal to loan amount');
      }

      // Create loan
      const tx = await contract.createLoan(amount, interest, duration, collateral, {
        value: collateral
      });

      await tx.wait();
      
      alert('Loan created successfully!');
      setFormData({ amount: '', interest: '', duration: '', collateral: '' });
      onSuccess();
      
    } catch (error) {
      console.error('Error creating loan:', error);
      setError(error.message || 'Failed to create loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Request a Loan
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loan Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount (ETH)
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="1.0"
              required
            />
          </div>

          {/* Interest */}
          <div>
            <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-2">
              Interest Amount (ETH)
            </label>
            <input
              type="number"
              id="interest"
              name="interest"
              step="0.01"
              min="0.01"
              value={formData.interest}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.1"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Total to repay: {formData.amount && formData.interest ? 
                (parseFloat(formData.amount) + parseFloat(formData.interest)).toFixed(2) + ' ETH' : 
                '0.00 ETH'
              }
            </p>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              min="1"
              max="365"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="30"
              required
            />
          </div>

          {/* Collateral */}
          <div>
            <label htmlFor="collateral" className="block text-sm font-medium text-gray-700 mb-2">
              Collateral (ETH)
            </label>
            <input
              type="number"
              id="collateral"
              name="collateral"
              step="0.01"
              min="0.01"
              value={formData.collateral}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="1.5"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Collateral ratio: {formData.amount && formData.collateral ? 
                ((parseFloat(formData.collateral) / parseFloat(formData.amount)) * 100).toFixed(1) + '%' : 
                '0%'
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Creating Loan...' : 'Create Loan'}
          </button>
        </form>

        {/* Information */}
        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2">Important Information:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You must provide collateral equal to the amount specified</li>
            <li>• Collateral will be locked until the loan is repaid</li>
            <li>• If you default, your collateral will be liquidated</li>
            <li>• Interest is calculated as a fixed amount, not percentage</li>
            <li>• Duration is specified in days</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RequestLoan; 