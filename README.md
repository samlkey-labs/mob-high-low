# MobHighLow - Docker Setup

![Landing Screenshot](./mdScreenshot.png)
![Game Screenshot](./gameScreenshot.png)

A Vite + React higher/lower game for OSRS monster combat levels, hosted on GitHub Pages. Monster data is scraped from the OSRS wiki ahead of time into a static dataset, so there is no backend. The frontend runs in a Docker container with hot reload enabled.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Build and start the container:**
   ```bash
   docker-compose up --build
   ```

2. **Open the game:** http://localhost:5173/MobHighLow/

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

## Development with Hot Reload

The frontend uses Vite's built-in hot module replacement (HMR). Edit files in `FRONTEND/` and changes reload automatically, with no need to restart the container.

## Container Management

### View logs
```bash
docker-compose logs frontend
```

### Rebuild containers
```bash
docker-compose up --build
```

### Stop and remove containers
```bash
docker-compose down
```

### Run in detached mode
```bash
docker-compose up -d
```

## Project Structure

```
MobHighLow/
├── FRONTEND/          # Vite + React app
│   ├── src/
│   ├── public/data/mobs.json  # Generated mob dataset (committed)
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── SCRAPER/           # Builds mobs.json from the OSRS wiki
├── docker-compose.yml # Local dev container
└── README.md
```

## Mob Dataset

The game reads its monsters from `FRONTEND/public/data/mobs.json`, a static file served alongside the frontend. `SCRAPER/` generates it from the OSRS wiki's structured `infobox_monster` data:

```bash
cd SCRAPER
npm install
npm test
npm start
```

Colours are cached from the previous dataset, so only new images are downloaded. The file is left untouched when nothing has changed.

### Workflows

- `.github/workflows/scrape.yml` runs weekly (or manually from the Actions tab), scrapes the wiki, and opens a PR if the dataset changed.
- `.github/workflows/pages.yml` builds and deploys the frontend to GitHub Pages on pushes to `master` that touch `FRONTEND/`. It never scrapes.

## Troubleshooting

### Port conflicts
If port 5173 is already in use, modify the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5174:5173"  # Map host port 5174 to container port 5173
```

### Permission issues
On Linux/macOS, you might need to run Docker commands with `sudo` or add your user to the docker group.

### Container not starting
Check the logs for specific error messages:
```bash
docker-compose logs <service-name>
``` 