/**
 * World-Class Stealth & Anti-Debug Layer (2026 Standards)
 * Protects the application from analysis by security researchers and automated scanners.
 */

(function() {
    'use strict';

    const StealthConfig = {
        enabled: true,
        clearConsole: true,
        detectDevTools: true,
        blockHeadless: true,
        antiVM: true,
        protectionLevel: 'paranoid' // 'standard', 'aggressive', 'paranoid'
    };

    if (!StealthConfig.enabled) return;

    // 1. Console Protection & Obfuscation
    if (StealthConfig.clearConsole) {
        const noop = () => {};
        const originalConsole = { ...console };
        
        // Disable aggressive console clearing in local dev to see real errors
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // In paranoid mode, we completely disable console for non-admin users
        if (StealthConfig.protectionLevel === 'paranoid' && !window.location.search.includes('debug=true') && !isLocal) {
            window.console.log = noop;
            window.console.info = noop;
            window.console.warn = noop;
            window.console.debug = noop;
            // Leave error for debugging issues, but obfuscate it
            window.console.error = function() {
                if (Math.random() > 0.9) originalConsole.error('[SYSTEM] Error reported');
            };
        }

        // Detect if console is cleared (some debuggers do this)
        setInterval(() => {
            if (StealthConfig.detectDevTools && !isLocal) {
                const start = performance.now();
                debugger;
                const end = performance.now();
                if (end - start > 100) {
                    // Debugger was active
                    window.location.href = 'https://google.com';
                }
            }
        }, 5000);
    }

    // 2. Headless Browser Detection (Puppeteer / Selenium)
    const detectHeadless = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        const isHeadless = 
            /headlesschrome/i.test(userAgent) || 
            navigator.webdriver || 
            window.domAutomation || 
            window.domAutomationController ||
            !navigator.languages || 
            navigator.languages.length === 0;

        if (isHeadless && StealthConfig.blockHeadless) {
            document.body.innerHTML = '<h1>403 Forbidden</h1><p>Access denied by security policy.</p>';
            window.stop();
            throw new Error('Security Violation');
        }
    };

    // 3. Anti-VM Fingerprinting
    const antiVM = () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
            const vendors = ['vmware', 'virtualbox', 'swiftshader', 'software adapter', 'google cloud'];
            
            for (const v of vendors) {
                if (renderer.includes(v)) {
                    // VM detected
                    if (StealthConfig.protectionLevel === 'paranoid') {
                        window.location.href = 'https://etherscan.io';
                    }
                }
            }
        }
    };

    // Initialize protection
    window.addEventListener('DOMContentLoaded', () => {
        detectHeadless();
        if (StealthConfig.antiVM) antiVM();
    });

    // Anti-DevTools Trick: Detect window resize
    let threshold = 160;
    window.addEventListener('resize', () => {
        if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
            if (StealthConfig.detectDevTools) {
                originalConsole.clear();
                originalConsole.log('%c STOP! ', 'color: red; font-size: 50px; font-weight: bold;');
                originalConsole.log('Security monitoring is active. Access violation detected.');
            }
        }
    });

})();
