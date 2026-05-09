#!/usr/bin/env node

// Simple SSL certificate generation script for local testing
// This creates self-signed certificates for HTTPS development

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating SSL certificates for local HTTPS testing...');

// Create ssl directory if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
    console.log('📁 Created ssl directory');
}

try {
    // Generate private key
    console.log('🔑 Generating private key...');
    execSync('openssl genrsa -out ssl/private.key 2048', { stdio: 'inherit' });
    
    // Generate certificate signing request
    console.log('📝 Generating certificate signing request...');
    execSync('openssl req -new -key ssl/private.key -out ssl/certificate.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"', { stdio: 'inherit' });
    
    // Generate self-signed certificate
    console.log('📜 Generating self-signed certificate...');
    execSync('openssl x509 -req -days 365 -in ssl/certificate.csr -signkey ssl/private.key -out ssl/certificate.crt', { stdio: 'inherit' });
    
    // Clean up CSR file
    fs.unlinkSync('ssl/certificate.csr');
    
    console.log('✅ SSL certificates generated successfully!');
    console.log('📁 Files created:');
    console.log('   - ssl/private.key');
    console.log('   - ssl/certificate.crt');
    console.log('');
    console.log('🚀 You can now run the server with HTTPS enabled!');
    console.log('   Set SERVER_USE_HTTPS=true in your .env file');
    console.log('');
    console.log('⚠️  Note: These are self-signed certificates for development only.');
    console.log('   Your browser will show a security warning - click "Advanced" and "Proceed" to continue.');
    
} catch (error) {
    console.error('❌ Error generating SSL certificates:', error.message);
    console.log('');
    console.log('💡 Alternative: You can generate certificates manually using:');
    console.log('   openssl genrsa -out ssl/private.key 2048');
    console.log('   openssl req -new -key ssl/private.key -out ssl/certificate.csr');
    console.log('   openssl x509 -req -days 365 -in ssl/certificate.csr -signkey ssl/private.key -out ssl/certificate.crt');
    console.log('');
    console.log('   Or use mkcert for trusted local certificates:');
    console.log('   npm install -g mkcert');
    console.log('   mkcert -install');
    console.log('   mkcert localhost 127.0.0.1 ::1');
}
