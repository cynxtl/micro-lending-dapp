# Decentralized Micro‑Lending DApp

A decentralized peer-to-peer micro-lending platform built on Ethereum with Solidity smart contracts (Hardhat) and a modern React + Vite frontend using Ethers.js v6.

## 🚀 Features

- **Smart Contract Based**: Lending lifecycle enforced by immutable smart contracts
- **Collateral Management**: ETH-based collateral escrow in factory for security
- **Peer-to-Peer**: Direct lending between borrowers and lenders
- **Automated Liquidation**: Post-due default handling by lender and factory
- **Deterministic Time Display**: Due dates shown in UTC for consistency
- **MetaMask Integration**: Seamless wallet connection and transaction signing
- **Simple UX**: Manual refresh in marketplace; details auto-refresh after actions

## 🏗️ Architecture

### Smart Contracts

- **`LoanFactory.sol`**: Manages loan creation and tracks all active loans
- **`Loan.sol`**: Individual loan contract with state management and business logic

### Frontend

- **React 19 + Vite**: SPA with hooks and functional components
- **Ethers.js v6**: Contract interaction and signing
- **MetaMask**: Wallet integration for transaction signing

## 📋 Prerequisites

- Node.js 18+
- MetaMask browser extension
- Sepolia testnet ETH (for testnet runs)
- Git

## 🔐 Wallet Setup & Testing Accounts

### MetaMask Installation
- Install the MetaMask browser extension and create a new wallet (or use an existing one on a non-production network).

### Localhost (Hardhat) Network in MetaMask
1. Start the Hardhat node:
   ```bash
   npm run node
   ```
   The terminal prints 20 funded accounts with their private keys.

2. Add a custom network in MetaMask:
   - Network name: Hardhat Localhost
   - New RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337 (matches `hardhat.config.js`); if your node prints a different Chain ID (e.g., 31337), use that value instead.
   - Currency symbol: ETH

3. Import testing accounts (borrower/lender):
   - In MetaMask: Account icon → Import Account → Paste one of the private keys printed by `npm run node`.
   - Repeat to import multiple accounts (e.g., 1 for borrower, 1 for lender).
   - These accounts are pre-funded by the local node; never reuse them on mainnet.

4. Connect the DApp:
   - Ensure MetaMask is on the Hardhat Localhost network.
   - Deploy contracts locally:
     ```bash
     npm run deploy:local
     ```
   - Start frontend:
     ```bash
     npm run frontend:dev
     ```
   - The deploy script writes `frontend/.env` with `VITE_LOAN_FACTORY_ADDRESS` for the frontend.

### Sepolia Testnet Accounts
1. Configure Sepolia in MetaMask (if not auto-added):
   - Network name: Sepolia
   - RPC URL: use the same as `SEPOLIA_RPC_URL` from your `.env` (e.g., Infura/Alchemy endpoint)
   - Chain ID: 11155111
   - Currency symbol: ETH
   - Block explorer: https://sepolia.etherscan.io/

2. Obtain test ETH:
   - Request Sepolia ETH from a reputable faucet (official Ethereum, Alchemy, Infura, or community faucets).
   - Wait for the transaction to confirm; verify on Sepolia Etherscan.

3. Use a deployer account with funds:
   - Set `PRIVATE_KEY` in the root `.env` to the private key of the MetaMask account holding Sepolia ETH.
   - Deploy:
     ```bash
     npm run deploy:sepolia
     ```
   - The deploy script prints the deployed factory address and attempts to write `frontend/.env` accordingly.

4. Connect the DApp:
   - Switch MetaMask to Sepolia.
   - Start the frontend:
     ```bash
     npm run frontend:dev
     ```
   - Confirm `frontend/.env` has the correct `VITE_LOAN_FACTORY_ADDRESS` for Sepolia.

### Common Wallet Pitfalls
- If the UI shows “Contract Not Found”, ensure MetaMask network matches the network where you deployed and that `frontend/.env` has the correct factory address.
- If the Repay button is missing, verify you’re using the borrower account (the account that created the loan), the loan is funded, and it’s not overdue.
- If transactions fail locally, confirm the account you’re using is one imported from Hardhat node output (those are pre-funded) and that you are on the Localhost network.

## 🛠️ Installation & Configuration

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MDM
   ```

2. **Install dependencies (root and frontend)**
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Root environment (.env)**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   # Sepolia Testnet Configuration
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-project-id
   PRIVATE_KEY=your-private-key-here

   # Etherscan API Key for contract verification
   ETHERSCAN_API_KEY=your-etherscan-api-key

   # Gas reporting (optional)
   REPORT_GAS=true
   ```

4. **Frontend environment (frontend/.env)**
   - This is written automatically by `scripts/deploy.js` after deployment:
     ```env
     VITE_LOAN_FACTORY_ADDRESS=<deployed-factory-address>
     ```
   - For local development, it will look like:
     ```env
     VITE_LOAN_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
     ```

## 🧪 Testing

### Run Hardhat Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Local Development (Smart Contracts + Frontend)
```bash
# 1) Start a local Hardhat node
npm run node

# 2) In a new terminal, deploy contracts to localhost (writes frontend/.env)
npm run deploy:local

# 3) Start the frontend (Vite dev server)
npm run frontend:dev
```
Notes:
- `scripts/deploy.js` writes `frontend/.env` with `VITE_LOAN_FACTORY_ADDRESS`.
- Ensure your MetaMask is connected to the Hardhat local network (chainId 31337/1337).

### Sepolia Testnet
```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Deploy and verify on Etherscan
npm run deploy:verify
```

## 🎯 Usage Examples

### 1. Create a Loan Request

1. Connect your MetaMask wallet
2. Navigate to "Request Loan" page
3. Fill in loan details:
   - **Amount**: 1.0 ETH
   - **Interest**: 0.1 ETH (10%)
   - **Duration**: 30 days
   - **Collateral**: 1.5 ETH
4. Submit transaction (requires collateral amount in ETH)

### 2. Fund a Loan

1. Browse available loans in the Marketplace
2. Click on a loan to view details
3. Click "Fund Loan" button
4. Confirm transaction in MetaMask

### 3. Repay a Loan

1. Go to your active loans
2. Click "Repay Loan" button
3. Send principal + interest amount
4. Collateral can then be released by borrower through the factory

### 4. Liquidate Defaulted Loan

1. Navigate to overdue loan details
2. Click "Liquidate Loan" button
3. Confirm liquidation
4. Collateral is transferred to lender via factory liquidation

## 🔒 Security Features

- **Reentrancy Protection**: `ReentrancyGuard` on external state-changing functions
- **Access Control**: Role checks (borrower/lender) and `Ownable` controls
- **Input Validation**: Strict parameter and state machine guards
- **Emergency Pause**: `Pausable` pause/unpause by owner
- **Collateral Escrow**: Collateral held at factory until settlement

## 📊 Loan States

| State | Description | Actions Available |
|-------|-------------|-------------------|
| **Pending** | Loan created, waiting for funding | Fund (lenders) |
| **Funded** | Loan active, borrower can repay | Repay (borrower), Liquidate (lender if overdue) |
| **Repaid** | Loan completed successfully | None |
| **Defaulted** | Loan overdue, collateral seized | None |

## 🌐 Network Support

- **Localhost**: Development and testing
- **Sepolia**: Testnet deployment
- **Mainnet**: Production deployment (update configuration)

## 📁 Project Structure

```
├── contracts/                 # Smart contracts
│   ├── Loan.sol             # Individual loan contract
│   └── LoanFactory.sol      # Loan factory contract
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contracts/abis    # Contract ABIs
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Vite/React entry
│   ├── package.json          # Frontend scripts (dev/build/preview)
│   └── vite.config.js        # Vite config

├── scripts/                  # Deployment and utility scripts
│   ├── deploy.js           # Main deployment script
│   └── test-loan-lifecycle.js # Lifecycle testing
├── test/                     # Hardhat tests
│   ├── Loan.test.js        # Loan contract tests
│   └── LoanFactory.test.js # Factory contract tests
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🔧 Configuration

### Hardhat Configuration
- Solidity 0.8.20 with optimizer enabled (runs: 200)
- Networks: `hardhat` (local), `sepolia` (via `.env` RPC and `PRIVATE_KEY`)
- Etherscan verification via `ETHERSCAN_API_KEY`
- Optional gas reporting with `REPORT_GAS`

### Frontend Configuration
- React + Vite with Ethers.js v6
- Marketplace supports manual refresh; details view refreshes after actions
- Due dates displayed in UTC to avoid timezone discrepancies

## 🚨 Important Notes

- **Testnet Only**: This is an MVP for testing purposes
- **ETH Collateral**: Uses ETH as collateral for simplicity
- **No Insurance**: No protection against smart contract bugs
- **Gas Costs**: All transactions require ETH for gas fees

## 🐛 Troubleshooting

### Common Issues

1. **MetaMask Connection Failed**
   - Ensure MetaMask is installed and unlocked
   - Check if you're on the correct network

2. **Transaction Failed**
   - Verify you have sufficient ETH for gas
   - Check if loan parameters are valid
   - Ensure you're not trying to fund your own loan

3. **Repay button not visible**
   - You must be the borrower, loan must be funded, and not overdue
   - Switch MetaMask to the borrower account that created the loan
   - Hit Refresh in the marketplace or reopen details to reload state

3. **Contract Not Found**
   - Verify `frontend/.env` contains `VITE_LOAN_FACTORY_ADDRESS`
   - Ensure contracts are deployed to the network selected in MetaMask

### Debug Commands

```bash
# Compile contracts
npm run compile

# Clean build artifacts
npm run clean

# Start local node with logging
npm run node
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk. This is experimental software and should not be used for production purposes without thorough testing and security audits.

## 🔗 Links

- [Ethereum Documentation](https://ethereum.org/developers/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [MetaMask Documentation](https://docs.metamask.io/)

## 📞 Support

For questions and support:
- Create an issue in the repository
- Check the troubleshooting section
- Review the test files for usage examples

---

**Built with ❤️ for the DeFi community** 