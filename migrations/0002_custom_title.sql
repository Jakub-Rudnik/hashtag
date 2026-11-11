-- 1 when the title was typed in by hand (not taken from the Markdown or the filename).
ALTER TABLE documents ADD COLUMN custom_title INTEGER NOT NULL DEFAULT 0;
