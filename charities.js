# Golf Charity Subscription Platform

A subscription-driven web application combining golf performance tracking, charity fundraising, and a monthly draw-based reward engine.

Built for **Digital Heroes** Full-Stack Development Trainee Selection Process.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js + Express (API layer) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Payments | Stripe |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

---

## Project Structure

```
golf-platform/
├── frontend/          # Next.js app
├── backend/           # Express API
├── supabase/          # DB migrations & schema
└── README.md
```

---

## Getting Started

### 1. Clone & Install

```bash
# Install frontend deps
cd frontend && npm install

# Install backend deps
cd ../backend && npm install
```

### 2. Environment Variables

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Backend** — create `backend/.env`:
```env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
JWT_SECRET=your_jwt_secret
```

### 3. Database Setup

```bash
# Apply migrations in Supabase SQL editor (in order):
supabase/migrations/001_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_charities.sql
```

### 4. Run Locally

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@golfcharity.com | Admin@123! |
| User | testuser@example.com | Test@123! |

---

## Deployment

### Frontend → Vercel
1. Create a **new** Vercel account
2. Import `frontend/` directory
3. Set environment variables in Vercel dashboard
4. Deploy

### Backend → Railway
1. Create Railway account
2. Deploy from `backend/` directory
3. Set environment variables

### Database → Supabase
1. Create a **new** Supabase project
2. Run SQL migrations in order
3. Copy URL + keys to env files
