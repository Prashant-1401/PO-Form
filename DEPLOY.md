# Deployment to Render.com

## Quick Deploy (Web UI)

1. **Push code to GitHub/GitLab**
   ```bash
   cd /home/prashant/PO-Form
   git init
   git add .
   git commit -m "PO Form backend"
   ```
   Then push to your GitHub repo.

2. **Create new Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Settings:
     - Build Command: `npm install`
     - Start Command: `node server.js`
   - Click "Deploy Web Service"

## Or Deploy via CLI

```bash
npm install -g render-cli
render deployments create
```

## Environment Variables

Set these in Render dashboard:
- `PORT` = 10000 (auto-set by Render)
- `NODE_ENV` = production

## Data Persistence

The database is stored at `/var/data/po.db` on Render's ephemeral filesystem.
For persistent storage, you may want to enable "Persistent Disk" in Render settings.

---

## After Deploy

Your app will be available at: `https://po-form-xxxxx.onrender.com`

Update the frontend API base if needed in `public/index.html`:
```javascript
const API_BASE = ''; // Uses same origin
```

## Common Issues

1. **Database not saving**: Add a Persistent Disk in Render settings
2. **WASM error**: Already fixed to use ASM version