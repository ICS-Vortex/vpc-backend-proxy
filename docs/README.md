# backend-proxy API docs

| File | Purpose |
|------|---------|
| `lua-proxy-api-catalog.json` | **Source of truth** — routes, headers, JSON types (CMS AI + generators) |
| `openapi.json` | **Generated** OpenAPI 3.0 — Swagger / Redoc |

Regenerate from orchestration repo root:

```bash
make cms-ai-lua-proxy-catalog-docker
```

Human-readable: `backend/docs/cms/API_LUA_PROXY_DEVELOPER_REFERENCE.md`.
