// Mobile Implementation Test Script

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Mobile Implementation...\n');

// Test 1: Check mobile folder structure
console.log('📁 Testing folder structure...');
const mobileDir = path.join(__dirname, 'mobile');
const assetsDir = path.join(mobileDir, 'assets');
const sharedDir = path.join(mobileDir, 'shared');

const requiredFiles = [
    'mobile/connect.html',
    'mobile/assets/mobile-styles.css',
    'mobile/assets/mobile-scripts.js',
    'mobile/shared/sign-claim.js',
    'mobile/README.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allFilesExist = false;
    }
});

// Test 2: Check HTML content
console.log('\n📄 Testing HTML content...');
const connectHtml = fs.readFileSync(path.join(mobileDir, 'connect.html'), 'utf8');

const requiredElements = [
    'mobile-claim-container',
    'mobile-connect-button',
    'mobileWalletConnectModal',
    'mobileQRContainer',
    'mobile-loading-screen'
];

let allElementsExist = true;
requiredElements.forEach(element => {
    if (connectHtml.includes(element)) {
        console.log(`✅ ${element} found in HTML`);
    } else {
        console.log(`❌ ${element} missing from HTML`);
        allElementsExist = false;
    }
});

// Test 3: Check CSS content
console.log('\n🎨 Testing CSS content...');
const mobileStyles = fs.readFileSync(path.join(assetsDir, 'mobile-styles.css'), 'utf8');

const requiredStyles = [
    '.mobile-header',
    '.mobile-claim-card',
    '.mobile-connect-button',
    '.mobile-walletconnect-modal',
    '@media (max-width: 480px)'
];

let allStylesExist = true;
requiredStyles.forEach(style => {
    if (mobileStyles.includes(style)) {
        console.log(`✅ ${style} found in CSS`);
    } else {
        console.log(`❌ ${style} missing from CSS`);
        allStylesExist = false;
    }
});

// Test 4: Check JavaScript content
console.log('\n⚡ Testing JavaScript content...');
const mobileScripts = fs.readFileSync(path.join(assetsDir, 'mobile-scripts.js'), 'utf8');

const requiredFunctions = [
    'MobileAirdropAlert',
    'openMobileWalletConnect',
    'closeMobileWalletConnect',
    'connectMobileWallet',
    'showMobileQR'
];

let allFunctionsExist = true;
requiredFunctions.forEach(func => {
    if (mobileScripts.includes(func)) {
        console.log(`✅ ${func} found in JavaScript`);
    } else {
        console.log(`❌ ${func} missing from JavaScript`);
        allFunctionsExist = false;
    }
});

// Test 5: Check server configuration
console.log('\n🔧 Testing server configuration...');
const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

if (serverJs.includes("app.use('/mobile', express.static(path.join(__dirname, 'mobile')));")) {
    console.log('✅ Mobile static route configured');
} else {
    console.log('❌ Mobile static route missing');
    allFilesExist = false;
}

// Test 6: Check main HTML mobile detection
console.log('\n📱 Testing mobile detection...');
const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

if (indexHtml.includes('window.isMobile') && indexHtml.includes('setupCTARouting')) {
    console.log('✅ Mobile detection and CTA routing configured');
} else {
    console.log('❌ Mobile detection or CTA routing missing');
    allFilesExist = false;
}

// Test 7: Check environment configuration
console.log('\n⚙️ Testing environment configuration...');
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');

const requiredEnvVars = [
    'SERVER_USE_HTTPS=true',
    'WALLETCONNECT_PROJECT_ID',
    'MOBILE_DEEP_LINK_ENABLED=true'
];

let allEnvVarsExist = true;
requiredEnvVars.forEach(envVar => {
    if (envFile.includes(envVar)) {
        console.log(`✅ ${envVar} configured`);
    } else {
        console.log(`❌ ${envVar} missing`);
        allEnvVarsExist = false;
    }
});

// Summary
console.log('\n📊 Test Summary:');
console.log('================');

if (allFilesExist && allElementsExist && allStylesExist && allFunctionsExist) {
    console.log('🎉 All tests passed! Mobile implementation is ready.');
    console.log('\n📋 Next steps:');
    console.log('1. Set WALLETCONNECT_PROJECT_ID in .env');
    console.log('2. Generate SSL certificates for HTTPS');
    console.log('3. Start server: npm start');
    console.log('4. Test on mobile device: https://localhost:3000');
    console.log('5. Click any CTA button to test mobile flow');
} else {
    console.log('❌ Some tests failed. Please check the issues above.');
}

console.log('\n🔗 Mobile URL: https://localhost:3000/mobile/connect.html');
console.log('📱 Test on mobile device for full functionality');
