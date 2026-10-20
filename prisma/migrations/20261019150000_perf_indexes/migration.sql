-- Review queue (/admin/reviews) and the 審査 filter on 会員一覧 read
-- individuals by review_status and submitted_at.
CREATE INDEX "individuals_review_status_submitted_at_idx" ON "individuals"("review_status", "submitted_at");
