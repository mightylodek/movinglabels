# Moving Box QR Labels App

A server-side web application for creating and managing moving box QR code labels.

## Features

- Create box labels with photos
- Generate QR codes that link to box details
- Print labels on Avery 3" × 3¾" sheets
- Server-side storage with SQLite
- Docker deployment ready

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript
- **Containerization**: Docker

## Quick Start

### Local Testing (Before Deployment)

```bash
# Install dependencies
npm install

# Start server
npm start

# Open browser
# Go to: http://localhost:3000
```

See [QUICK_START.md](QUICK_START.md) for detailed testing instructions.

### Using Docker Compose (For Deployment)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The app will be available at `http://localhost:3000`

## API Endpoints

- `GET /api/profiles` - Get all profiles
- `POST /api/profiles` - Create a profile
- `GET /api/boxes` - Get all boxes
- `GET /api/boxes/:boxId` - Get single box details
- `POST /api/boxes` - Create a new box (requires multipart/form-data with photo)
- `GET /api/images/:filename` - Serve uploaded images
- `GET /box/:boxId` - Box detail page (for QR code scanning)

## Deployment on Unraid

1. Copy the entire project folder to your Unraid server
2. Install Docker and Docker Compose on Unraid
3. Navigate to the project directory
4. Run: `docker-compose up -d`
5. Access the app at `http://your-unraid-ip:3000`

## Data Storage

- Database: `data/boxes.db` (SQLite)
- Images: `data/uploads/` directory
- Data persists in Docker volumes

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_PATH` - Database file path (default: ./data/boxes.db)
- `UPLOAD_DIR` - Upload directory (default: ./data/uploads)

## QR Code Format

QR codes encode URLs like: `http://your-server/api/boxes/BOX-000001`

When scanned, the URL serves the box detail page with full information and image.
