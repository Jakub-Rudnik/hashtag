---
name: share-md
description: Publish a response, summary, or note as a rendered Markdown page on a hashtag server and return a shareable link. Use when asked to share or publish something as a link or web page (in any language), or when /share-md is invoked. Also use to update a page published earlier in the same conversation.
---

# share-md

Publishes Markdown to a hashtag server and returns the page URL.
Pages are unlisted: anyone with the link can read them.

## Requirements

- `curl` 7.87 or newer.
- Two environment variables, set in the shell the agent runs in:
  - `HASHTAG_URL`: server base URL without a trailing slash, e.g. `https://hashtag.example.workers.dev`
  - `HASHTAG_TOKEN`: the server's `API_TOKEN`

If either is missing (`[ -n "$HASHTAG_URL" ] && [ -n "$HASHTAG_TOKEN" ]` fails), stop and explain that
they must be exported in the shell profile and the agent restarted. Never ask for the token in chat,
never print it, and never pass it as a command-line argument.

## Steps

1. **Write the document** to a new `.md` file in a temporary or scratch directory.
   - Start with a `# Title` heading.
   - Make it self-contained. The reader has not seen this conversation: no "as mentioned above",
     no references to local files or paths the reader cannot open.
   - Write in the language of the conversation.
   - Tag code blocks with a language (```ts, ```bash, ...) to get syntax highlighting.
   - **Keep images.** Screenshots, charts and other images from the answer stay in the page as
     `![description](path/to/file.png)` with their local path; step 3 uploads them. Supported:
     PNG, JPEG, GIF, WebP, AVIF up to 10 MB each, with unique file names. For an SVG or an HTML chart,
     render a PNG (or leave it out and describe it in text).
   - Unless a verbatim copy was requested, restructure the content to read well as a standalone page.
2. **Check for secrets.** The page is readable by anyone who has the link. Never include tokens,
   passwords, private keys, `.env` contents, or personal data that was not explicitly meant to be shared.
   When unsure, ask before publishing.
3. **Publish.** The `Authorization` header is read from stdin (`-H @-`), so the token never shows up
   in the process list or in the command itself.

   New page, with one `-F files=@...` per local image the Markdown references (none if there are no images):
   ```bash
   printf 'Authorization: Bearer %s\n' "$HASHTAG_TOKEN" |
     curl -sS --fail-with-body -H @- \
       -F markdown=@page.md \
       -F files=@/path/to/chart.png \
       "$HASHTAG_URL/api/docs"
   ```

   The server matches images by file name, so `![](/path/to/chart.png)` and `![](chart.png)` both
   resolve to the uploaded `chart.png`. Leave the paths in the Markdown as they are.

   - With an explicit title (only when one was given): add `-F "title=The Title"`.
   - New content under the same link: add `-X PUT` and use `"$HASHTAG_URL/api/docs/<id>"`.
     Images uploaded earlier stay attached; send only new or changed ones.

   The response is JSON: `{"id": "...", "title": "...", "url": "..."}`.
4. **Reply** with the `url` and one line describing the page. Keep the `id`: when changes to the same
   page are requested later in the conversation, edit the file and publish it again with `-X PUT`,
   so the link stays the same.

## Errors

With `--fail-with-body`, curl exits with code 22 on HTTP errors and prints the server's JSON error.

| Status | Meaning |
|---|---|
| `401` | Wrong token. |
| `400` | Empty document, an unsupported image type, or two images with the same file name. |
| `413` | Markdown larger than 2 MB, an image larger than 10 MB, or more than 30 MB in total. |
| `404` on `PUT` | The page was deleted. Publish a new one instead. |
| Connection refused | The server is not running or `HASHTAG_URL` is wrong. |
