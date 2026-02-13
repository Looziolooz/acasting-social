# 🎬 Acasting Social Publisher

Next.js app to fetch casting listings from **Acasting.se**, generate branded overlay images, and publish to **LinkedIn, Facebook, Instagram, and TikTok**.

> **Note:** All generated image text and social media captions are in **Swedish** (target audience). The dashboard UI is in English.

---

## ✨ Features

- 📥 **Auto-fetch** listings from Acasting.se
- 🎨 **4 image styles** (Cinematic, Acasting Purple, Noir, Warm)
- 👁 **Image preview** before publishing
- ✅ **Approve or Regenerate** with one click
- 📲 **Multi-platform publishing**: Facebook, Instagram, LinkedIn, TikTok
- 🗄️ **PostgreSQL database** (Vercel Postgres / Neon) for tracking
- 📜 **Publication history** with images

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **Cloudinary** account (free) → [cloudinary.com](https://cloudinary.com)
- **Vercel** account → [vercel.com](https://vercel.com)

### 1. Clone & Install

```bash
git clone <repo-url> acasting-social
cd acasting-social
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Fill in your values in `.env.local`. See **Security Guide** below.

### 3. Set Up Database

```bash
npx prisma db push
npx prisma generate
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔒 Security Guide — Avoiding Credential Leaks

### ⚠️ CRITICAL RULES

1. **NEVER put real credentials in `.env.example`** — only placeholders
2. **NEVER commit `.env`, `.env.local`, or any file with real secrets**
3. **Always verify `.gitignore`** includes all env files before pushing
4. **Use `npx vercel env pull`** to sync Vercel env vars locally

### Pre-commit Checklist

Before every `git push`, run:

```bash
# Check that no secrets are staged
git diff --cached --name-only | grep -E '\.env' && echo "⚠️  ENV FILE STAGED!" || echo "✅ Clean"

# Double-check .env.example has no real values
grep -E '(sk_|eyJ|postgres://[a-z0-9])' .env.example && echo "⚠️  REAL CREDENTIALS IN .env.example!" || echo "✅ Clean"
```

### Where to Store Secrets

| Environment | Where | How |
|-------------|-------|-----|
| **Local dev** | `.env.local` | Manual or `npx vercel env pull` |
| **Vercel Production** | Vercel Dashboard → Settings → Env Vars | Added via UI or CLI |
| **CI/CD** | Vercel handles automatically | Connected via Storage integration |

### Setting Up Vercel Postgres (Neon)

1. Go to Vercel Dashboard → your project → **Storage**
2. Click **Neon** → Create database
3. Set Custom Prefix to `POSTGRES` (creates `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`)
4. Click **Connect**
5. Pull env vars locally: `npx vercel env pull .env.local`
6. Push schema: `npx prisma db push`

---

## 🔑 API Configuration

### Cloudinary (Required)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Dashboard → copy Cloud Name, API Key, API Secret
3. Add to Vercel env vars and `.env.local`

### Facebook & Instagram (Meta Graph API)

1. Create app at [developers.facebook.com](https://developers.facebook.com)
2. Add products: Facebook Login + Instagram Graph API
3. Generate Page Access Token with permissions:
   - `pages_manage_posts`, `pages_read_engagement`
   - `instagram_basic`, `instagram_content_publish`
4. Convert to long-lived token (~60 days)
5. Find Page ID and Instagram Business ID via Graph API

### LinkedIn

1. Create app at [developer.linkedin.com](https://developer.linkedin.com)
2. Add products: Share on LinkedIn + Marketing Developer Platform
3. Generate OAuth token with scopes: `w_member_social`, `w_organization_social`
4. Find Organization ID via API

### TikTok

1. Create app at [developers.tiktok.com](https://developers.tiktok.com)
2. Request Content Posting API access (requires business verification)

---

## 📦 Deploy to Vercel

```bash
# Deploy
vercel

# Or link and deploy
vercel link
vercel deploy --prod
```

Environment variables are auto-populated from Vercel Storage connection and manual entries.

---

## 🛠 Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:studio    # Prisma Studio (database GUI)
npm run db:push      # Sync schema to database
npm run lint         # ESLint
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| Cloudinary "Invalid image URL" | Ensure the Acasting image is publicly accessible |
| Facebook "OAuthException" | Token expired — regenerate long-lived token |
| Instagram "Media not ready" | Normal — system waits up to 30s for processing |
| Database error on Vercel | Use Vercel Postgres, not SQLite |
| No listings showing on deploy | Check Vercel Logs tab for Acasting API errors |
| GitGuardian alert | Rotate ALL exposed credentials immediately |

---

## 📄 License

MIT — Internal Acasting Project
