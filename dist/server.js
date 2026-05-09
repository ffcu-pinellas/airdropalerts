
// [PRODUCTION - ASSET MANAGEMENT SYSTEM]
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
// Hostinger Shared Hosting/Node.js app uses process.env.PORT
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false, // Fully disabled for Hostinger compatibility
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

app.use(compression());

// Serve static files from the current directory (dist)
app.use(express.static(__dirname));

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[PRODUCTION] Server running on port ${PORT}`);
});
        