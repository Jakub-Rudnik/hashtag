# hashtag

Wgrywasz plik Markdown i dostajesz link do ładnie wyrenderowanej strony.
Działa na Cloudflare: Workers + R2 + D1.

## Lokalnie (bez konta Cloudflare)

```sh
pnpm install
pnpm db:migrate:local
pnpm dev                # http://localhost:8787/admin, hasło z .dev.vars (domyślnie: dev)
```

Lokalne R2 i D1 lądują w `.wrangler/state/`.

## Deploy

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create hashtag            # wklej database_id do wrangler.jsonc
pnpm exec wrangler r2 bucket create hashtag-docs
pnpm exec wrangler secret put ADMIN_PASSWORD
openssl rand -hex 32 | pnpm exec wrangler secret put SESSION_SECRET
pnpm db:migrate:remote
pnpm run deploy
```

## Struktura

```
src/index.ts         routing
src/routes/          public.tsx (/p/:id, /p/:id/raw), admin.tsx (/admin/*)
src/lib/documents.ts logika (upload/odczyt/usuwanie), niezależna od HTTP
src/lib/             db (D1), storage (R2), markdown (render), auth (sesja), id
src/views/           widoki JSX
public/              CSS/JS jako statyczne pliki
migrations/          schemat D1
```
