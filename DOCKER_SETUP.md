# Docker Setup Guide

This guide will help you run the Moving Box QR Labels app using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

### 1. Clone and Navigate

```bash
git clone https://github.com/mightylodek/movinglabels.git
cd movinglabels
```

### 2. Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env
nano .env
```

Edit the `.env` file with your settings:

```env
PORT=3000
QR_BASE_URL=http://YOUR_SERVER_IP:3000
GROUP_PASSWORD=your-secure-password-here
```

**Important**: 
- Replace `YOUR_SERVER_IP` with your server's IP address or domain name
- Change `GROUP_PASSWORD` to something secure
- The `QR_BASE_URL` is what will be encoded in QR codes

### 3. Build and Start

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 4. Access the App

Open your browser and navigate to:
```
http://YOUR_SERVER_IP:3000
```

## Data Persistence

The `data/` directory is mounted as a volume, so your data persists even when you stop/restart the container:

- `data/moving-labels.db` - SQLite database
- `data/images/` - Box images
- `data/profiles.json` - User profiles

**Important**: Make sure the `data/` directory exists and has proper permissions:

```bash
mkdir -p data/images data/backups
chmod -R 755 data/
```

## Environment Variables

You can set these environment variables in `.env` or in `docker-compose.yml`:

- `PORT` - Server port (default: 3000)
- `DATA_DIR` - Data directory path (default: ./data)
- `QR_BASE_URL` - Base URL for QR codes (required for QR codes to work)
- `GROUP_PASSWORD` - Password for app authentication (default: changeme)

## Updating the App

When you pull new code from GitHub:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Common Commands

```bash
# Start the app
docker-compose up -d

# Stop the app
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f moving-box-labels

# Rebuild after code changes
docker-compose up -d --build

# Check container status
docker-compose ps

# Execute command in running container
docker-compose exec moving-box-labels sh
```

## Troubleshooting

### Container won't start

Check the logs:
```bash
docker-compose logs moving-box-labels
```

Common issues:
- Port 3000 already in use: Change `PORT` in `.env` or modify port mapping in `docker-compose.yml`
- Permission errors: Make sure `data/` directory has correct permissions
- Database errors: Check that SQLite files are accessible

### Can't access from other devices

- Make sure firewall allows port 3000
- Verify `QR_BASE_URL` matches your server's IP/domain
- Check Docker port mapping: `3000:3000` in docker-compose.yml

### Images don't load

- Verify `data/images/` directory exists and has files
- Check file permissions: `chmod -R 755 data/images/`
- Check container logs for errors

### QR codes don't work

- Verify `QR_BASE_URL` in `.env` is correct and accessible
- Make sure the URL matches how you're accessing the app
- Test the URL directly in a browser

## Backup

Your data is stored in the `data/` directory. To backup:

```bash
# While container is running
docker-compose exec moving-box-labels npm run backup

# Or backup the data directory directly
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

## Production Deployment

For production:

1. Set a strong `GROUP_PASSWORD` in `.env`
2. Use a proper domain name for `QR_BASE_URL`
3. Consider using a reverse proxy (nginx) for SSL/TLS
4. Set up regular backups of the `data/` directory
5. Monitor logs: `docker-compose logs -f`

## Docker Compose Override

You can create a `docker-compose.override.yml` for local development without affecting the main configuration.
