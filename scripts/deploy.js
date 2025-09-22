const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy LoanFactory
  console.log("\n📋 Deploying LoanFactory...");
  const LoanFactory = await ethers.getContractFactory("LoanFactory");
  const loanFactory = await LoanFactory.deploy();
  await loanFactory.waitForDeployment();
  
  const loanFactoryAddress = await loanFactory.getAddress();
  console.log("✅ LoanFactory deployed to:", loanFactoryAddress);

  // Write address for frontend consumption
  try {
    const frontendDir = path.join(__dirname, "..", "frontend");
    const envPath = path.join(frontendDir, ".env");
    const envContent = `VITE_LOAN_FACTORY_ADDRESS=${loanFactoryAddress}\n`;
    fs.writeFileSync(envPath, envContent, { encoding: "utf-8" });
    console.log("\n📝 Wrote frontend/.env with LoanFactory address:");
    console.log("   ", envContent.trim());
  } catch (e) {
    console.log("\n⚠️  Could not write frontend/.env automatically:", e.message);
    console.log("   Please create frontend/.env with:\n   VITE_LOAN_FACTORY_ADDRESS=", loanFactoryAddress);
  }

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  // Check if contracts are deployed correctly
  const owner = await loanFactory.owner();
  const totalLoans = await loanFactory.getTotalLoans();
  
  console.log("👑 Factory owner:", owner);
  console.log("📊 Initial total loans:", totalLoans.toString());
  
  if (owner === deployer.address && totalLoans.toString() === "0") {
    console.log("✅ Deployment verification successful!");
  } else {
    console.log("❌ Deployment verification failed!");
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("   LoanFactory:", loanFactoryAddress);
  console.log("\n🔗 Next steps:");
  console.log("   1. Verify contracts on Etherscan");
  console.log("   2. Update frontend configuration");
  console.log("   3. Test the contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 