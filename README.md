# hashtag

Wgrywasz plik Markdown i dostajesz link do ładnie wyrenderowanej strony.
Działa na Cloudflare: Workers + R2 + D1.

## Lokalnie (bez konta Cloudflare)

```sh
pnpm install
cp .dev.vars.example .dev.vars   # uzupełnij: ADMIN_PASSWORD, SESSION_SECRET, API_TOKEN
pnpm db:migrate:local
pnpm dev                # http://localhost:8787/admin, hasło = ADMIN_PASSWORD z .dev.vars
```

Lokalne R2 i D1 lądują w `.wrangler/state/`.

## Deploy

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create hashtag            # wklej database_id do wrangler.jsonc
pnpm exec wrangler r2 bucket create hashtag-docs
pnpm exec wrangler secret put ADMIN_PASSWORD
openssl rand -hex 32 | pnpm exec wrangler secret put SESSION_SECRET   # losowy, nikt nie musi go znać
openssl rand -hex 32                            # token API: skopiuj, bo potrzebny też klientom
pnpm exec wrangler secret put API_TOKEN         # wklej ten token; u siebie ustaw go jako HASHTAG_TOKEN
pnpm db:migrate:remote
pnpm run deploy
```

## API

Dla skryptów i narzędzi (np. skill `share-md` w Claude Code). Nagłówek `Authorization: Bearer <API_TOKEN>`,
treść żądania to surowy Markdown, opcjonalne `?title=` ustawia tytuł ręczny.

| Metoda | Ścieżka          | Działanie                              |
|--------|------------------|----------------------------------------|
| POST   | `/api/docs`      | nowy dokument → `201 {id, title, url}` |
| PUT    | `/api/docs/:id`  | nowa treść, ten sam link               |
| DELETE | `/api/docs/:id`  | usuwa → `204`                          |

```sh
curl -H "Authorization: Bearer $HASHTAG_TOKEN" --data-binary @notatka.md "$HASHTAG_URL/api/docs"
```

W produkcji wygeneruj token (`openssl rand -hex 32`), zapisz go w `~/.bashrc` jako `HASHTAG_TOKEN`
i wklej przy `pnpm exec wrangler secret put API_TOKEN`.

## Struktura

```
src/index.ts         routing
src/routes/          public.tsx (/p/:id, /p/:id/raw), admin.tsx (/admin/*), api.ts (/api/*)
src/lib/documents.ts logika (upload/odczyt/usuwanie), niezależna od HTTP
src/lib/             db (D1), storage (R2), markdown (render), auth (sesja), id
src/views/           widoki JSX
public/              CSS/JS jako statyczne pliki
migrations/          schemat D1
```
