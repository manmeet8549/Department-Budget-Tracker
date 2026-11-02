require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: '../backend/.env' });
require('dotenv').config();

const accounts = process.env.LEDGER_SIGNER_PRIVATE_KEY
  ? [process.env.LEDGER_SIGNER_PRIVATE_KEY.startsWith('0x') ? process.env.LEDGER_SIGNER_PRIVATE_KEY : `0x${process.env.LEDGER_SIGNER_PRIVATE_KEY}`]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: process.env.LEDGER_RPC_URL || 'http://127.0.0.1:8545',
      chainId: 31337,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || process.env.LEDGER_RPC_URL || '',
      chainId: 11155111,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || process.env.LEDGER_RPC_URL || '',
      chainId: 80002,
      accounts: accounts.length > 0 ? accounts : undefined,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
