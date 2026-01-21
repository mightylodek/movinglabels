# Git Migration Steps

Follow these steps to migrate your app using Git.

## Step 1: Prepare Your Code for Commit

### Review and stage your changes:

```bash
cd /Users/georgebrown/Projects/moving_labels_qr

# See what's changed
git status

# Stage all your changes (this includes the new files and modifications)
git add .

# This will add:
# - Modified files (server.js, app.js, etc.)
# - New files (MIGRATION_CHECKLIST.md, auth.js, backup.js, db.js, md/, views/)
# - Deleted files (moved .md files to md/ folder)
```

## Step 2: Commit Your Changes

```bash
git commit -m "Prepare for migration: remove hardcoded localhost/IP references, add migration checklist"
```

## Step 3: Set Up GitHub Repository

### Option A: If you already have a GitHub repo

If you already created a repository on GitHub:

```bash
# Add your remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/moving_labels_qr.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/moving_labels_qr.git
```

### Option B: Create a new GitHub repository

1. Go to https://github.com/new
2. Repository name: `moving_labels_qr`
3. Choose **Private** (recommended for your data)
4. **Don't** initialize with README, .gitignore, or license
5. Click "Create repository"
6. Then run the commands GitHub shows you (or use the commands below)

```bash
# Add the remote (replace with your actual repo URL from GitHub)
git remote add origin https://github.com/YOUR_USERNAME/moving_labels_qr.git

# Push your code
git branch -M main
git push -u origin main
```

## Step 4: Verify Push

After pushing, verify on GitHub that:
- All files are present
- No sensitive data is committed (check that `.env` is in `.gitignore`)
- `data/` directory is ignored (it should be - it's in `.gitignore`)

## Step 5: On Your Server - Clone the Repository

SSH into your server:

```bash
ssh user@your-server-ip
```

Then clone the repository:

```bash
cd /path/to/where/you/want/the/app
git clone https://github.com/YOUR_USERNAME/moving_labels_qr.git
cd moving_labels_qr
```

## Step 6: Transfer Your Data Directory

Your `data/` directory is **NOT** in git (it's in `.gitignore`), so you need to transfer it separately.

### Option A: Using SCP from your local machine

```bash
# From your LOCAL machine (not on server)
cd /Users/georgebrown/Projects/moving_labels_qr

# Create a backup first
npm run backup

# Transfer the data directory
scp -r data/ user@your-server-ip:/path/to/moving_labels_qr/
```

### Option B: Using tar/compression (for large data)

```bash
# On your LOCAL machine
cd /Users/georgebrown/Projects/moving_labels_qr
tar -czf data-backup.tar.gz data/

# Transfer the tarball
scp data-backup.tar.gz user@your-server-ip:/path/to/moving_labels_qr/

# Then on the server, extract it:
# ssh user@your-server-ip
# cd /path/to/moving_labels_qr
# tar -xzf data-backup.tar.gz
```

## Step 7: Install Dependencies on Server

```bash
# On your server
cd /path/to/moving_labels_qr
npm install
```

This will:
- Install all npm packages
- Download Playwright Chromium browser (may take a few minutes)

## Step 8: Set Up Environment Variables on Server

```bash
# On your server
cd /path/to/moving_labels_qr
nano .env
```

Add these (replace with your actual values):

```env
PORT=3000
QR_BASE_URL=http://YOUR_SERVER_IP:3000
GROUP_PASSWORD=your-secure-password-here
```

**Important**: Replace `YOUR_SERVER_IP` with your actual server IP or domain name.

## Step 9: Verify Data on Server

```bash
# On your server
ls -la data/
```

You should see:
- `moving-labels.db` (your database)
- `images/` directory (with your box images)
- `profiles.json` (your profiles)

## Step 10: Test the Application

```bash
# On your server
npm start
```

You should see output confirming everything is working. Test by accessing:
`http://YOUR_SERVER_IP:3000`

## Step 11: Set Up Process Manager

Use PM2 to keep the app running:

```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start server.js --name moving-box-labels

# Save PM2 config
pm2 save

# Set up auto-start on boot
pm2 startup
# Follow the instructions it prints
```

## Future Updates

When you make changes locally:

```bash
# On your LOCAL machine
git add .
git commit -m "Description of changes"
git push

# On your SERVER
cd /path/to/moving_labels_qr
git pull
npm install  # Only if package.json changed
pm2 restart moving-box-labels
```

## Troubleshooting

### "Permission denied" when cloning
- Make sure you have SSH keys set up, or use HTTPS with a personal access token

### Data files not working on server
- Check file permissions: `chmod -R 755 data/`
- Verify database file exists: `ls -la data/moving-labels.db`
- Check images directory: `ls -la data/images/`

### Can't push to GitHub
- Make sure you're authenticated (SSH keys or personal access token)
- Verify remote URL: `git remote -v`
