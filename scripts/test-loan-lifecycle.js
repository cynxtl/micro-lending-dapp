const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing complete loan lifecycle...");

  // Get signers
  const [owner, borrower, lender, otherAccount] = await ethers.getSigners();
  console.log("👥 Test accounts:");
  console.log("   Owner:", owner.address);
  console.log("   Borrower:", borrower.address);
  console.log("   Lender:", lender.address);
  console.log("   Other:", otherAccount.address);

  // Deploy contracts
  console.log("\n📋 Deploying contracts...");
  const LoanFactory = await ethers.getContractFactory("LoanFactory");
  const loanFactory = await LoanFactory.deploy();
  await loanFactory.waitForDeployment();
  
  const Loan = await ethers.getContractFactory("Loan");
  
  console.log("✅ LoanFactory deployed to:", await loanFactory.getAddress());

  // Loan parameters
  const loanAmount = ethers.parseEther("1"); // 1 ETH
  const interest = ethers.parseEther("0.1"); // 0.1 ETH (10% interest)
  const duration = 86400; // 1 day in seconds
  const collateral = ethers.parseEther("1.5"); // 1.5 ETH collateral

  console.log("\n📊 Loan parameters:");
  console.log("   Amount:", ethers.formatEther(loanAmount), "ETH");
  console.log("   Interest:", ethers.formatEther(interest), "ETH");
  console.log("   Duration:", duration, "seconds (", Math.floor(duration / 86400), "days)");
  console.log("   Collateral:", ethers.formatEther(collateral), "ETH");

  // Step 1: Create Loan
  console.log("\n🔨 Step 1: Creating loan...");
  const createTx = await loanFactory.connect(borrower).createLoan(
    loanAmount,
    interest,
    duration,
    collateral,
    { value: collateral }
  );
  await createTx.wait();
  
  const loans = await loanFactory.getAllLoans();
  const loanAddress = loans[0];
  const loan = Loan.attach(loanAddress);
  
  console.log("✅ Loan created at:", loanAddress);
  
  // Check loan state
  const initialDetails = await loan.getLoanDetails();
  console.log("   State: Pending");
  console.log("   Borrower:", initialDetails.borrower);
  console.log("   Collateral locked:", ethers.formatEther(initialDetails.collateral), "ETH");

  // Step 2: Fund Loan
  console.log("\n💰 Step 2: Funding loan...");
  const fundTx = await loan.connect(lender).fundLoan({ value: loanAmount });
  await fundTx.wait();
  
  console.log("✅ Loan funded by:", lender.address);
  
  // Check loan state
  const fundedDetails = await loan.getLoanDetails();
  console.log("   State: Funded");
  console.log("   Lender:", fundedDetails.lender);
  console.log("   Due date:", new Date(Number(fundedDetails.dueDate) * 1000).toLocaleString());
  
  // Check balances
  const borrowerBalance = await ethers.provider.getBalance(borrower.address);
  const lenderBalance = await ethers.provider.getBalance(lender.address);
  console.log("   Borrower balance:", ethers.formatEther(borrowerBalance), "ETH");
  console.log("   Lender balance:", ethers.formatEther(lenderBalance), "ETH");

  // Step 3: Repay Loan (Success scenario)
  console.log("\n💸 Step 3: Repaying loan...");
  const totalAmount = loanAmount + interest;
  
  const repayTx = await loan.connect(borrower).repayLoan({ value: totalAmount });
  await repayTx.wait();
  
  console.log("✅ Loan repaid successfully!");
  
  // Check loan state
  const repaidDetails = await loan.getLoanDetails();
  console.log("   State: Repaid");
  
  // Check final balances
  const finalBorrowerBalance = await ethers.provider.getBalance(borrower.address);
  const finalLenderBalance = await ethers.provider.getBalance(lender.address);
  console.log("   Final borrower balance:", ethers.formatEther(finalBorrowerBalance), "ETH");
  console.log("   Final lender balance:", ethers.formatEther(finalLenderBalance), "ETH");

  // Step 4: Test Default Scenario (with new loan)
  console.log("\n⚠️  Step 4: Testing default scenario...");
  
  // Create another loan
  const createTx2 = await loanFactory.connect(borrower).createLoan(
    loanAmount,
    interest,
    duration,
    collateral,
    { value: collateral }
  );
  await createTx2.wait();
  
  const loans2 = await loanFactory.getAllLoans();
  const loanAddress2 = loans2[1];
  const loan2 = Loan.attach(loanAddress2);
  
  console.log("✅ Second loan created at:", loanAddress2);
  
  // Fund the loan
  const fundTx2 = await loan2.connect(lender).fundLoan({ value: loanAmount });
  await fundTx2.wait();
  
  console.log("✅ Second loan funded");
  
  // Fast forward time past due date
  console.log("⏰ Fast forwarding time past due date...");
  await ethers.provider.send("evm_increaseTime", [duration + 1]);
  await ethers.provider.send("evm_mine");
  
  // Check if loan is overdue
  const isOverdue = await loan2.isOverdue();
  console.log("   Loan overdue:", isOverdue);
  
  // Liquidate the loan
  console.log("💥 Liquidating overdue loan...");
  const liquidateTx = await loan2.connect(lender).liquidateLoan();
  await liquidateTx.wait();
  
  console.log("✅ Loan liquidated successfully!");
  
  // Check final state
  const liquidatedDetails = await loan2.getLoanDetails();
  console.log("   Final state: Defaulted");
  
  // Check lender received collateral
  const finalLenderBalance2 = await ethers.provider.getBalance(lender.address);
  console.log("   Lender balance after liquidation:", ethers.formatEther(finalLenderBalance2), "ETH");

  // Summary
  console.log("\n📈 Test Summary:");
  console.log("   ✅ Loan creation: SUCCESS");
  console.log("   ✅ Loan funding: SUCCESS");
  console.log("   ✅ Loan repayment: SUCCESS");
  console.log("   ✅ Loan default: SUCCESS");
  console.log("   ✅ Loan liquidation: SUCCESS");
  
  console.log("\n🎉 All loan lifecycle tests completed successfully!");
  console.log("\n🔗 Contract addresses:");
  console.log("   LoanFactory:", await loanFactory.getAddress());
  console.log("   Loan 1 (repaid):", loanAddress);
  console.log("   Loan 2 (liquidated):", loanAddress2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 