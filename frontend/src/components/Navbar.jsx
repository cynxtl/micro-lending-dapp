import React from 'react';

function Navbar({ account, onConnect, currentPage, onPageChange }) {
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNavItemClass = (page) => {
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      currentPage === page
        ? 'bg-primary text-white'
        : 'text-gray-700 hover:text-primary hover:bg-gray-100'
    }`;
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">DeFi Loans</h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-1">
            <button
              onClick={() => onPageChange('marketplace')}
              className={getNavItemClass('marketplace')}
            >
              Marketplace
            </button>
            <button
              onClick={() => onPageChange('request')}
              className={getNavItemClass('request')}
            >
              Request Loan
            </button>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Connected:</span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {formatAddress(account)}
                </span>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden py-4 border-t border-gray-200">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => onPageChange('marketplace')}
              className={getNavItemClass('marketplace')}
            >
              Marketplace
            </button>
            <button
              onClick={() => onPageChange('request')}
              className={getNavItemClass('request')}
            >
              Request Loan
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 