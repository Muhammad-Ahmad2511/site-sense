# Site-Sense

> **Evidence-Based AI-Powered Website Auditing Platform** for SEO,
> Accessibility, Performance, Technical Health, and User Experience.

------------------------------------------------------------------------

# 🚀 Live Demo

  Service             URL
  ------------------- -----------------------------------------------
  Frontend (Vercel)   https://site-sense-three.vercel.app/
  Backend (Railway)   https://site-sense-production.up.railway.app/

Repository:

https://github.com/Muhammad-Ahmad2511/site-sense

------------------------------------------------------------------------

# ✨ Highlights

-   Evidence-based website auditing
-   Real browser crawling using Playwright
-   AI explanations grounded only in verified findings
-   SEO, Accessibility, Performance & Technical analysis
-   JSON export
-   PDF printing support
-   Responsive React frontend
-   Railway + Vercel deployment

------------------------------------------------------------------------

# 🧠 AI Philosophy

Site-Sense never asks AI to discover website problems.

Workflow:

Website → Playwright Crawl → Rule Engine → Verified Findings → OpenAI
Explanation

AI only explains validated evidence.

------------------------------------------------------------------------

# 🏗 Architecture

``` text
             User
               │
     React + Vite Frontend
               │
      /api requests (same origin)
               │
       Express Backend
      ┌────────┴────────┐
      │                 │
 Playwright         OpenAI
 Browser          (Optional)
      │
 Website Crawl
      │
 Evidence Collection
      │
 Rule Engine
      │
 Audit Report
```

------------------------------------------------------------------------

# 🛠 Technology Stack

## Frontend

-   React 19
-   Vite
-   TypeScript
-   Tailwind CSS
-   Framer Motion
-   GSAP
-   React Router

## Backend

-   Node.js
-   Express
-   Playwright
-   OpenAI SDK

## Deployment

-   Vercel
-   Railway
-   Docker

------------------------------------------------------------------------

# 📂 Project Structure

``` text
Site-Sense
├── FrontEnd/
├── BackEnd/
└── docs/
```

------------------------------------------------------------------------

# ⚙ Environment Variables

  Variable                     Purpose
  ---------------------------- -------------------------
  PORT                         Express port
  OPENAI_API_KEY               Enables AI explanations
  OPENAI_MODEL                 AI model
  MAX_CRAWL_PAGES              Crawl limit
  MAX_CRAWL_DURATION_MS        Crawl timeout
  CRAWL_CONCURRENCY            Parallel crawling
  ACCESSIBILITY_SAMPLE_PAGES   Accessibility sampling

------------------------------------------------------------------------

# ▶ Local Development

## Backend

``` bash
cd BackEnd
npm install
npm start
```

## Frontend

``` bash
cd FrontEnd
npm install
npm run dev
```

------------------------------------------------------------------------

# ☁ Deployment

## Backend

Railway

Root Directory:

``` text
BackEnd
```

## Frontend

Vercel

Root Directory:

``` text
FrontEnd
```

------------------------------------------------------------------------

# 🔐 Authentication

The project currently ships with a mock authentication flow.

The frontend already defines the contract for future backend
authentication APIs and can later switch to live authentication using:

``` env
VITE_AUTH_MODE=live
```

------------------------------------------------------------------------

# 📸 Screenshots

> Add screenshots here later.

-   Landing Page
-   <img width="1889" height="754" alt="image" src="https://github.com/user-attachments/assets/9e5a46e4-77ec-47e6-a954-56b67b401a90" />

-   Audit Dashboard
-   SEO Report
-   Accessibility Report
-   Technical Findings
-   AI Summary

------------------------------------------------------------------------

# 📚 Documentation

See the `docs/` folder:

-   Architecture
-   AI Workflow
-   User Guide
-   Test Plan
-   Demo Script
-   Reflection

------------------------------------------------------------------------

# 👤 Author

**Muhammad Ahmad**

GitHub: https://github.com/Muhammad-Ahmad2511

------------------------------------------------------------------------

# ⭐ Support

If you found this project useful, consider giving it a star on GitHub.
