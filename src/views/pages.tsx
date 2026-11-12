import { raw } from 'hono/html'
import type { Doc } from '../lib/db'
import { MAX_FILE_BYTES } from '../lib/documents'
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  MoreIcon,
  OpenIcon,
  TrashIcon,
  UserIcon,
} from './icons'
import { Layout } from './Layout'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const fmtSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

/** Server renders the UTC date; doc.js swaps in the reader's local date and time. */
const Time = ({ ms }: { ms: number }) => <time datetime={new Date(ms).toISOString()}>{fmtDate(ms)}</time>

export function DocPage(props: { doc: Doc; html: string; description: string | null; showTitle: boolean }) {
  const { doc, html, description, showTitle } = props
  return (
    <Layout title={doc.title} description={description} scripts={['/doc.js']}>
      <details class="doc-menu">
        <summary aria-label="Informacje o dokumencie" title="Informacje o dokumencie">
          <MoreIcon />
        </summary>
        <div class="menu">
          {doc.author && (
            <div class="menu-row">
              <UserIcon />
              <span>{doc.author}</span>
            </div>
          )}
          <div class="menu-row">
            <CalendarIcon />
            <span>
              Utworzono <Time ms={doc.created_at} />
            </span>
          </div>
          {doc.updated_at !== doc.created_at && (
            <div class="menu-row">
              <EditIcon />
              <span>
                Zmieniono <Time ms={doc.updated_at} />
              </span>
            </div>
          )}
          <hr />
          <button type="button" class="menu-row" data-print>
            <DownloadIcon />
            <span>Eksportuj PDF</span>
          </button>
          <button type="button" class="menu-row icon-swap" data-copy>
            <CopyIcon />
            <CheckIcon />
            <span>Kopiuj link</span>
          </button>
          <a class="menu-row" href={`/p/${doc.id}/raw`}>
            <FileIcon />
            <span>Źródło .md</span>
          </a>
        </div>
      </details>
      <main class="doc">
        <article class="markdown">
          {showTitle && <h1>{doc.title}</h1>}
          {raw(html)}
        </article>
      </main>
    </Layout>
  )
}

export function AdminPage(props: {
  docs: Doc[]
  origin: string
  errors: string[]
  created?: string
  defaultAuthor?: string
}) {
  const { docs, origin, errors, defaultAuthor } = props
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
            <input
              type="file"
              name="files"
              accept=".md,.markdown,.txt,.png,.jpg,.jpeg,.gif,.webp,.avif"
              multiple
              required
            />
            <span>
              Upuść pliki <code>.md</code> (razem z obrazkami, których używają) albo kliknij, żeby wybrać (max{' '}
              {MAX_FILE_BYTES / 1024 / 1024} MB na plik .md)
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
            <input
              name="author"
              class="author"
              placeholder={defaultAuthor ? `Autor (${defaultAuthor})` : 'Autor (opcjonalnie)'}
            />
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
                      {[d.author, d.filename, fmtSize(d.size), fmtDate(d.created_at)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div class="actions">
                    <a class="icon-btn" href={url} target="_blank" title="Otwórz w nowej karcie" aria-label="Otwórz">
                      <OpenIcon />
                    </a>
                    <button
                      type="button"
                      class="icon-btn icon-swap"
                      data-copy={url}
                      title="Kopiuj link"
                      aria-label="Kopiuj link"
                    >
                      <CopyIcon />
                      <CheckIcon />
                    </button>
                    <form method="post" action={`/admin/${d.id}/delete`} data-confirm={`Usunąć „${d.title}”?`}>
                      <button class="icon-btn danger" title="Usuń" aria-label="Usuń">
                        <TrashIcon />
                      </button>
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
