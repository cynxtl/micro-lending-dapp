// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Loan
 * @dev Represents an individual loan with collateral management
 */
contract Loan is ReentrancyGuard, Pausable, Ownable {
    enum LoanState {
        Pending,    // Loan created, waiting for funding
        Funded,     // Loan fully funded, active
        Repaid,     // Loan repaid, collateral released
        Defaulted   // Loan defaulted, can be liquidated
    }

    struct LoanDetails {
        address borrower;
        address lender;
        uint256 amount;
        uint256 interest;
        uint256 duration;
        uint256 collateral;
        uint256 dueDate;
        LoanState state;
        uint256 createdAt;
    }

    LoanDetails public loanDetails;
    
    // Events
    event LoanFunded(address indexed lender, uint256 amount);
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 interest);
    event LoanLiquidated(address indexed lender, uint256 collateral);
    event LoanDefaulted(uint256 dueDate);

    // Modifiers
    modifier onlyBorrower() {
        require(msg.sender == loanDetails.borrower, "Only borrower can call this function");
        _;
    }

    modifier onlyLender() {
        require(msg.sender == loanDetails.lender, "Only lender can call this function");
        _;
    }

    modifier loanActive() {
        require(loanDetails.state == LoanState.Funded, "Loan is not active");
        _;
    }

    modifier loanNotRepaid() {
        require(loanDetails.state != LoanState.Repaid, "Loan already repaid");
        _;
    }

    constructor(
        address _borrower,
        uint256 _amount,
        uint256 _interest,
        uint256 _duration,
        uint256 _collateral
    ) Ownable(_borrower) {
        require(_borrower != address(0), "Invalid borrower address");
        require(_amount > 0, "Amount must be greater than 0");
        require(_interest > 0, "Interest must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_collateral > 0, "Collateral must be greater than 0");

        loanDetails = LoanDetails({
            borrower: _borrower,
            lender: address(0),
            amount: _amount,
            interest: _interest,
            duration: _duration,
            collateral: _collateral,
            dueDate: 0,
            state: LoanState.Pending,
            createdAt: block.timestamp
        });
    }

    /**
     * @dev Fund the loan - only callable once
     */
    function fundLoan() external payable nonReentrant whenNotPaused {
        require(loanDetails.state == LoanState.Pending, "Loan is not pending");
        require(msg.value == loanDetails.amount, "Incorrect funding amount");
        require(msg.sender != loanDetails.borrower, "Borrower cannot fund their own loan");

        loanDetails.lender = msg.sender;
        loanDetails.dueDate = block.timestamp + loanDetails.duration;
        loanDetails.state = LoanState.Funded;

        // Transfer funds to borrower
        (bool success, ) = loanDetails.borrower.call{value: msg.value}("");
        require(success, "Failed to transfer funds to borrower");
        


        emit LoanFunded(msg.sender, msg.value);
    }

    /**
     * @dev Repay the loan with principal + interest
     */
    function repayLoan() external payable nonReentrant whenNotPaused loanActive loanNotRepaid {
        require(msg.sender == loanDetails.borrower, "Only borrower can repay");
        require(block.timestamp <= loanDetails.dueDate, "Loan is overdue");
        
        uint256 totalAmount = loanDetails.amount + loanDetails.interest;
        require(msg.value >= totalAmount, "Insufficient repayment amount");

        loanDetails.state = LoanState.Repaid;

        // Transfer repayment to lender
        (bool success, ) = loanDetails.lender.call{value: totalAmount}("");
        require(success, "Failed to transfer repayment to lender");

        // Return excess payment to borrower
        if (msg.value > totalAmount) {
            (bool refundSuccess, ) = loanDetails.borrower.call{value: msg.value - totalAmount}("");
            require(refundSuccess, "Failed to refund excess amount");
        }

        emit LoanRepaid(loanDetails.borrower, loanDetails.amount, loanDetails.interest);
    }

    /**
     * @dev Liquidate the loan if it's defaulted
     */
    function liquidateLoan() external nonReentrant whenNotPaused {
        require(loanDetails.state == LoanState.Funded, "Loan is not active");
        require(block.timestamp > loanDetails.dueDate, "Loan is not yet due");
        require(msg.sender == loanDetails.lender, "Only lender can liquidate");

        loanDetails.state = LoanState.Defaulted;

        emit LoanLiquidated(loanDetails.lender, loanDetails.collateral);
    }

    /**
     * @dev Check if loan is overdue and can be liquidated
     */
    function checkDefault() external {
        if (loanDetails.state == LoanState.Funded && 
            block.timestamp > loanDetails.dueDate) {
            loanDetails.state = LoanState.Defaulted;
            emit LoanDefaulted(loanDetails.dueDate);
        }
    }

    /**
     * @dev Get loan details
     */
    function getLoanDetails() external view returns (LoanDetails memory) {
        return loanDetails;
    }

    /**
     * @dev Get loan state
     */
    function getLoanState() external view returns (LoanState) {
        return loanDetails.state;
    }

    /**
     * @dev Check if loan is overdue
     */
    function isOverdue() external view returns (bool) {
        return loanDetails.state == LoanState.Funded && 
               block.timestamp > loanDetails.dueDate;
    }

    /**
     * @dev Pause contract in emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // Receive function to accept ETH
    receive() external payable {}
} 