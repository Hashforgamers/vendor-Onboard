# Hash Super Admin Dashboard (`vendor-Onboard`)

Production-focused super-admin console for Hash operations:
- Onboard new cafes
- Review/verify documents
- Manage vendor status, PIN/password, and team access
- Track day-end payouts and settle vendor dues
- Manage collaborators and collaborator products
- Manage subscriptions (inventory-level view)

## Tech
- Next.js (App Router)
- Server-side API proxy for backend calls (`/api/backend/[...path]`)
- Flat, responsive UI (no gradients), light/dark compatible

## Required Environment Variables

Set these in your deployment platform:

- `ONBOARD_BACKEND_URL`
  - Example: `https://hfg-onboard.onrender.com`
  - The proxy will call `${ONBOARD_BACKEND_URL}/api/...`

- `SUPER_ADMIN_API_KEY`
  - Must match backend `hfg-onboard` env `SUPER_ADMIN_API_KEY`
  - Injected only server-side by Next route handler (not exposed to browser)

Optional:
- `NEXT_PUBLIC_ONBOARD_BACKEND_URL`
  - Fallback only when `ONBOARD_BACKEND_URL` is not set

## Local Run

```bash
npm ci
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Build Check

```bash
npm run lint
npm run build
```

## Backend API Surface Used

Super-admin endpoints in `hfg-onboard`:
- `GET /api/admin/vendors`
- `GET /api/admin/vendors/:vendor_id`
- `POST /api/admin/vendors/:vendor_id/status`
- `POST /api/admin/vendors/:vendor_id/documents/verify`
- `GET /api/admin/vendors/:vendor_id/subscriptions`
- `GET /api/admin/subscriptions`
- `POST /api/admin/vendors/:vendor_id/subscriptions/change`
- `POST /api/admin/vendors/:vendor_id/subscriptions/provision-default`
- `GET /api/admin/vendors/:vendor_id/team-access`
- `POST /api/admin/vendors/:vendor_id/team-access/staff`
- `PATCH /api/admin/vendors/:vendor_id/team-access/staff/:staff_id`
- `DELETE /api/admin/vendors/:vendor_id/team-access/staff/:staff_id`
- `POST /api/admin/vendors/:vendor_id/credentials/reset-pin`
- `POST /api/admin/vendors/:vendor_id/credentials/reset-password`
- `GET /api/admin/settlements/daily`
- `POST /api/admin/settlements/daily/settle`

Existing operational endpoints reused:
- `POST /api/onboard`
- `GET/POST/PUT/DELETE /api/collaborators...`
- `GET/POST/PUT/DELETE /api/products...`

