import type { Child } from 'hono/jsx'

type Props = {
  title: string
  description?: string | null
  noindex?: boolean
  scripts?: string[]
  children: Child
}

export function Layout({ title, description, noindex = true, scripts = [], children }: Props) {
  return (
    <html lang="pl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {noindex && <meta name="robots" content="noindex, nofollow" />}
        <meta property="og:title" content={title} />
        {description && <meta name="description" content={description} />}
        {description && <meta property="og:description" content={description} />}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="stylesheet" href="/style.css" />
        {scripts.map((src) => (
          <script src={src} defer />
        ))}
      </head>
      <body>{children}</body>
    </html>
  )
}
