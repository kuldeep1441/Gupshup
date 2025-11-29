## Gupshup – Realtime Group Chat App (Next.js 14 + TypeScript)

Gupshup is a full‑stack realtime chat application where **every conversation is a group**, even 1‑to‑1 DMs (Slack‑style).  
It includes **Google login, friend requests, direct messages, and multi‑user group chats** powered by **Next.js 14, Upstash Redis, and Pusher**.

---

## ✅ Features

- **Realtime messaging** with Pusher Channels  
- **Group chats** – each chat has a stable `chatId` and an array of `memberIds`  
- **Direct messages** implemented as groups of two users (Slack‑style)  
- **Friend requests** and adding friends by email  
- **Protected routes** with NextAuth (Google OAuth)  
- **Fast storage** on Upstash Redis  
- **Responsive UI** built with Tailwind CSS  

---

## 🧰 Tech Stack

- **Next.js 14** (App Router, React Server Components)  
- **TypeScript**  
- **NextAuth.js** (Google OAuth)  
- **Upstash Redis** (REST API)  
- **Pusher Channels** (realtime pub/sub)  
- **Tailwind CSS**  
- **Lucide Icons**  

Utilities:

- `tailwind-merge`  
- `clsx`  
- `class-variance-authority`  

---

## 🛠 Prerequisites

- **Node.js v20.x**  
- **npm** or **yarn**  
- **Git**  
- Accounts for:
  - **Upstash** (Redis)
  - **Google Cloud Console** (OAuth)
  - **Pusher Channels**

Check versions:

```bash
node -v
npm -v
```

---

## 📦 Installation

```bash
git clone <your-repo-url>
cd Gupshup
npm install        # or: yarn install
```

---


## 🔑 How to Generate All Required Keys

### 1. Upstash Redis REST URL & Token

1. Go to `https://upstash.com` and log in.  
2. Create a new **Redis database**.  
3. Open the database → **REST API** tab.  
4. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. Google OAuth Client ID & Secret

1. Open **Google Cloud Console** → `https://console.cloud.google.com/`.  
2. Create/select a project.  
3. Go to **APIs & Services → OAuth consent screen** → choose **External**, fill details, save.  
4. Go to **Credentials → Create Credentials → OAuth Client ID**.  
5. Choose **Web Application**.  
6. Add **Authorized redirect URI**:

```text
http://localhost:3000/api/auth/callback/google
```

7. Copy:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### 3. NEXTAUTH_SECRET

Generate a strong secret:

```bash
openssl rand -hex 32
```

Then:

```env
NEXTAUTH_SECRET="your_generated_secret"
```

### 4. NEXTAUTH_URL

Local:

```env
NEXTAUTH_URL="http://localhost:3000"
```

Production (example):

```env
NEXTAUTH_URL="https://yourdomain.com"
```

### 5. Pusher Keys

1. Go to `https://pusher.com`.  
2. Create a new **Channels** app.  
3. In **App Keys**, copy:
   - `PUSHER_APP_ID`
   - `NEXT_PUBLIC_PUSHER_APP_KEY` (public)
   - `PUSHER_APP_SECRET` (private)

Add them into `.env.local` as shown above.

---

## ▶️ Running the App (Development)

```bash
npm run dev        # or: yarn dev
```

App runs at:

```text
http://localhost:3000
```

---

## 🚀 Production Build

```bash
npm run build
npm start
```

---

## 🧪 NPM Scripts (Quick Reference)

```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run start    # Run production server
```

---

## 💡 Architecture Notes

- Every conversation is stored as a **Chat group** with:
  - `id` (the `chatId`)
  - `memberIds: string[]`
- Every message stores its **`chatId`**, which makes it easy to support:
  - 1‑to‑1 DMs
  - multi‑user groups
  - per‑chat / per‑user notifications.

If you want, you can extend this README with architecture diagrams, API docs, or deployment steps for platforms like Vercel.
