import { raw } from 'hono/html'
import type { Doc } from '../lib/db'
import { MAX_FILE_BYTES } from '../lib/documents'
import { Layout } from './Layout'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

const fmtSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

export function DocPage(props: { doc: Doc; html: string; description: string | null; showTitle: boolean }) {
  const { doc, html, description, showTitle } = props
  return (
    <Layout title={doc.title} description={description}>
      <main class="doc">
        <article class="markdown">
          {showTitle && <h1>{doc.title}</h1>}
          {raw(html)}
        </article>
        <footer class="doc-footer">
          <span>{fmtDate(doc.updated_at)}</span>
          <a href={`/p/${doc.id}/raw`}>Źródło .md</a>
        </footer>
      </main>
    </Layout>
  )
}

export function AdminPage(props: { docs: Doc[]; origin: string; errors: string[]; created?: string }) {
  const { docs, origin, errors } = props
  const created = docs.find((d) => d.id === props.created)
  return (
    <Layout title="Panel" scripts={['/admin.js']}>
      <main class="admin">
        <header class="admin-header">
          <h1>Dokumenty</h1>
          <form method="post" action="/admin/logout">
            <button class="link">Wyloguj</button>
          </form>
        </header>

        {errors.length > 0 && (
          <ul class="errors">
            {errors.map((e) => (
              <li>{e}</li>
            ))}
          </ul>
        )}

        {created && (
          <div class="created">
            <span>
              Gotowe: <a href={`${origin}/p/${created.id}`} target="_blank">{`${origin}/p/${created.id}`}</a>
            </span>
            <button type="button" data-copy={`${origin}/p/${created.id}`}>
              Kopiuj link
            </button>
          </div>
        )}

        <form class="upload" method="post" action="/admin/upload" enctype="multipart/form-data">
          <label class="dropzone">
            <input type="file" name="files" accept=".md,.markdown,.txt" multiple required />
            <span>
              Upuść pliki <code>.md</code> albo kliknij, żeby wybrać (max {MAX_FILE_BYTES / 1024 / 1024} MB)
            </span>
          </label>
          <button>Wgraj</button>
        </form>

        <form class="paste" method="post" action="/admin/paste">
          <textarea
            name="markdown"
            rows={8}
            placeholder="…albo wklej tu markdown (Ctrl+V działa w dowolnym miejscu panelu)"
            required
          />
          <div class="paste-row">
            <input name="title" placeholder="Tytuł (opcjonalnie, domyślnie pierwszy nagłówek)" />
            <button>Utwórz link</button>
          </div>
        </form>

        {docs.length === 0 ? (
          <p class="empty">Nic tu jeszcze nie ma.</p>
        ) : (
          <ul class="doc-list">
            {docs.map((d) => {
              const url = `${origin}/p/${d.id}`
              return (
                <li>
                  <div class="doc-info">
                    <a class="doc-title" href={url} target="_blank">
                      {d.title}
                    </a>
                    <span class="meta">
                      {d.filename} · {fmtSize(d.size)} · {fmtDate(d.created_at)}
                    </span>
                  </div>
                  <div class="actions">
                    <button type="button" data-copy={url}>
                      Kopiuj link
                    </button>
                    <form method="post" action={`/admin/${d.id}/delete`} data-confirm={`Usunąć „${d.title}”?`}>
                      <button class="danger">Usuń</button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </Layout>
  )
}

export function LoginPage(props: { error?: boolean }) {
  return (
    <Layout title="Logowanie">
      <main class="login">
        <form method="post" action="/admin/login">
          <h1>Logowanie</h1>
          {props.error && <p class="errors">Złe hasło.</p>}
          <input type="password" name="password" placeholder="Hasło" autofocus required />
          <button>Zaloguj</button>
        </form>
      </main>
    </Layout>
  )
}

export function NotFoundPage() {
  return (
    <Layout title="Nie znaleziono">
      <main class="login">
        <h1>404</h1>
        <p>Tego dokumentu nie ma albo został usunięty.</p>
      </main>
    </Layout>
  )
}
