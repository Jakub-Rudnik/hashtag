-- Images a document references by file name, e.g. ![](/tmp/chart.png) -> name "chart.png".
-- key is the content-addressed R2 object under img/, shared between documents.
CREATE TABLE doc_images (
  doc_id TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  name   TEXT NOT NULL,
  key    TEXT NOT NULL,
  PRIMARY KEY (doc_id, name)
);
