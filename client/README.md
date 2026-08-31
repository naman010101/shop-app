# Cash Terminal — Frontend (Next.js Client)

This is the **Next.js 16** frontend for the Cash Terminal shop ledger application.

## Stack
- **Next.js 16** with App Router
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Axios** for API calls
- **Lucide React** for icons
- **jsPDF** & **XLSX** for report exports

## Local Development

```bash
npm install
npm run dev
```

App runs on [http://localhost:3000](http://localhost:3000).

> The dev server proxies all `/api/*` calls to `http://localhost:4000` (backend) via `next.config.ts`.

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=/api
```

For production (Vercel), set:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com/api
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx       # Header + tab navigation
│   │   ├── dashboard/       # Main dashboard
│   │   ├── inflow/          # Inflow entries
│   │   ├── outflow/         # Outflow entries
│   │   ├── sales/           # Sales tracking
│   │   ├── balance/         # Balance reconciliation
│   │   ├── party-dispatch/  # Warehouse dispatches
│   │   ├── shop-transfer/   # Stock transfers
│   │   ├── reports/         # Export reports
│   │   ├── users/           # User management
│   │   └── settings/        # Account settings
│   └── globals.css          # Global design tokens
├── components/              # Shared UI components
├── contexts/                # Auth context
└── lib/api.ts               # Axios API client
```

## Build for Production

```bash
npm run build
npm start
```
