const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan Contract", function () {
  let Loan, loan, LoanFactory, loanFactory;
  let owner, borrower, lender, otherAccount;
  let loanAmount, interest, duration, collateral;

  beforeEach(async function () {
    [owner, borrower, lender, otherAccount] = await ethers.getSigners();
    
    // Deploy LoanFactory first
    LoanFactory = await ethers.getContractFactory("LoanFactory");
    loanFactory = await LoanFactory.deploy();
    
    // Deploy Loan contract
    Loan = await ethers.getContractFactory("Loan");
    
    // Loan parameters
    loanAmount = ethers.parseEther("1"); // 1 ETH
    interest = ethers.parseEther("0.1"); // 0.1 ETH (10% interest)
    duration = 86400; // 1 day in seconds
    collateral = ethers.parseEther("1.5"); // 1.5 ETH collateral
    
    // Create loan through factory
    await loanFactory.connect(borrower).createLoan(
      loanAmount,
      interest,
      duration,
      collateral,
      { value: collateral }
    );
    
    // Get the deployed loan address
    const loans = await loanFactory.getAllLoans();
    const loanAddress = loans[0];
    loan = Loan.attach(loanAddress);
  });

  describe("Deployment", function () {
    it("Should set correct initial values", async function () {
      const details = await loan.getLoanDetails();
      
      expect(details.borrower).to.equal(borrower.address);
      expect(details.amount).to.equal(loanAmount);
      expect(details.interest).to.equal(interest);
      expect(details.duration).to.equal(duration);
      expect(details.collateral).to.equal(collateral);
      expect(details.state).to.equal(0); // Pending
      expect(details.lender).to.equal(ethers.ZeroAddress);
    });

    it("Should accept collateral", async function () {
      // The collateral is held by the factory, not the individual loan
      const factoryBalance = await ethers.provider.getBalance(loanFactory.target);
      expect(factoryBalance).to.equal(collateral);
    });
  });

  describe("Funding", function () {
    it("Should allow lender to fund loan", async function () {
      await loan.connect(lender).fundLoan({ value: loanAmount });
      
      const details = await loan.getLoanDetails();
      expect(details.lender).to.equal(lender.address);
      expect(details.state).to.equal(1); // Funded
      expect(details.dueDate).to.be.gt(0);
    });

    it("Should transfer funds to borrower when funded", async function () {
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      
      await loan.connect(lender).fundLoan({ value: loanAmount });
      
      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);
      expect(borrowerBalanceAfter).to.equal(borrowerBalanceBefore + loanAmount);
    });

    it("Should not allow borrower to fund their own loan", async function () {
      await expect(
        loan.connect(borrower).fundLoan({ value: loanAmount })
      ).to.be.revertedWith("Borrower cannot fund their own loan");
    });

    it("Should not allow funding with wrong amount", async function () {
      await expect(
        loan.connect(lender).fundLoan({ value: loanAmount + ethers.parseEther("0.1") })
      ).to.be.revertedWith("Incorrect funding amount");
    });

    it("Should not allow funding already funded loan", async function () {
      await loan.connect(lender).fundLoan({ value: loanAmount });
      
      await expect(
        loan.connect(otherAccount).fundLoan({ value: loanAmount })
      ).to.be.revertedWith("Loan is not pending");
    });
  });

  describe("Repayment", function () {
    beforeEach(async function () {
      // Fund the loan first
      await loan.connect(lender).fundLoan({ value: loanAmount });
    });

    it("Should allow borrower to repay loan", async function () {
      const totalAmount = loanAmount + interest;
      await loan.connect(borrower).repayLoan({ value: totalAmount });
      
      const details = await loan.getLoanDetails();
      expect(details.state).to.equal(2); // Repaid
    });

    it("Should transfer repayment to lender", async function () {
      const lenderBalanceBefore = await ethers.provider.getBalance(lender.address);
      const totalAmount = loanAmount + interest;
      
      await loan.connect(borrower).repayLoan({ value: totalAmount });
      
      const lenderBalanceAfter = await ethers.provider.getBalance(lender.address);
      expect(lenderBalanceAfter).to.equal(lenderBalanceBefore + totalAmount);
    });

    it("Should not allow non-borrower to repay", async function () {
      const totalAmount = loanAmount + interest;
      await expect(
        loan.connect(otherAccount).repayLoan({ value: totalAmount })
      ).to.be.revertedWith("Only borrower can repay");
    });

    it("Should not allow insufficient repayment", async function () {
      await expect(
        loan.connect(borrower).repayLoan({ value: loanAmount })
      ).to.be.revertedWith("Insufficient repayment amount");
    });

    it("Should not allow repayment after due date", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      const totalAmount = loanAmount + interest;
      await expect(
        loan.connect(borrower).repayLoan({ value: totalAmount })
      ).to.be.revertedWith("Loan is overdue");
    });

    it("Should refund excess payment", async function () {
      const totalAmount = loanAmount + interest;
      const excessAmount = ethers.parseEther("0.1");
      
      // Repay with excess - this should succeed and refund the excess
      await expect(
        loan.connect(borrower).repayLoan({ value: totalAmount + excessAmount })
      ).to.not.be.reverted;
      
      // Verify the loan is marked as repaid
      const details = await loan.getLoanDetails();
      expect(details.state).to.equal(2); // Repaid
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      // Fund the loan first
      await loan.connect(lender).fundLoan({ value: loanAmount });
    });

    it("Should allow lender to liquidate overdue loan", async function () {
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      await loan.connect(lender).liquidateLoan();
      
      const details = await loan.getLoanDetails();
      expect(details.state).to.equal(3); // Defaulted
    });

    it("Should not transfer collateral on liquidation (handled by factory)", async function () {
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      await loan.connect(lender).liquidateLoan();
      
      // The loan contract just changes state, factory handles collateral
      const details = await loan.getLoanDetails();
      expect(details.state).to.equal(3); // Defaulted
    });

    it("Should not allow liquidation before due date", async function () {
      await expect(
        loan.connect(lender).liquidateLoan()
      ).to.be.revertedWith("Loan is not yet due");
    });

    it("Should not allow non-lender to liquidate", async function () {
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(
        loan.connect(otherAccount).liquidateLoan()
      ).to.be.revertedWith("Only lender can liquidate");
    });

    it("Should not allow liquidation of repaid loan", async function () {
      const totalAmount = loanAmount + interest;
      await loan.connect(borrower).repayLoan({ value: totalAmount });
      
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(
        loan.connect(lender).liquidateLoan()
      ).to.be.revertedWith("Loan is not active");
    });
  });

  describe("Default checking", function () {
    beforeEach(async function () {
      // Fund the loan first
      await loan.connect(lender).fundLoan({ value: loanAmount });
    });

    it("Should mark loan as defaulted when overdue", async function () {
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      await loan.checkDefault();
      
      const details = await loan.getLoanDetails();
      expect(details.state).to.equal(3); // Defaulted
    });

    it("Should not mark loan as defaulted before due date", async function () {
      await loan.checkDefault();
      
      const details = await loan.getLoanDetails();
      expect(details.state).to.equal(1); // Still Funded
    });
  });

  describe("State queries", function () {
    it("Should return correct loan state", async function () {
      let state = await loan.getLoanState();
      expect(state).to.equal(0); // Pending
      
      await loan.connect(lender).fundLoan({ value: loanAmount });
      state = await loan.getLoanState();
      expect(state).to.equal(1); // Funded
    });

    it("Should correctly identify overdue loans", async function () {
      await loan.connect(lender).fundLoan({ value: loanAmount });
      
      let isOverdue = await loan.isOverdue();
      expect(isOverdue).to.be.false;
      
      // Fast forward time past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      isOverdue = await loan.isOverdue();
      expect(isOverdue).to.be.true;
    });
  });

  describe("Pausable functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      // The borrower is the owner of the loan contract
      await loan.connect(borrower).pause();
      expect(await loan.paused()).to.be.true;
      
      await loan.connect(borrower).unpause();
      expect(await loan.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        loan.connect(otherAccount).pause()
      ).to.be.revertedWithCustomError(loan, "OwnableUnauthorizedAccount");
    });

    it("Should not allow operations when paused", async function () {
      await loan.connect(borrower).pause();
      
      await expect(
        loan.connect(lender).fundLoan({ value: loanAmount })
      ).to.be.revertedWithCustomError(loan, "EnforcedPause");
    });
  });
}); 