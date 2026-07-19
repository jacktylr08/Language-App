# Deployment Guide - Spanish Learning App

Choose your deployment method below. **Railway** is recommended for simplicity (free tier available).

---

## Option 1: Railway (Recommended - Easiest)

Railway hosts everything: frontend, backend, database, Redis, all in one dashboard.

### Setup (5 minutes)

1. **Create Railway account**: https://railway.app (free tier)

2. **Connect GitHub**:
   - In Railway: New Project → GitHub Repo
   - Select your Language-App repo
   - Authorize Railway to access it

3. **Create Services**:
   ```
   New Service → PostgreSQL (database)
   New Service → Redis (cache)
   New Service → GitHub (backend)
   New Service → GitHub (frontend)
   ```

4. **Configure Backend Service**:
   - Source: GitHub repo, `backend` directory
   - Build: npm install && npm run build
   - Start: npm start
   - Port: 3001
   - Environment variables (see `.env.production.example`)

5. **Configure Frontend Service**:
   - Source: GitHub repo, `frontend` directory
   - Build: npm install && npm run build
   - Start: npm start
   - Port: 3000
   - Environment variables:
     ```
     NEXT_PUBLIC_API_URL=https://backend-service-url/api/v1
     ```

6. **Deploy**:
   - Push to main branch
   - Railway auto-deploys

### Cost
- **Free tier**: 500 hours/month (split across services)
- **Paid**: $5/service/month after free tier

---

## Option 2: Vercel + Railway (Recommended Alternative)

Frontend on Vercel (free tier), backend on Railway.

### Setup (10 minutes)

1. **Deploy Frontend to Vercel**:
   ```bash
   cd frontend
   npm install -g vercel
   vercel deploy
   ```
   - Link to GitHub repo
   - Set `NEXT_PUBLIC_API_URL` to your Railway backend URL

2. **Deploy Backend to Railway** (follow Option 1 above)

3. **Connect them**:
   - Vercel env var: `NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app/api/v1`

### Cost
- **Frontend**: Free (Vercel has generous free tier)
- **Backend**: ~$5-10/month (Railway)

---

## Option 3: DigitalOcean App Platform

All-in-one like Railway, but more control.

### Setup (15 minutes)

1. **Create DigitalOcean account**: https://digitalocean.com (~$5/month)

2. **Create App**:
   ```
   App Platform → GitHub Repo
   Choose backend directory → PostgreSQL + Redis
   ```

3. **Configure Services**:
   ```yaml
   services:
     - name: backend
       source: github
       github: your-repo
       build_command: cd backend && npm install && npm run build
       run_command: cd backend && npm start
       http_port: 3001
       
     - name: frontend
       source: github
       github: your-repo
       build_command: cd frontend && npm install && npm run build
       run_command: cd frontend && npm start
       http_port: 3000
       
   databases:
     - name: db
       engine: PG
     - name: cache
       engine: REDIS
   ```

4. **Deploy**: Push to GitHub, DigitalOcean auto-deploys

### Cost
- **Starter**: ~$12/month (includes 1GB RAM database + Redis)

---

## Option 4: Self-Hosted (AWS EC2 / Linode)

Most control, requires DevOps knowledge.

### Setup (30+ minutes)

1. **Launch VM**:
   - AWS EC2 (t3.small, ~$10/month)
   - OR Linode (Nanode, ~$5/month)
   - Ubuntu 22.04 LTS

2. **Install dependencies**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nodejs npm postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx
   ```

3. **Clone repo**:
   ```bash
   git clone https://github.com/your-repo/Language-App.git
   cd Language-App
   ```

4. **Setup database**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE language_app;
   CREATE USER app_user WITH PASSWORD 'secure_password';
   ALTER ROLE app_user SET client_encoding TO 'utf8';
   GRANT ALL PRIVILEGES ON DATABASE language_app TO app_user;
   \q
   ```

5. **Build backend**:
   ```bash
   cd backend
   cp .env.production.example .env.production
   # Edit .env.production with actual values
   npm install
   npm run db:migrate
   npm run build
   ```

6. **Run backend** (with PM2):
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "api"
   pm2 startup
   pm2 save
   ```

7. **Build frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```

8. **Setup Nginx** (reverse proxy):
   ```nginx
   # /etc/nginx/sites-available/language-app
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Backend API
       location /api/v1 {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

9. **Enable HTTPS** (free SSL):
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

10. **Start frontend** (with PM2):
    ```bash
    cd frontend
    pm2 start "npm start" --name "web"
    pm2 save
    ```

### Cost
- **Linode Nanode**: ~$5/month
- **AWS EC2 t3.small**: ~$10/month
- **Domain**: $10-15/year

---

## Database Setup (All Platforms)

### Run migrations:
```bash
# In backend directory after deployment
DATABASE_URL=your-connection-string npm run db:migrate

# Or manually:
psql your-connection-string -f DATABASE_SCHEMA.sql
```

### Seed initial data:
```bash
npm run db:seed
```

---

## Frontend Mobile Setup

The app is now a **Progressive Web App (PWA)** with:
- ✅ Offline support (cached pages)
- ✅ Install as app on mobile home screen
- ✅ Service worker for background sync
- ✅ Responsive design

### On Mobile:
1. Visit `https://your-domain.com` on iPhone/Android
2. **iOS**: Tap Share → Add to Home Screen
3. **Android**: Tap ⋮ → Install app

### What Works Offline:
- Login/register pages cached
- Already-loaded lessons & vocabulary
- Offline page if needed

### What Requires Internet:
- Fetching new content
- Submitting reviews
- Streaming audio

---

## Monitoring & Logs

### Railway:
- Dashboard shows logs in real-time
- Metrics tab shows CPU, memory, network

### Vercel:
- Go to Project Settings → Logs
- Deployments show build logs

### Self-hosted:
```bash
# Backend logs
pm2 logs api

# Database logs
sudo tail -f /var/log/postgresql/postgresql.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

---

## Custom Domain Setup

### Point domain to your deployment:

**Railway/Vercel**:
- Get your deployment URL from dashboard
- Go to domain registrar (GoDaddy, Namecheap, etc.)
- Add CNAME record:
  ```
  CNAME  @  your-railway-domain.railway.app
  ```

**Self-hosted**:
- Point domain to your server's IP:
  ```
  A  @  your.server.ip.address
  ```

---

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `REDIS_URL` - Redis connection string
- [ ] `JWT_SECRET` - Random 32+ character string
- [ ] `S3_ACCESS_KEY` & `S3_SECRET_KEY` - AWS S3 or compatible
- [ ] `NEXT_PUBLIC_API_URL` - Backend API URL (frontend)
- [ ] `NODE_ENV=production`

---

## Testing Production Deployment

After deployment:

1. **Login page**: https://your-domain.com/login
2. **Register**: Create test account
3. **Onboarding**: Complete 4-step flow
4. **Lessons**: Load a lesson (audio should stream)
5. **Practice**: Submit a review (should update SR state)
6. **Check logs**: Ensure no errors

---

## Troubleshooting

### Audio not playing
- Check S3 bucket permissions
- Ensure audio files are uploaded
- Check CORS headers on S3

### Database connection error
- Verify `DATABASE_URL` format
- Check database user permissions
- Ensure database is running

### Frontend can't reach API
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify backend is running
- Check CORS headers in Express (`cors` middleware should be enabled)

### Slow performance
- Check database query logs
- Monitor Redis cache hit rate
- Consider database indexes

---

## Scaling (Future)

When you get many users:

1. **Database**: Upgrade to managed service (AWS RDS, Neon)
2. **Redis**: Use Redis Cloud (auto-scaling)
3. **Frontend**: Already on CDN (Vercel/Railway)
4. **Backend**: Add load balancer, horizontal scaling
5. **Storage**: Use S3 or Cloudflare R2 (cheaper than S3)

---

## Next Steps

1. **Choose deployment option** (Railway recommended)
2. **Set up database** (run migrations)
3. **Deploy frontend & backend**
4. **Test on phone** (install PWA)
5. **Add your first lessons** (seed content)
6. **Invite beta users**

Questions? Check logs in your deployment dashboard!
