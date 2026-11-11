CREATE TABLE documents (
  id         TEXT PRIMARY KEY,          -- public slug, also the R2 key
  title      TEXT NOT NULL,
  filename   TEXT NOT NULL,
  size       INTEGER NOT NULL,
  created_at INTEGER NOT NULL,          -- unix ms
  updated_at INTEGER NOT NULL
);

CREATE INDEX documents_created_at ON documents (created_at DESC);
