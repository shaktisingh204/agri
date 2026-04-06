# AgriSphere Crop Calendar Platform

Production-grade SaaS monorepo for multi-tenant crop calendar exploration, agricultural dataset management, and PDF-based admin ingestion.

## Architecture

```text
platform/
  apps/
    api/                 NestJS REST + GraphQL backend
    web/                 Next.js App Router frontend
  packages/
    database/            Prisma schema, migration, seed
    shared/              Shared domain types and constants
  services/
    ingestion/           FastAPI PDF ingestion microservice
  .github/workflows/     CI pipeline
  docker-compose.yml
```

## Key capabilities

- Multi-tenant SaaS foundation with role-based access
- Crop calendar filtering by country, region, agro-ecological zone, crop, and season
- Timeline visualization for sowing, growing, and harvesting phases
- PDF upload, extraction, validation, staged CSV preview, and explicit commit workflow
- PostgreSQL + Redis + S3-compatible storage ready
- Swagger docs, GraphQL endpoint, usage analytics, and rate limiting hooks
- Dockerized local stack and GitHub Actions CI

## Stack

- Frontend: Next.js 15, Tailwind CSS, Zustand, Recharts, Leaflet-ready map surface
- Backend: NestJS, Prisma, PostgreSQL, Redis, Winston, Swagger, GraphQL
- Ingestion: FastAPI, pdfplumber, tabula-py, Pydantic
- Infra: Docker Compose, MinIO, GitHub Actions

## Local setup

1. Copy environment values.

```bash
cp .env.example .env
```

2. Install dependencies per workspace.

```bash
npm install
npm --workspace @agri/api install
npm --workspace @agri/web install
npm --workspace @agri/database install
python3 -m venv services/ingestion/.venv
source services/ingestion/.venv/bin/activate
pip install -r services/ingestion/requirements.txt
```

3. Start infrastructure.

```bash
docker compose up -d postgres redis minio
```

4. Generate Prisma client, run migration, and seed demo data.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Start services.

```bash
npm run dev:api
npm run dev:web
uvicorn app.main:app --app-dir services/ingestion --reload --port 8000
```

## Ingestion flow

1. Open `/admin/uploads` in the web app.
2. Upload crop calendar PDF and run **Extract Preview**.
3. Review normalized rows and flagged rows.
4. Confirm **Save To Database** to commit through API.
5. Data is written from staged CSV to database only after explicit save action.

## Service endpoints

- Web app: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`
- GraphQL: `http://localhost:4000/graphql`
- Ingestion service: `http://localhost:8000`
- MinIO console: `http://localhost:9001`

## Production notes

- Provision PostgreSQL with read replicas for analytics-heavy tenants.
- Put Redis behind a managed cache for shared query and session caching.
- Move file storage to S3 and front it with a CDN.
- Run the ingestion service asynchronously behind a queue for large PDF batches.
- Add tenant-aware observability pipelines for audit logs, metrics, and billing events.
# agri
