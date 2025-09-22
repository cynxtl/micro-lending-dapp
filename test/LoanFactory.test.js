const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LoanFactory Contract", function () {
  let LoanFactory, loanFactory, Loan;
  let owner, borrower1, borrower2, lender1, lender2, otherAccount;
  let loanAmount, interest, duration, collateral;

  beforeEach(async function () {
    [owner, borrower1, borrower2, lender1, lender2, otherAccount] = await ethers.getSigners();
    
    // Deploy contracts
    LoanFactory = await ethers.getContractFactory("LoanFactory");
    loanFactory = await LoanFactory.deploy();
    
    Loan = await ethers.getContractFactory("Loan");
    
    // Loan parameters
    loanAmount = ethers.parseEther("1"); // 1 ETH
    interest = ethers.parseEther("0.1"); // 0.1 ETH (10% interest)
    duration = 86400; // 1 day in seconds
    collateral = ethers.parseEther("1.5"); // 1.5 ETH collateral
  });

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      expect(await loanFactory.owner()).to.equal(owner.address);
    });

    it("Should start with no loans", async function () {
      expect(await loanFactory.getTotalLoans()).to.equal(0);
      expect(await loanFactory.getAllLoans()).to.deep.equal([]);
    });
  });

  describe("Loan Creation", function () {
    it("Should create loan successfully", async function () {
      const tx = await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      
      expect(await loanFactory.getTotalLoans()).to.equal(1);
    });

    it("Should emit LoanCreated event", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          duration,
          collateral,
          { value: collateral }
        )
      ).to.emit(loanFactory, "LoanCreated");
    });

    it("Should track loan in user loans", async function () {
      await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      const userLoans = await loanFactory.getLoansByUser(borrower1.address);
      expect(userLoans.length).to.equal(1);
      expect(await loanFactory.getUserLoanCount(borrower1.address)).to.equal(1);
    });

    it("Should not create loan with zero amount", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          0,
          interest,
          duration,
          collateral,
          { value: collateral }
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not create loan with zero interest", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          0,
          duration,
          collateral,
          { value: collateral }
        )
      ).to.be.revertedWith("Interest must be greater than 0");
    });

    it("Should not create loan with zero duration", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          0,
          collateral,
          { value: collateral }
        )
      ).to.be.revertedWith("Duration must be greater than 0");
    });

    it("Should not create loan with zero collateral", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          duration,
          0,
          { value: 0 }
        )
      ).to.be.revertedWith("Collateral must be greater than 0");
    });

    it("Should not create loan with mismatched collateral", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          duration,
          collateral,
          { value: collateral + ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("Collateral amount must match msg.value");
    });

    it("Should not create loan with insufficient collateral", async function () {
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          duration,
          collateral,
          { value: collateral - ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("Collateral amount must match msg.value");
    });
  });

  describe("Multiple Loans", function () {
    beforeEach(async function () {
      // Create multiple loans
      await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      await loanFactory.connect(borrower2).createLoan(
        loanAmount * 2n,
        interest * 2n,
        duration * 2,
        collateral * 2n,
        { value: collateral * 2n }
      );
    });

    it("Should track multiple loans correctly", async function () {
      expect(await loanFactory.getTotalLoans()).to.equal(2);
      
      const allLoans = await loanFactory.getAllLoans();
      expect(allLoans.length).to.equal(2);
    });

    it("Should track user loans separately", async function () {
      const borrower1Loans = await loanFactory.getLoansByUser(borrower1.address);
      const borrower2Loans = await loanFactory.getLoansByUser(borrower2.address);
      
      expect(borrower1Loans.length).to.equal(1);
      expect(borrower2Loans.length).to.equal(1);
    });

    it("Should return correct user loan count", async function () {
      expect(await loanFactory.getUserLoanCount(borrower1.address)).to.equal(1);
      expect(await loanFactory.getUserLoanCount(borrower2.address)).to.equal(1);
      expect(await loanFactory.getUserLoanCount(otherAccount.address)).to.equal(0);
    });
  });

  describe("Loan Pagination", function () {
    beforeEach(async function () {
      // Create 5 loans
      for (let i = 0; i < 5; i++) {
        await loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          duration,
          collateral,
          { value: collateral }
        );
      }
    });

    it("Should return paginated results", async function () {
      const page1 = await loanFactory.getLoansPaginated(0, 3);
      const page2 = await loanFactory.getLoansPaginated(3, 3);
      
      expect(page1.length).to.equal(3);
      expect(page2.length).to.equal(2);
    });

    it("Should handle out of bounds start index", async function () {
      await expect(
        loanFactory.getLoansPaginated(10, 5)
      ).to.be.revertedWith("Start index out of bounds");
    });

    it("Should handle count larger than available loans", async function () {
      const loans = await loanFactory.getLoansPaginated(0, 10);
      expect(loans.length).to.equal(5);
    });
  });

  describe("Active Loans", function () {
    beforeEach(async function () {
      // Create loans
      await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      await loanFactory.connect(borrower2).createLoan(
        loanAmount * 2n,
        interest * 2n,
        duration * 2,
        collateral * 2n,
        { value: collateral * 2n }
      );
    });

    it("Should return active loans (pending)", async function () {
      const activeLoans = await loanFactory.getActiveLoans();
      expect(activeLoans.length).to.equal(2);
    });

    it("Should return active loans after funding", async function () {
      const allLoans = await loanFactory.getAllLoans();
      const loan1 = Loan.attach(allLoans[0]);
      
      // Fund first loan
      await loan1.connect(lender1).fundLoan({ value: loanAmount });
      
      const activeLoans = await loanFactory.getActiveLoans();
      expect(activeLoans.length).to.equal(2); // Both still active (funded + pending)
    });

    it("Should not return repaid loans", async function () {
      const allLoans = await loanFactory.getAllLoans();
      const loan1 = Loan.attach(allLoans[0]);
      
      // Fund and repay first loan
      await loan1.connect(lender1).fundLoan({ value: loanAmount });
      await loan1.connect(borrower1).repayLoan({ value: loanAmount + interest });
      
      const activeLoans = await loanFactory.getActiveLoans();
      expect(activeLoans.length).to.equal(1); // Only second loan active
    });
  });

  describe("Loan Removal", function () {
    let loanAddress;

    beforeEach(async function () {
      // Create a loan
      await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      const loans = await loanFactory.getAllLoans();
      loanAddress = loans[0];
    });

    it("Should allow owner to remove loan", async function () {
      // Since removeLoan is now internal, we'll test it through other functions
      // Create a loan, fund it, repay it, then release collateral
      const loan = Loan.attach(loanAddress);
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      await loan.connect(borrower1).repayLoan({ value: loanAmount + interest });
      
      await loanFactory.connect(borrower1).releaseCollateral(loanAddress);
      
      expect(await loanFactory.getTotalLoans()).to.equal(0);
      expect(await loanFactory.isLoan(loanAddress)).to.be.false;
    });

    it("Should emit LoanRemoved event", async function () {
      // Create a loan, fund it, repay it, then release collateral
      const loan = Loan.attach(loanAddress);
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      await loan.connect(borrower1).repayLoan({ value: loanAmount + interest });
      
      await expect(
        loanFactory.connect(borrower1).releaseCollateral(loanAddress)
      ).to.emit(loanFactory, "LoanRemoved").withArgs(loanAddress);
    });

    it("Should remove loan from user loans", async function () {
      // Create a loan, fund it, repay it, then release collateral
      const loan = Loan.attach(loanAddress);
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      await loan.connect(borrower1).repayLoan({ value: loanAmount + interest });
      
      await loanFactory.connect(borrower1).releaseCollateral(loanAddress);
      
      const userLoans = await loanFactory.getLoansByUser(borrower1.address);
      expect(userLoans.length).to.equal(0);
    });
  });

  describe("Pausable functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await loanFactory.pause();
      expect(await loanFactory.paused()).to.be.true;
      
      await loanFactory.unpause();
      expect(await loanFactory.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        loanFactory.connect(otherAccount).pause()
      ).to.be.revertedWithCustomError(loanFactory, "OwnableUnauthorizedAccount");
    });

    it("Should not allow loan creation when paused", async function () {
      await loanFactory.pause();
      
      await expect(
        loanFactory.connect(borrower1).createLoan(
          loanAmount,
          interest,
          duration,
          collateral,
          { value: collateral }
        )
      ).to.be.revertedWithCustomError(loanFactory, "EnforcedPause");
    });
  });

  describe("Emergency functions", function () {
    it("Should allow owner to withdraw ETH", async function () {
      // Send some ETH to contract
      await owner.sendTransaction({
        to: loanFactory.target,
        value: ethers.parseEther("1")
      });
      
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await loanFactory.emergencyWithdraw();
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        loanFactory.connect(otherAccount).emergencyWithdraw()
      ).to.be.revertedWithCustomError(loanFactory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Integration with Loan contracts", function () {
    let loanAddress, loan;

    beforeEach(async function () {
      // Create a loan
      await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      const loans = await loanFactory.getAllLoans();
      loanAddress = loans[0];
      loan = Loan.attach(loanAddress);
    });

    it("Should create valid loan contract", async function () {
      expect(await loanFactory.isLoan(loanAddress)).to.be.true;
      
      const details = await loan.getLoanDetails();
      expect(details.borrower).to.equal(borrower1.address);
      expect(details.amount).to.equal(loanAmount);
    });

    it("Should track funded loans correctly", async function () {
      // Fund the loan
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      
      // Check that loan is still tracked
      expect(await loanFactory.isLoan(loanAddress)).to.be.true;
      
      // Note: The factory doesn't automatically track lender loans in the current implementation
      // This would require additional contract modifications
      const lenderLoans = await loanFactory.getLoansByUser(lender1.address);
      expect(lenderLoans.length).to.equal(0); // Lender not tracked yet
    });
  });

  describe("Collateral Management", function () {
    let loanAddress, loan;

    beforeEach(async function () {
      // Create a loan
      await loanFactory.connect(borrower1).createLoan(
        loanAmount,
        interest,
        duration,
        collateral,
        { value: collateral }
      );
      
      const loans = await loanFactory.getAllLoans();
      loanAddress = loans[0];
      loan = Loan.attach(loanAddress);
    });

    it("Should release collateral when loan is repaid", async function () {
      // Fund the loan
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      
      // Repay the loan
      await loan.connect(borrower1).repayLoan({ value: loanAmount + interest });
      
      // Release collateral
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower1.address);
      await loanFactory.connect(borrower1).releaseCollateral(loanAddress);
      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower1.address);
      
      // Account for gas fees
      expect(borrowerBalanceAfter).to.be.gte(borrowerBalanceBefore + collateral - ethers.parseEther("0.01"));
    });

    it("Should liquidate collateral when loan is defaulted", async function () {
      // Fund the loan
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      // Liquidate the loan
      await loan.connect(lender1).liquidateLoan();
      
      // Liquidate collateral
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
      await loanFactory.connect(lender1).liquidateCollateral(loanAddress);
      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
      
      // Account for gas fees
      expect(lenderBalanceAfter).to.be.gte(lenderBalanceBefore + collateral - ethers.parseEther("0.01"));
    });
  });
}); 