# hashtag

Upload a Markdown file, get a link to a nicely rendered page. Runs on Cloudflare Workers + R2 + D1,
and fits comfortably in the free tier.

## Features

- Upload `.md` files (drag & drop, several at once) or paste Markdown from the clipboard
- Unlisted links (`/p/<random id>`), kept out of search engines
- Syntax highlighting, tables, heading anchors, light/dark theme, link previews (Open Graph)
- Raw HTML in Markdown is escaped, so uploaded documents cannot run scripts
- Password-protected admin panel
- Token-authenticated JSON API, plus a `SKILL.md` that lets coding agents publish pages

## Local development (no Cloudflare account needed)

```sh
pnpm install
cp .dev.vars.example .dev.vars   # fill in ADMIN_PASSWORD, SESSION_SECRET, API_TOKEN
pnpm db:migrate:local
pnpm dev                         # http://localhost:8787/admin, password = ADMIN_PASSWORD
```

Local R2 and D1 data lives in `.wrangler/state/`.

## Deploy

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create hashtag            # put the returned database_id in wrangler.jsonc
pnpm exec wrangler r2 bucket create hashtag-docs
pnpm exec wrangler secret put ADMIN_PASSWORD
openssl rand -hex 32 | pnpm exec wrangler secret put SESSION_SECRET   # random, nobody needs to know it
openssl rand -hex 32                            # API token: copy it, clients need it too
pnpm exec wrangler secret put API_TOKEN         # paste that token; clients use it as HASHTAG_TOKEN
pnpm db:migrate:remote
pnpm run deploy
```

## API

For scripts and tools. Send `Authorization: Bearer <API_TOKEN>`; the request body is raw Markdown.
An optional `?title=` sets a custom title, shown as the page heading when the document has no `# H1`.

| Method | Path            | Action                                         |
|--------|-----------------|------------------------------------------------|
| POST   | `/api/docs`     | create a document → `201 {id, title, url}`     |
| PUT    | `/api/docs/:id` | replace its content, keeping the link          |
| DELETE | `/api/docs/:id` | delete it → `204`                              |

```sh
curl -H "Authorization: Bearer $HASHTAG_TOKEN" --data-binary @notes.md "$HASHTAG_URL/api/docs"
```

Errors: `401` wrong token, `400` empty document, `413` larger than 2 MB, `404` unknown id.

## Agent skill

[`skills/share-md/SKILL.md`](skills/share-md/SKILL.md) teaches coding agents (Claude Code, Codex and others
that support the `SKILL.md` format) to publish their answers as pages and reply with the link.
Copy or symlink the directory into your agent's skills directory (e.g. `~/.claude/skills/share-md`),
then export `HASHTAG_URL` and `HASHTAG_TOKEN` in your shell profile.

## Project structure

```
src/index.ts         routing
src/routes/          public.tsx (/p/:id, /p/:id/raw), admin.tsx (/admin/*), api.ts (/api/*)
src/lib/documents.ts business logic (upload/read/update/delete), independent of HTTP
src/lib/             db (D1), storage (R2), markdown (rendering), auth (session), limits, id
src/views/           JSX views
public/              static files: CSS, JS, favicons
migrations/          D1 schema
skills/share-md/     SKILL.md for coding agents
```

## License

[MIT](LICENSE)
