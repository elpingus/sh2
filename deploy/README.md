Production deployment target: `steamhoursnet.xyz`

Assumption:
- VDS OS: Ubuntu 22.04/24.04
- Frontend served by Nginx
- Backend runs on `127.0.0.1:8787`
- Public API path: `https://steamhoursnet.xyz/api`

Required DNS:
- `A @ -> your VDS IP`
- `A www -> your VDS IP`

Recommended VDS packages:
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

App layout on server:
```bash
sudo mkdir -p /var/www/steamhoursnet.xyz/current
sudo chown -R $USER:$USER /var/www/steamhoursnet.xyz
```

Upload project to:
- `/var/www/steamhoursnet.xyz/current/app`
- `/var/www/steamhoursnet.xyz/current/api`

Frontend env:
File: `/var/www/steamhoursnet.xyz/current/app/.env.production`
```env
VITE_API_URL=https://steamhoursnet.xyz/api
```

Backend env:
File: `/var/www/steamhoursnet.xyz/current/api/.env`
```env
PORT=8787
FRONTEND_URL=https://steamhoursnet.xyz
JWT_SECRET=replace_me
SESSION_SECRET=replace_me
STEAM_CREDENTIAL_SECRET=replace_me
STEAM_REALM=https://steamhoursnet.xyz/api/
STEAM_RETURN_URL=https://steamhoursnet.xyz/api/auth/steam/return
STEAM_WEB_API_KEY=
GOOGLE_CLIENT_ID=replace_me
GOOGLE_CLIENT_SECRET=replace_me
GOOGLE_REDIRECT_URI=https://steamhoursnet.xyz/api/auth/google/callback
```

Build and start:
```bash
cd /var/www/steamhoursnet.xyz/current/app
npm install
npm run build

cd /var/www/steamhoursnet.xyz/current/api
npm install
pm2 start /var/www/steamhoursnet.xyz/current/deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

Nginx:
```bash
sudo cp /var/www/steamhoursnet.xyz/current/deploy/nginx/steamhoursnet.xyz.conf /etc/nginx/sites-available/steamhoursnet.xyz
sudo ln -s /etc/nginx/sites-available/steamhoursnet.xyz /etc/nginx/sites-enabled/steamhoursnet.xyz
sudo nginx -t
sudo systemctl reload nginx
```

SSL:
```bash
sudo certbot --nginx -d steamhoursnet.xyz -d www.steamhoursnet.xyz
```

Google OAuth console:
- Authorized JavaScript origin: `https://steamhoursnet.xyz`
- Authorized redirect URI: `https://steamhoursnet.xyz/api/auth/google/callback`

Smoke test:
- `https://steamhoursnet.xyz`
- `https://steamhoursnet.xyz/api/health`
- login
- dashboard
- websocket status updates
