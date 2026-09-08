-- Per-team scan attribution: a QR checkpoint may be claimed at most once by
-- each team. Scans already carry a team_id snapshot (the team who scanned);
-- this index enforces one marker claim per team on top of the per-player
-- guard. Team_id stays nullable so legacy rows and team-disbanded scans keep
-- their frozen attribution without blocking the index (Postgres treats NULLs
-- as distinct in unique indexes).
CREATE UNIQUE INDEX "scans_team_id_index_id_key" ON "scans"("team_id", "index_id");