# 🎬 Acasting Social Publisher

App Next.js per estrarre annunci da **Acasting.se**, generare immagini con overlay brandizzato e pubblicare su **LinkedIn, Facebook, Instagram e TikTok**.

---

## ✨ Funzionalità

- 📥 **Fetch automatico** degli annunci da Acasting.se
- 🎨 **4 stili grafici** di overlay (Cinematica, Viola Acasting, Noir, Calda)
- 👁 **Anteprima immagine** prima di pubblicare
- ✅ **Approva o Rigenera** con un click
- 📲 **Pubblicazione multi-piattaforma**: Facebook, Instagram, LinkedIn, TikTok
- 🧠 **Database locale** (SQLite) per tracciare cosa è già stato pubblicato
- 📜 **Storico pubblicazioni** con immagini

---

## 🗂 Struttura del progetto

```
acasting-social/
├── app/
│   ├── api/
│   │   ├── jobs/route.ts         # Fetch annunci Acasting
│   │   ├── generate/route.ts     # Genera immagine con Cloudinary
│   │   ├── publish/route.ts      # Pubblica sui social
│   │   └── history/route.ts      # Storico pubblicazioni
│   ├── page.tsx                  # Dashboard principale
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── JobCard.tsx               # Carta singolo annuncio
│   ├── ImageReviewModal.tsx      # Modal approvazione immagine
│   └── HistoryPanel.tsx          # Pannello storico
├── lib/
│   ├── types.ts                  # TypeScript types
│   ├── db.ts                     # Prisma client
│   ├── acasting.ts               # API Acasting.se
│   ├── cloudinary.ts             # Generazione immagini
│   ├── caption.ts                # Generazione caption
│   └── social/
│       ├── facebook.ts
│       ├── instagram.ts
│       ├── linkedin.ts
│       └── tiktok.ts
└── prisma/schema.prisma
```

---

## 🚀 Installazione locale

### 1. Prerequisiti

- **Node.js** v18 o superiore → [nodejs.org](https://nodejs.org)
- **npm** o **pnpm**
- Account **Cloudinary** (gratuito) → [cloudinary.com](https://cloudinary.com)

### 2. Clona / Crea il progetto

```bash
git clone <repo-url> acasting-social
cd acasting-social
```

### 3. Installa le dipendenze

```bash
npm install
```

### 4. Configura le variabili d'ambiente

```bash
cp .env.example .env.local
```

Poi apri `.env.local` e compila i valori (vedi sezione **Configurazione API** qui sotto).

### 5. Inizializza il database

```bash
npm run db:generate   # genera il Prisma client
npm run db:push       # crea il file SQLite
```

### 6. Avvia in sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

---

## 🔑 Configurazione API

### Cloudinary (OBBLIGATORIO per le immagini)

1. Registrati su [cloudinary.com](https://cloudinary.com) (piano gratuito sufficiente)
2. Vai su **Dashboard** → copia `Cloud Name`, `API Key`, `API Secret`
3. Aggiungi al `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=il_tuo_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123XYZ...
```

---

### Facebook & Instagram (Meta Graph API)

> Richiede una **Pagina Facebook** e un **Account Instagram Business** collegato.

#### Step 1 — Crea un'app Meta

1. Vai su [developers.facebook.com](https://developers.facebook.com)
2. **My Apps** → **Create App** → tipo **Business**
3. Aggiungi i prodotti: **Facebook Login** + **Instagram Graph API**

#### Step 2 — Genera il Page Access Token

1. Vai su [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Seleziona la tua app
3. Permissions da aggiungere:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
4. Clicca **Generate Access Token** → autorizza
5. Converti in **token di lunga durata**:

```bash
curl "https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN"
```

#### Step 3 — Trova gli ID

```bash
# Facebook Page ID
curl "https://graph.facebook.com/v20.0/me/accounts?access_token=TOKEN"

# Instagram Business ID
curl "https://graph.facebook.com/v20.0/PAGE_ID?fields=instagram_business_account&access_token=TOKEN"
```

```env
META_ACCESS_TOKEN=EAABsbCS...
FACEBOOK_PAGE_ID=123456789012345
INSTAGRAM_BUSINESS_ID=987654321098765
```

---

### LinkedIn

> Richiede una **Company Page** LinkedIn.

#### Step 1 — Crea un'app LinkedIn

1. Vai su [developer.linkedin.com](https://www.linkedin.com/developers/)
2. **Create App** → collega la tua Company Page
3. In **Products**, aggiungi: **Share on LinkedIn** + **Marketing Developer Platform**
4. Vai su **Auth** → copia `Client ID` e `Client Secret`

#### Step 2 — Genera OAuth Token

Usa la [LinkedIn OAuth 2.0 tool](https://www.linkedin.com/developers/tools/oauth):

Scopes necessari:
- `w_member_social`
- `r_organization_social`
- `w_organization_social`
- `rw_organization_admin`

#### Step 3 — Trova l'Organization ID

```bash
curl -X GET "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee" \
  -H "Authorization: Bearer TOKEN"
```

```env
LINKEDIN_ACCESS_TOKEN=AQX...
LINKEDIN_ORGANIZATION_ID=12345678
```

---

### TikTok

> Richiede approvazione speciale per **Content Posting API**.

1. Vai su [developers.tiktok.com](https://developers.tiktok.com)
2. Crea un'app e richiedi accesso a **Content Posting API**
3. Implementa il flusso OAuth e ottieni `access_token` e `open_id`

```env
TIKTOK_ACCESS_TOKEN=att_...
TIKTOK_OPEN_ID=abc123...
```

> **Nota**: TikTok richiede verifica business per la pubblicazione automatica. Per ora puoi testare gli altri social e aggiungere TikTok in seguito.

---

## 📦 Build per produzione

```bash
npm run build
npm start
```

---

## ☁️ Deploy su Vercel (raccomandato)

### 1. Installa Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Aggiungi le variabili d'ambiente

Nel Vercel Dashboard → **Settings** → **Environment Variables**, aggiungi tutte le variabili dal `.env.local`.

### 4. Database in produzione

Per Vercel, usa un DB hosted invece di SQLite:

**Opzione A — Vercel Postgres (raccomandato)**:
```bash
vercel storage create  # crea un Postgres DB
```
Poi cambia `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

**Opzione B — Railway / Supabase**:
Stessa modifica al `schema.prisma`, copia la connection string.

### 5. Aggiorna database in produzione

```bash
npm run db:push
# oppure
npx prisma migrate deploy
```

---

## 🎨 Come funziona il flusso

```
1. Clicca "Aggiorna"
      ↓
2. App fetcha gli ultimi 50 annunci da acasting.se
      ↓
3. Confronta con il DB locale (niente duplicati)
      ↓
4. Vedi la griglia con gli annunci
      ↓
5. Scegli uno stile → "Genera Immagine"
      ↓
6. Cloudinary crea l'immagine con overlay
      ↓
7. Vedi l'anteprima → Approva o Rigenera
      ↓
8. Se Approva → scegli le piattaforme
      ↓
9. Pubblica → vedi i risultati per ogni piattaforma
      ↓
10. L'annuncio viene marcato come "Pubblicato"
```

---

## 🖼 Stili immagine disponibili

| Stile | Descrizione | Brightness |
|-------|-------------|------------|
| Cinematica | Overlay scuro classico | -80% |
| Viola Acasting | Tono brand viola | -60% |
| Noir | Contrasto massimo | -95% |
| Calda | Tonalità cinematica calda | -65% |

---

## 🛠 Script utili

```bash
npm run dev          # Avvia sviluppo (http://localhost:3000)
npm run build        # Build produzione
npm run db:studio    # Prisma Studio (GUI database)
npm run db:push      # Sincronizza schema DB
npm run lint         # ESLint
```

---

## ❓ Problemi comuni

**Errore Cloudinary "Invalid image URL"**
→ Assicurati che l'immagine di Acasting sia pubblicamente accessibile.

**Errore Facebook "OAuthException"**
→ Il token è scaduto. Rigenera un token di lunga durata (dura ~60 giorni).

**Errore Instagram "Media not ready"**
→ Normale, il sistema attende che Meta processi l'immagine (fino a 30 secondi).

**Database error su Vercel**
→ SQLite non funziona su Vercel (filesystem read-only). Usa Vercel Postgres.

---

## 📄 Licenza

MIT — Progetto interno Acasting
