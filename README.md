# FriendChats - A full-stack realtime messaging chat application

## Installation

# FriendChats – Full-Stack Realtime Messaging App

## 🛠 Installation Guide (Next.js + Node v20)

This guide will walk you through setting up the FriendChats project locally using **Next.js** and **Node.js v20**.

---

## ✅ Prerequisites

Make sure you have the following installed:

### 1. **Node.js v20**

Download from official site:
[https://nodejs.org/en/download](https://nodejs.org/en/download)

Check version:

```
node -v
```

It should display:

```
v20.x.x
```

### 2. **npm or yarn**

Check:

```
npm -v
```

or

```
yarn -v
```

### 3. **Git**

```
git --version
```

### 4. **Environment Keys**

Make sure you have created your `.env.local` file.
(See previous README for generating keys.)

## 📁 Step 2: Install Dependencies

Install using **npm**:

```
npm install
```

Or using **yarn**:

```
yarn install
```

---

## ⚙️ Step 3: Setup Environment Variables

Create a file:

```
.env.local
```

Paste the keys:

```
UPSTASH_REDIS_REST_URL="YOUR_REDIS_URL"
UPSTASH_REDIS_REST_TOKEN="YOUR_REDIS_TOKEN"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_SECRET"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET"
PUSHER_APP_ID="YOUR_PUSHER_APP_ID"
NEXT_PUBLIC_PUSHER_APP_KEY="YOUR_PUSHER_PUBLIC_KEY"
PUSHER_APP_SECRET="YOUR_PUSHER_SECRET"
```

---

## ▶️ Step 4: Run Development Server

```
npm run dev
```

or

```
yarn dev
```

App will run at:

```
http://localhost:3000
```

---

## 📦 Step 6: Build for Production

```
npm run build
npm start
```

---

## 🧰 Technologies Used

- **Next.js 14** (App Router)
- **TypeScript**
- **NextAuth (Google OAuth)**
- **Upstash Redis**
- **Pusher Channels**
- **Tailwind CSS**
- **React Server Components**

## Features

- Realtime messaging
- Adding friends and sending friend requests via email
- Performant database queries with Redis
- Responsive UI built with TailwindCSS
- Protection of sensitive routes
- Google authentication

- Built with TypeScript
- TailwindCSS
- Icons from Lucide

- Class merging with tailwind-merge
- Conditional classes with clsx
- Variants with class-variance-authority

# README: How to Generate All Required Keys

This guide explains how to generate all the keys used in your project, including Upstash Redis, Google OAuth, NextAuth secret, and Pusher keys.

---

## 1. **Generate Upstash Redis REST URL & Token**

### Steps:

1. Go to **[https://upstash.com](https://upstash.com)** and log in.
2. Create a new **Redis database**.
3. Open the database and go to the **REST API** tab.
4. Copy these two values:

   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 2. **Generate Google OAuth Client ID & Secret**

### Steps:

1. Open **Google Cloud Console** → [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project (or select existing).
3. Go to **APIs & Services → OAuth consent screen**.

   - Choose **External**.
   - Fill app info → Save.

4. Go to **Credentials → Create Credentials → OAuth Client ID**.
5. Choose **Web Application**.
6. Add the following authorized URIs:

   - **Authorized Redirect URI:**

     ```

     ```

[http://localhost:3000/api/auth/callback/google](http://localhost:3000/api/auth/callback/google)

```
7. After creation, copy:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

---

## 3. **Generate NEXTAUTH_SECRET**
### Steps:
Run this command in your terminal:
```

openssl rand -hex 32

```
Copy the output and set:
```

NEXTAUTH_SECRET=your_generated_secret

```

---

## 4. **Get NEXTAUTH_URL**
For local development:
```

NEXTAUTH_URL=[http://localhost:3000](http://localhost:3000)

```
For production (example):
```

NEXTAUTH_URL=[https://yourdomain.com](https://yourdomain.com)

```

---

## 5. **Generate Pusher Keys**
### Steps:
1. Go to **https://pusher.com**.
2. Create a new Channels app.
3. Go to **App Keys** section.
4. Copy:
   - `PUSHER_APP_ID`
   - `NEXT_PUBLIC_PUSHER_APP_KEY` (public key)
   - `PUSHER_APP_SECRET` (private key)

---

## 6. **Final env.local Example (Safe Template)**
```

UPSTASH_REDIS_REST_URL="YOUR_REDIS_URL"
UPSTASH_REDIS_REST_TOKEN="YOUR_REDIS_TOKEN"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_SECRET"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
NEXTAUTH_URL="[http://localhost:3000](http://localhost:3000)"
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET"
PUSHER_APP_ID="YOUR_PUSHER_APP_ID"
NEXT_PUBLIC_PUSHER_APP_KEY="YOUR_PUSHER_PUBLIC_KEY"
PUSHER_APP_SECRET="YOUR_PUSHER_SECRET"

```

---

If you want, I can also generate:
- A **bash script** to auto-generate the env file
- A **production README**
- A **.env.example** file

```
