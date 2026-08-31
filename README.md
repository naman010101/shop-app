<h1 align="center">
  💰 Cash Terminal — Shop Ledger
</h1>

<p align="center">
  A full-stack, role-based cash management system for retail shops. <br/>
  Track inflows, outflows, sales, warehouse dispatches, and reconcile daily balances — all from one elegant dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-Vercel%20%2B%20Render-000000?logo=vercel&logoColor=white" />
</p>

---

## 📌 Overview

**Cash Terminal** is a production-ready shop ledger application built for small-to-medium retail businesses. It provides a centralized hub for managing daily cash flows with strict role-based access control — so every team member only sees and does what they're permitted to.

The UI is crafted with a **warm cream aesthetic** — premium typography, smooth animations, and a structured ledger card layout — designed to feel professional and trustworthy for business use.

---

## ✨ Features

| Module | Description |
|---|---|
| 🔐 **Authentication** | Secure JWT-based login with `httpOnly` cookies. Role-gated navigation. |
| 📊 **Dashboard** | Live cash position, inflow/outflow KPIs, balance status, and a 7-day cash flow area chart. |
| ⬇️ **Inflow** | Record customer cash deposits with slip number, customer name, and timestamps. |
| ⬆️ **Outflow** | Log cash expenditures with reason, notes, and date-time. |
| 🛒 **Sales** | Track product sales with customer details and invoice notes. |
| ⚖️ **Balance Reconciliation** | Open/close daily balance records; verify or flag discrepancies. |
| 📦 **Party Dispatch** | Warehouse party dispatch logs with bill/challan numbers. |
| 🔁 **Shop Transfer** | Record warehouse-to-shop stock transfer slips. |
| 📈 **Reports** | Export daily/weekly summaries as **PDF** or **Excel**. |
| 👥 **Users** | Owner can manage team accounts — activate, deactivate, and assign roles. |
| ⚙️ **Settings** | Change username and password within the app. |
| 🪵 **Audit Log** | Every action (login, entry, edit) is logged with user and timestamp. |

---

## 🏗️ Project Structure

```
Shop-App/
├── client/                      # Next.js 16 Frontend (React 19 + TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/       # Login page
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx   # Shared header + tab navigation
│   │   │   │   ├── dashboard/   # Main cash position dashboard
│   │   │   │   ├── inflow/      # Cash inflow management
│   │   │   │   ├── outflow/     # Cash outflow management
│   │   │   │   ├── sales/       # Sales tracking
│   │   │   │   ├── balance/     # Balance reconciliation
│   │   │   │   ├── party-dispatch/  # Warehouse party dispatches
│   │   │   │   ├── shop-transfer/   # Warehouse → shop transfers
│   │   │   │   ├── reports/     # PDF & Excel export
│   │   │   │   ├── users/       # User management (Owner only)
│   │   │   │   └── settings/    # Profile settings
│   │   │   └── globals.css      # Global warm cream design tokens
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Mobile responsive sidebar
│   │   │   ├── KPICard.tsx      # Metric summary card
│   │   │   ├── DataTable.tsx    # Sortable, paginated table
│   │   │   ├── Modal.tsx        # Reusable modal dialog
│   │   │   ├── AlertBanner.tsx  # Top alert/notification banner
│   │   │   ├── ExportButtons.tsx # PDF/Excel export controls
│   │   │   └── ThemeToggle.tsx  # Theme toggle component
│   │   ├── contexts/            # React context (Auth state)
│   │   ├── lib/
│   │   │   └── api.ts           # Axios instance + API helpers
│   │   └── middleware.ts        # Next.js route protection middleware
│   ├── .env.local               # Local env variables
│   └── next.config.ts           # API proxy rewrites
│
├── server/                      # Node.js + Express Backend API
│   ├── src/
│   │   ├── app.js               # Express app entry point
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── inflowController.js
│   │   │   ├── outflowController.js
│   │   │   ├── salesController.js
│   │   │   ├── balanceController.js
│   │   │   ├── warehouseController.js
│   │   │   ├── reportsController.js
│   │   │   └── usersController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── inflow.js
│   │   │   ├── outflow.js
│   │   │   ├── sales.js
│   │   │   ├── balance.js
│   │   │   ├── warehouse.js
│   │   │   ├── reports.js
│   │   │   ├── users.js
│   │   │   └── dashboard.js
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification middleware
│   │   └── utils/               # Utility helpers
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (PostgreSQL)
│   │   └── seed.js              # Default user + sample data seeder
│   └── .env                    # Server environment variables
│
├── render.yaml                  # Render.com deployment config (server)
└── README.md                    # This file
```

---

## 🛠️ Tech Stack

### Frontend (`/client`)
| Technology | Purpose |
|---|---|
| **Next.js 16** | App Router, SSR, API proxy rewrites |
| **React 19** | UI rendering & state |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **Lucide React** | Icon library |
| **Axios** | HTTP client |
| **jsPDF + AutoTable** | PDF report generation |
| **XLSX** | Excel export |
| **React Hot Toast** | Toast notifications |

### Backend (`/server`)
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **Prisma ORM** | Type-safe database access |
| **PostgreSQL (Neon)** | Cloud database |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT authentication |
| **Helmet** | HTTP security headers |
| **Morgan** | Request logging |
| **pdfkit + xlsx** | Server-side report generation |
| **express-validator** | Input validation |

---

## 🗄️ Database Schema

```
User ──┬── CashInflow        (customer deposits)
       ├── CashOutflow        (expenses)
       ├── Sale               (product sales)
       ├── BalanceRecord      (daily opening/closing balance)
       ├── AuditLog           (all actions logged)
       ├── WarehousePartyDispatch   (party-to-warehouse dispatches)
       └── WarehouseShopTransfer    (warehouse-to-shop transfers)
```

**Roles:** `OWNER` · `CASHIER` · `STAFF` · `WAREHOUSE_MGMT`

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL database (or a free [Neon](https://neon.tech) cloud DB)

---

### 1. Clone the Repository

```bash
git clone https://github.com/naman010101/shop-app.git
cd shop-app
```

---

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file in `/server`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

Run database migrations and seed default accounts:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Start the backend server:

```bash
npm run dev        # with auto-reload (nodemon)
# or
npm start          # production mode
```

> Server runs on **http://localhost:4000**

---

### 3. Set Up the Frontend

```bash
cd ../client
npm install
```

Create a `.env.local` file in `/client`:

```env
NEXT_PUBLIC_API_URL=/api
```

Start the frontend:

```bash
npm run dev
```

> Frontend runs on **http://localhost:3000**

The Next.js dev server proxies all `/api/*` requests to `http://localhost:4000/api/*` automatically via `next.config.ts`.

---

### 4. Default Login Credentials

| Role | Username | Password |
|---|---|---|
| 👑 Owner | `admin` | `Admin@1234` |
| 👤 Cashier | `cashier1` | `Cashier@1234` |
| 👤 Cashier | `cashier2` | `Cashier@1234` |
| 📦 Warehouse | `warehouse1` | `Warehouse@1234` |

> **Security Note:** Change all default passwords immediately after your first login in a production environment.

---

## ☁️ Deployment

### Backend → [Render.com](https://render.com)
The `render.yaml` at the root configures automatic deployment:
- **Build:** `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start:** `npm start`
- Set `DATABASE_URL` and `JWT_SECRET` as environment secrets in the Render dashboard.

### Frontend → [Vercel](https://vercel.com)
Deploy the `/client` directory to Vercel:
- Set `NEXT_PUBLIC_API_URL` to your Render backend URL (e.g. `https://shop-app-ei63.onrender.com/api`)
- Vercel auto-detects Next.js and deploys instantly.

---

## 🔐 Role-Based Access Control

| Feature | Owner | Cashier | Staff | Warehouse |
|---|:---:|:---:|:---:|:---:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Add Inflow | ✅ | ✅ | ✅ | ❌ |
| Add Outflow | ✅ | ✅ | ✅ | ❌ |
| Add Sale | ✅ | ✅ | ✅ | ❌ |
| Balance Reconciliation | ✅ | ✅ | ❌ | ❌ |
| Party Dispatch | ✅ | ❌ | ❌ | ✅ |
| Shop Transfer | ✅ | ❌ | ❌ | ✅ |
| Export Reports | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login and receive JWT cookie |
| `POST` | `/api/auth/logout` | Clear auth cookie |
| `GET` | `/api/auth/me` | Get current logged-in user |
| `GET` | `/api/dashboard` | Aggregated dashboard metrics |
| `GET/POST` | `/api/inflow` | List / create cash inflows |
| `GET/POST` | `/api/outflow` | List / create cash outflows |
| `GET/POST` | `/api/sales` | List / create sales |
| `GET/POST` | `/api/balance` | Balance records |
| `GET/POST` | `/api/warehouse/party-dispatch` | Party dispatches |
| `GET/POST` | `/api/warehouse/shop-transfer` | Shop transfers |
| `GET` | `/api/reports` | Generate reports |
| `GET/PATCH` | `/api/users` | User management (Owner only) |

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

<p align="center">Built with ❤️ for efficient shop cash management</p>
