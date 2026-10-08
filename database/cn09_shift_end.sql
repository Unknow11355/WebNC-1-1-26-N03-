-- Run once against the selected application database; no reset or historical guesses.
ALTER TABLE work_shifts ADD COLUMN ended_at DATETIME NULL;
