# DOCUSURE — Intelligent Government Document Verification & Processing Platform

> **Hackathon MVP Project | Smart India Hackathon (SIH) 2026 Preparation**

DOCUSURE automates document intake, cross-document verification, and eligibility rule evaluation for government scholarship schemes — routing only problematic applications to human officers.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📌 Implementation Status: PHASE 0 COMPLETE

### What Phase 0 Contains:
- ✅ **Next.js 14 App Router** + TypeScript foundation
- ✅ **Tailwind CSS + shadcn/ui** design system and color palette
- ✅ **TypeScript Data Models**: Applications, Documents, Verification Results, Rules, Exceptions, Reviews
- ✅ **Landing Page**: Product pitch, 4-step pipeline diagram (`Upload → Extract → Verify → Decide`), 5 scenario cards
- ✅ **Header & Footer Layout Shell**: Responsive navigation bar with institutional branding
- ✅ **StatusBadge & SeverityBadge Components**: Color-coded indicators for all application states (`VERIFIED`, `EXCEPTION`, `INELIGIBLE`, `INCOMPLETE`, `PROCESSING`, `ERROR`, `APPROVED`, `REJECTED`)
- ✅ **Gemini AI Service Abstraction**: Server-only safe wrapper in `src/lib/ai/gemini.ts`
- ✅ **Supabase Client Builders**: Client-side and server-side connection helpers in `src/lib/supabase/`
- ✅ **Zod Validation Schemas**: Schemas for document classification, field extraction, explanations, and summaries in `src/lib/validators/`
- ✅ **Text Normalization Utilities**: Deterministic helpers for names, dates, incomes, and states
- ✅ **Service Architecture Skeletons**: OCR, Verification Engine, Rule Engine, Exception Engine, Pipeline Orchestrator

### Intentionally NOT Implemented in Phase 0:
- ⏳ Database SQL migrations & Supabase tables (Phase 1)
- ⏳ Full document file upload & Supabase storage integration (Phase 2)
- ⏳ Live OCR extraction execution with Tesseract.js (Phase 3)
- ⏳ Live Gemini API extraction execution (Phase 4)
- ⏳ Cross-document Levenshtein verification algorithms (Phase 5)
- ⏳ Rule engine evaluation logic (Phase 6)
- ⏳ Exception detection & routing logic (Phase 7)
- ⏳ Application Verification Workspace split-screen UI (Phase 8 & 9)

---

## 🧠 Risk Intelligence & Anomaly Scoring Architecture

The current MVP uses an explainable deterministic risk scoring engine (`ExplainableRiskScoring_v1`) operating over a 13-dimensional feature vector snapshot. The feature snapshot interface is designed for seamless future integration with an offline-trained anomaly detection model such as Isolation Forest.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── apply/              # Application submission page
│   ├── officer/
│   │   └── dashboard/      # Officer review queue portal
│   ├── globals.css         # Tailwind theme configuration
│   ├── layout.tsx          # Root layout with Header and Footer
│   └── page.tsx            # Landing page
├── components/
│   ├── common/             # StatusBadge, SeverityBadge
│   ├── layout/             # Header, Footer
│   └── ui/                 # Button, Card primitives
├── lib/
│   ├── ai/                 # Gemini API service abstraction
│   ├── constants/          # Document slots, default rules
│   ├── supabase/           # Supabase client builders
│   ├── utils/              # Class names helper (cn), error handler
│   └── validators/         # Zod schemas for AI outputs
├── services/               # Pipeline stage skeletons (OCR, verification, rules)
└── types/                  # TypeScript interfaces for domain entities
```

---

## 🛡️ License

Built for demonstration purposes using synthetic data.
