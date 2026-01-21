# Migration Checklist

Follow these steps to migrate your Moving Box QR Labels app to your server.

## Pre-Migration Checklist

- [ ] Server has Node.js 20+ installed (`node -v`)
- [ ] Server has npm installed (`npm -v`)
- [ ] Server has Git installed (if cloning from GitHub)
- [ ] You know your server's IP address or domain name
- [ ] You have SSH access to your server

## Step 1: Prepare Your Data for Transfer

Your current data directory contains:
- `data/moving-labels.db` - SQLite database (contains all boxes)
- `data/images/` - Image files for boxes
- `data/profiles.json` - User profiles
- `data/backups/` - Backup files (optional to transfer)

### Create a Backup First

```bash
cd /Users/georgebrown/Projects/moving_labels_qr
npm run backup
```

This creates a compressed backup in `data/backups/`.

## Step 2: Transfer Files to Server

### Option A: Using SCP (Recommended)

```bash
# Create a tarball of your data directory
cd /Users/georgebrown/Projects/moving_labels_qr
tar -czf migration-data.tar.gz data/

# Transfer to server
scp migration-data.tar.gz user@your-server-ip:/path/to/destination/

# Transfer the entire project (or clone from GitHub if it's pushed)
scp -r /Users/georgebrown/Projects/moving_labels_qr user@your-server-ip:/path/to/destination/
```

### Option B: Using Git (If you've pushed to GitHub)

```bash
# On server
cd /path/to/your/apps
git clone https://github.com/YOUR_USERNAME/moving_labels_qr.git
cd moving_labels_qr
```

Then transfer just the data directory:
```bash
# From your local machine
scp -r data/ user@your-server-ip:/path/to/moving_labels_qr/
```

### Option C: Manual File Transfer

If you have a shared folder or other method, transfer:
- The entire project folder, OR
- Just the `data/` directory

## Step 3: Set Up on Server

### SSH into your server

```bash
ssh user@your-server-ip
```

### Navigate to project directory

```bash
cd /path/to/moving_labels_qr
```

### If you transferred a tarball, extract it:

```bash
tar -xzf migration-data.tar.gz
```

## Step 4: Install Dependencies

```bash
npm install
```

This will:
- Install all npm packages
- Download Playwright Chromium browser (takes a few minutes)

## Step 5: Create Environment File

```bash
nano .env
```

Add these variables (replace with your actual values):

```env
# Port the server will listen on
PORT=3000

# Base URL for QR codes - CRITICAL!
# Use your server's IP address or domain name
# Examples:
# QR_BASE_URL=http://192.168.1.100:3000
# QR_BASE_URL=http://your-domain.com:3000
# QR_BASE_URL=https://your-domain.com
QR_BASE_URL=http://YOUR_SERVER_IP:3000

# Group password for authentication (change from default!)
GROUP_PASSWORD=your-secure-password-here

# Optional: Custom data directory (default: ./data)
# DATA_DIR=./data
```

**Important**: 
- Replace `YOUR_SERVER_IP` with your actual server IP or domain
- Change `GROUP_PASSWORD` to something secure
- Make sure `QR_BASE_URL` is accessible from the devices that will scan QR codes

## Step 6: Verify Data Files

```bash
ls -la data/
```

You should see:
- `moving-labels.db` (your database)
- `images/` directory (with your box images)
- `profiles.json` (your profiles)

## Step 7: Test the Application

### Start the server

```bash
npm start
```

You should see output like:
```
Server running on port 3000
QR Base URL: http://YOUR_SERVER_IP:3000
Data directory: ./data
Database: data/moving-labels.db
Images directory: data/images
Group password: ***SET***
Server accessible on all network interfaces (0.0.0.0:3000)
```

### Test from another device

Open a browser and go to: `http://YOUR_SERVER_IP:3000`

You should see the login screen. Log in with your group password and verify:
- [ ] Profiles are present
- [ ] Boxes are visible in the list
- [ ] Box images load correctly
- [ ] QR codes can be generated and scanned

## Step 8: Set Up Process Manager (Production)

### Option A: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start server.js --name moving-box-labels

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it prints

# Useful commands:
pm2 list              # View running processes
pm2 logs moving-box-labels  # View logs
pm2 restart moving-box-labels  # Restart
pm2 stop moving-box-labels     # Stop
```

### Option B: systemd

Create a service file:

```bash
sudo nano /etc/systemd/system/moving-box-labels.service
```

Add this content (adjust paths and user):

```ini
[Unit]
Description=Moving Box QR Labels App
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/moving_labels_qr
Environment="PORT=3000"
Environment="QR_BASE_URL=http://YOUR_SERVER_IP:3000"
Environment="GROUP_PASSWORD=your-secure-password"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable moving-box-labels
sudo systemctl start moving-box-labels
sudo systemctl status moving-box-labels
```

## Step 9: Configure Firewall (If Needed)

If your server has a firewall, allow port 3000:

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 3000/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Step 10: Verify Everything Works

- [ ] App starts successfully
- [ ] Can access from browser at `http://YOUR_SERVER_IP:3000`
- [ ] Login works with group password
- [ ] All profiles are visible
- [ ] All boxes are visible
- [ ] Box images load correctly
- [ ] Can create a new box
- [ ] Can print labels
- [ ] QR codes scan and work correctly
- [ ] Process manager keeps app running after reboot

## Troubleshooting

### Can't access from other devices
- Check firewall settings
- Verify server is listening on 0.0.0.0 (not just localhost)
- Check network connectivity

### Images don't load
- Verify `data/images/` directory exists and has correct permissions
- Check file paths in database match actual files

### QR codes don't work
- Verify `QR_BASE_URL` in `.env` matches your actual server URL
- Make sure the URL is accessible from devices that scan QR codes
- Check that `/box/:boxId` routes are working

### Database errors
- Verify SQLite file exists: `ls -la data/moving-labels.db`
- Check file permissions: `chmod 644 data/moving-labels.db`
- Verify database directory is writable: `chmod 755 data/`

## Post-Migration

Once everything is working:

1. **Update your local backup** - Keep a backup of your server's data directory
2. **Document your setup** - Note your server IP, passwords, etc.
3. **Set up regular backups** - Consider scheduling the backup script via cron
4. **Test regularly** - Verify QR codes still work from different locations

## Backup Strategy

To set up automatic backups on your server:

```bash
# Edit crontab
crontab -e

# Add this line to run backup daily at 2 AM
0 2 * * * cd /path/to/moving_labels_qr && npm run backup
```

## Need Help?

If you encounter issues:
1. Check server logs: `pm2 logs` or `journalctl -u moving-box-labels`
2. Verify environment variables are set correctly
3. Check file permissions on data directory
4. Review the main DEPLOYMENT.md guide
