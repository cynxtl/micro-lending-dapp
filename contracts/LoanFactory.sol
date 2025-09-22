// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Loan.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoanFactory
 * @dev Factory contract for creating and managing loans
 */
contract LoanFactory is ReentrancyGuard, Pausable, Ownable {
    // Array to store all loan addresses
    address[] public loans;
    
    // Mapping from loan address to loan info
    mapping(address => bool) public isLoan;
    
    // Mapping from user to their loans (borrowed or lent)
    mapping(address => address[]) public userLoans;
    
    // Events
    event LoanCreated(
        address indexed loanAddress,
        address indexed borrower,
        uint256 amount,
        uint256 interest,
        uint256 duration,
        uint256 collateral
    );
    
    event LoanRemoved(address indexed loanAddress);
    event CollateralReleased(address indexed borrower, uint256 amount);
    event CollateralLiquidated(address indexed lender, uint256 amount);

    // Modifiers
    modifier onlyValidLoan(address _loan) {
        require(isLoan[_loan], "Invalid loan address");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new loan
     * @param _amount Loan amount in wei
     * @param _interest Interest amount in wei
     * @param _duration Duration in seconds
     * @param _collateral Collateral amount in wei
     */
    function createLoan(
        uint256 _amount,
        uint256 _interest,
        uint256 _duration,
        uint256 _collateral
    ) external payable nonReentrant whenNotPaused returns (address) {
        require(msg.value == _collateral, "Collateral amount must match msg.value");
        require(_amount > 0, "Amount must be greater than 0");
        require(_interest > 0, "Interest must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_collateral > 0, "Collateral must be greater than 0");
        
        // Create new loan contract
        Loan newLoan = new Loan(
            msg.sender,
            _amount,
            _interest,
            _duration,
            _collateral
        );
        
        address loanAddress = address(newLoan);
        
        // Store loan information
        loans.push(loanAddress);
        isLoan[loanAddress] = true;
        userLoans[msg.sender].push(loanAddress);
        
        emit LoanCreated(
            loanAddress,
            msg.sender,
            _amount,
            _interest,
            _duration,
            _collateral
        );
        
        return loanAddress;
    }

    /**
     * @dev Release collateral to borrower when loan is repaid
     * @param _loanAddress Address of the loan contract
     */
    function releaseCollateral(address _loanAddress) external onlyValidLoan(_loanAddress) {
        Loan loan = Loan(payable(_loanAddress));
        Loan.LoanDetails memory details = loan.getLoanDetails();
        
        require(details.state == Loan.LoanState.Repaid, "Loan must be repaid");
        require(msg.sender == details.borrower, "Only borrower can release collateral");
        
        // Remove loan from tracking
        removeLoan(_loanAddress);
        
        // Transfer collateral to borrower
        (bool success, ) = details.borrower.call{value: details.collateral}("");
        require(success, "Failed to transfer collateral to borrower");
        
        emit CollateralReleased(details.borrower, details.collateral);
    }

    /**
     * @dev Liquidate collateral when loan is defaulted
     * @param _loanAddress Address of the loan contract
     */
    function liquidateCollateral(address _loanAddress) external onlyValidLoan(_loanAddress) {
        Loan loan = Loan(payable(_loanAddress));
        Loan.LoanDetails memory details = loan.getLoanDetails();
        
        require(details.state == Loan.LoanState.Defaulted, "Loan must be defaulted");
        require(msg.sender == details.lender, "Only lender can liquidate collateral");
        
        // Remove loan from tracking
        removeLoan(_loanAddress);
        
        // Transfer collateral to lender
        (bool success, ) = details.lender.call{value: details.collateral}("");
        require(success, "Failed to transfer collateral to lender");
        
        emit CollateralLiquidated(details.lender, details.collateral);
    }

    /**
     * @dev Get all loans
     */
    function getAllLoans() external view returns (address[] memory) {
        return loans;
    }

    /**
     * @dev Get loans by user
     */
    function getLoansByUser(address _user) external view returns (address[] memory) {
        return userLoans[_user];
    }

    /**
     * @dev Get total number of loans
     */
    function getTotalLoans() external view returns (uint256) {
        return loans.length;
    }

    /**
     * @dev Get loan count by user
     */
    function getUserLoanCount(address _user) external view returns (uint256) {
        return userLoans[_user].length;
    }
    


    /**
     * @dev Get loans with pagination
     */
    function getLoansPaginated(uint256 _start, uint256 _count) external view returns (address[] memory) {
        require(_start < loans.length, "Start index out of bounds");
        
        uint256 end = _start + _count;
        if (end > loans.length) {
            end = loans.length;
        }
        
        address[] memory result = new address[](end - _start);
        for (uint256 i = _start; i < end; i++) {
            result[i - _start] = loans[i];
        }
        
        return result;
    }

    /**
     * @dev Get active loans (pending or funded)
     */
    function getActiveLoans() external view returns (address[] memory) {
        address[] memory activeLoans = new address[](loans.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < loans.length; i++) {
            address loanAddress = loans[i];
            Loan loan = Loan(payable(loanAddress));
            Loan.LoanState state = loan.getLoanState();
            
            if (state == Loan.LoanState.Pending || state == Loan.LoanState.Funded) {
                activeLoans[activeCount] = loanAddress;
                activeCount++;
            }
        }
        
        // Resize array to actual count
        address[] memory result = new address[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeLoans[i];
        }
        
        return result;
    }

    /**
     * @dev Remove a loan from tracking (only owner, for cleanup)
     */
    function removeLoan(address _loan) internal {
        // Remove from loans array
        for (uint256 i = 0; i < loans.length; i++) {
            if (loans[i] == _loan) {
                loans[i] = loans[loans.length - 1];
                loans.pop();
                break;
            }
        }
        
        // Remove from user loans
        Loan loan = Loan(payable(_loan));
        Loan.LoanDetails memory details = loan.getLoanDetails();
        address borrower = details.borrower;
        
        address[] storage borrowerLoans = userLoans[borrower];
        
        for (uint256 i = 0; i < borrowerLoans.length; i++) {
            if (borrowerLoans[i] == _loan) {
                borrowerLoans[i] = borrowerLoans[borrowerLoans.length - 1];
                borrowerLoans.pop();
                break;
            }
        }
        
        // Remove from lender loans if funded
        if (details.lender != address(0)) {
            address[] storage lenderLoans = userLoans[details.lender];
            
            for (uint256 i = 0; i < lenderLoans.length; i++) {
                if (lenderLoans[i] == _loan) {
                    lenderLoans[i] = lenderLoans[lenderLoans.length - 1];
                    lenderLoans.pop();
                    break;
                }
            }
        }
        
        isLoan[_loan] = false;
        emit LoanRemoved(_loan);
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

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Failed to withdraw");
    }

    // Receive function to accept ETH
    receive() external payable {}
} 