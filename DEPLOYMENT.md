# Railway deployment

CRAVE is one full-stack Next.js service: the browser UI and `/api/v1` backend are built and deployed together. PostgreSQL is a separate Railway-managed service in the same Railway project.

## What is already configured

- `output: "standalone"` creates a minimal production runtime.
- `scripts/prepare-standalone.mjs` copies public and optimized static assets into that runtime.
- `railway.json` builds the app, runs `prisma migrate deploy` before release, starts the standalone server, checks `/api/health`, and restarts failed processes.
- `/api/health` returns `200` only when the server can query PostgreSQL.
- The initial Prisma migration is committed under `prisma/migrations`.

## Deploy from GitHub

1. Commit this project and push it to a private GitHub repository.
2. In Railway, create a project and choose **Deploy from GitHub repo**. Select the CRAVE repository.
3. On the project canvas choose **+ New → Database → PostgreSQL**.
4. Open the CRAVE service **Variables** tab. Add a reference variable named `DATABASE_URL` whose value is the PostgreSQL service's `DATABASE_URL`.
5. Add every production variable listed below. Do not paste secrets into source control.
6. Deploy. Railway reads `railway.json`; the pre-deploy migration must pass before the new release can start.
7. In the CRAVE service open **Settings → Networking → Generate Domain**.
8. Set `NEXT_PUBLIC_APP_URL=https://<generated-domain>` and redeploy. Use that same origin for the Strowallet callback configuration.
9. Confirm `https://<generated-domain>/api/health` returns `{"status":"ok","database":"ready"}`.
10. Run `pnpm db:seed` once through a Railway shell or one-off command to create the operational roles, permissions, catalogue, delivery zones, and chart of accounts. This base seed is idempotent. Never run `db:seed:demo` in production.
11. Temporarily set `BOOTSTRAP_ADMIN_PHONE` to the first administrator's phone and run `pnpm db:bootstrap-admin` once. Remove that variable, then use the normal registration screen with the same phone, preferred name, OTP channel, and PIN. The accepted invitation creates the first Super Admin profile.

## Production variables

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.up.railway.app

SESSION_SECRET=<at-least-32-random-characters>
OTP_PEPPER=<different-high-entropy-secret>
FINANCIAL_DATA_KEY=<different-high-entropy-secret>

AUTH_MOCK_OTP=false
STROWALLET_PUBLIC_KEY=<strowallet-key>
STROWALLET_BASE_URL=https://strowallet.com/api

PAYMENT_PROVIDER=strowallet
STROWALLET_PAYMENT_BASE_URL=https://strowallet.com
PAYOUT_PROVIDER=strowallet
STROWALLET_TRANSFER_MODE=live
ALLOW_EARLY_WITHDRAWALS=false

BLOB_READ_WRITE_TOKEN=<vercel-blob-token-if-media-uploads-are-enabled>
ALLOW_DEMO_SEED=false
BOOTSTRAP_ADMIN_PHONE=
```

Generate each secret independently. On a machine with OpenSSL, `openssl rand -base64 48` is suitable. Railway injects `PORT`; do not hardcode it.

## Staging first

Create a Railway staging environment with its own PostgreSQL database and secrets. Use Strowallet sandbox/test credentials and `STROWALLET_TRANSFER_MODE=sandbox`. Keep `NODE_ENV=production` so production safety checks remain active. Promote only after checkout, callback verification, OTP delivery, payout approval, month-end rules, and financial reports pass there.

## Migration and rollback policy

- Every schema change must include a new Prisma migration. Never edit a migration that has already run.
- Railway executes `pnpm db:deploy` as a pre-deploy command. A migration failure blocks the release.
- Application rollback does not automatically reverse database migrations. Prefer backward-compatible expand/migrate/contract changes and take a database backup before destructive migrations.
- Enable Railway PostgreSQL backups or point-in-time recovery before accepting production orders.

## Media storage note

Product and receipt upload routes currently use Vercel Blob as an external object store; they work from Railway when `BLOB_READ_WRITE_TOKEN` is supplied. If it is omitted, upload endpoints return `503`, while the rest of the application remains available.

## Local production preview

```bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm db:seed
pnpm build
pnpm start
```

Open `http://localhost:3000`. A local PostgreSQL database and the values in `.env.example` are required.
