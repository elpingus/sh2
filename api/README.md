# SteamBoost API

## Run

```bash
npm install
npm run dev
```

Server runs on `http://localhost:8787` by default.

## Environment

Copy `.env.example` to `.env` and adjust values.

Important keys:
- `FRONTEND_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `STEAM_REALM`
- `STEAM_RETURN_URL`

## Default Admin

Seeded automatically on first run:
- Email: `admin@steamboost.pro`
- Password: `admin123`

Change this immediately in real usage.

## Core Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/steam`
- `POST /auth/steam/credentials`
- `GET /steam/status`
- `POST /steam/credentials`
- `POST /steam/connect/start`
- `POST /steam/connect/guard`
- `POST /steam/disconnect`
- `GET /games`
- `POST /games`
- `DELETE /games/:appId`
- `GET /settings`
- `PUT /settings`
- `GET /boost/status`
- `POST /boost/start`
- `POST /boost/pause`
- `POST /boost/stop`
- `GET /health`

## Live Status

WebSocket endpoint:
- `ws://localhost:8787/ws?token=<jwt>`

Message type for job state updates:
- `boost:status`

## Real Steam Bot

- Uses `steam-user` for real Steam login.
- Supports Steam Guard challenge flow (`/steam/connect/guard`).
- On boost start, bot sets persona and calls `gamesPlayed(...)` with selected App IDs.
