# Deployment Guide

This guide will help you deploy the Moving Box QR Labels app to a server with Node.js and npm.

## Prerequisites

- Node.js (version 20 LTS or higher - REQUIRED)
- npm (comes with Node.js)
- Git (to clone from GitHub)
- Access to your server via SSH

**Important**: Use Node.js 20 LTS. Do NOT use Node 24. Verify with:
```bash
node -v  # Should show v20.x.x
```

## Deployment Steps

### 1. Clone the Repository

On your server, clone the repository to your desired location:

```bash
cd /path/to/your/apps
git clone https://github.com/YOUR_USERNAME/moving_labels_qr.git
cd moving_labels_qr
```

### 2. Install Dependencies

```bash
npm install
```

This will install Express, Playwright, and other required packages. Playwright will automatically download Chromium browser binaries during installation (via postinstall script).

### 3. Create Data Directory

The app will create this automatically, but you can create it manually:

```bash
mkdir -p data
```

### 4. Set Environment Variables

Create a `.env` file in the project root (optional but recommended):

```bash
nano .env
```

Add the following variables:

```env
# Port the server will listen on (default: 3000)
PORT=3000

# Base URL for QR codes - this is critical!
# Use your server's IP address or domain name
# Examples:
# QR_BASE_URL=http://192.168.1.100:3000
# QR_BASE_URL=http://your-domain.com
# QR_BASE_URL=http://your-domain.com:3000
QR_BASE_URL=http://YOUR_SERVER_IP:3000

# Optional: Custom data directory (default: ./data)
# DATA_DIR=./data
```

**Important**: Replace `YOUR_SERVER_IP` with your actual server IP address or domain name. This is what will be encoded in QR codes, so it needs to be accessible from your phone/other devices.

### 5. Start the Application

#### Option A: Direct Start (for testing)

```bash
npm start
```

#### Option B: Using PM2 (Recommended for production)

PM2 is a process manager that will keep your app running and restart it if it crashes.

First, install PM2 globally:

```bash
npm install -g pm2
```

Then start your app with PM2:

```bash
pm2 start server.js --name moving-box-labels
```

Save PM2 configuration:

```bash
pm2 save
pm2 startup
```

PM2 commands:
- `pm2 list` - View running processes
- `pm2 logs moving-box-labels` - View logs
- `pm2 restart moving-box-labels` - Restart the app
- `pm2 stop moving-box-labels` - Stop the app
- `pm2 delete moving-box-labels` - Remove from PM2

#### Option C: Using systemd (Alternative to PM2)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/moving-box-labels.service
```

Add the following (adjust paths as needed):

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
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable moving-box-labels
sudo systemctl start moving-box-labels
```

Check status:

```bash
sudo systemctl status moving-box-labels
```

### 6. Configure Firewall (if needed)

If you have a firewall running, allow traffic on your chosen port:

```bash
# For UFW (Ubuntu)
sudo ufw allow 3000/tcp

# For firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 7. Access the Application

Open your browser and navigate to:

```
http://YOUR_SERVER_IP:3000
```

Or if you're using a domain:

```
http://your-domain.com:3000
```

## Important Notes

### QR_BASE_URL Configuration

The `QR_BASE_URL` environment variable is critical. It determines what URL is encoded in the QR codes. 

- If accessing via IP: `http://192.168.1.100:3000`
- If accessing via domain: `http://your-domain.com` (or `http://your-domain.com:3000` if not using port 80)
- Make sure this URL is accessible from the devices that will scan the QR codes

### Data Migration

If you're migrating from a local installation:

1. Copy your `data/` directory from your local machine to the server:
   ```bash
   scp -r /local/path/data/ user@server:/path/to/moving_labels_qr/
   ```

2. Or manually copy the files:
   - `data/profiles.json`
   - `data/boxes.json`

### Updating the Application

When you update the code on GitHub:

```bash
cd /path/to/moving_labels_qr
git pull origin main
npm install  # Only if package.json changed
pm2 restart moving-box-labels  # Or restart your systemd service
```

### Using a Reverse Proxy (Optional)

If you want to access the app on port 80/443 without specifying a port, set up nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then set `QR_BASE_URL=http://your-domain.com` (without port number).

## Troubleshooting

### App won't start
- Check Node.js version: `node --version` (needs 14+)
- Check if port is already in use: `netstat -tulpn | grep 3000`
- Check logs: `pm2 logs` or `journalctl -u moving-box-labels`

### QR codes don't work
- Verify `QR_BASE_URL` matches your actual server URL
- Ensure the URL is accessible from your network
- Check firewall settings

### Data not persisting
- Verify `data/` directory exists and is writable: `ls -la data/`
- Check file permissions: `chmod 755 data`

## Security Considerations

- The app currently allows CORS from any origin (`*`) - consider restricting this in production
- Consider adding authentication if deploying to a public-facing server
- Ensure your firewall is properly configured
- Keep dependencies updated: `npm audit` and `npm update`
