# Cash Terminal — Backend (Express API Server)

This is the **Node.js + Express** REST API backend for the Cash Terminal shop ledger application.

## Stack
- **Node.js + Express 4**
- **Prisma ORM** with **PostgreSQL** (Neon cloud DB)
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT authentication
- **Helmet** for HTTP security headers
- **express-validator** for input validation
- **pdfkit + xlsx** for server-side report generation

## Local Development

```bash
npm install
```

Create a `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed default accounts and sample data:

```bash
npm run prisma:seed
```

Start the server:

```bash
npm run dev      # with nodemon (auto-reload)
npm start        # production
```

Server runs on **http://localhost:4000**.

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/dashboard` | Dashboard metrics |
| `GET/POST` | `/api/inflow` | Cash inflows |
| `GET/POST` | `/api/outflow` | Cash outflows |
| `GET/POST` | `/api/sales` | Sales |
| `GET/POST` | `/api/balance` | Balance records |
| `GET/POST` | `/api/warehouse/party-dispatch` | Party dispatches |
| `GET/POST` | `/api/warehouse/shop-transfer` | Shop transfers |
| `GET` | `/api/reports` | Generate reports |
| `GET/PATCH` | `/api/users` | User management |

## Project Structure

```
server/
├── src/
│   ├── app.js               # Express entry point
│   ├── controllers/         # Route handler logic
│   ├── routes/              # Express routers
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   └── utils/               # Helper utilities
├── prisma/
│   ├── schema.prisma        # Prisma DB schema
│   └── seed.js              # Default data seeder
└── .env                     # Environment variables (not committed)
```

## Deployment (Render.com)

The `render.yaml` at the monorepo root handles deployment:

```yaml
buildCommand: npm install && npx prisma generate && npx prisma migrate deploy
startCommand: npm start
```

Set `DATABASE_URL` and `JWT_SECRET` as secrets in your Render dashboard.
