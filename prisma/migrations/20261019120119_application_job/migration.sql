-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "job_posting_id" BIGINT;

-- CreateIndex
CREATE INDEX "applications_job_posting_id_review_status_idx" ON "applications"("job_posting_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_individual_id_job_posting_id_key" ON "applications"("individual_id", "job_posting_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE NO ACTION;


-- Upload limits the app also enforces (PDF / JPG / PNG, 10 MB).
ALTER TABLE uploaded_files
  ADD CONSTRAINT uploaded_files_size_check CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  ADD CONSTRAINT uploaded_files_content_type_check
    CHECK (content_type IN ('application/pdf', 'image/jpeg', 'image/png'));

-- Contact requests that point at exactly one job get the job id (the sample data).
UPDATE applications a SET job_posting_id = ai.job_posting_id
FROM application_items ai
WHERE ai.application_id = a.id AND ai.job_posting_id IS NOT NULL
  AND (SELECT count(*) FROM application_items x WHERE x.application_id = a.id) = 1;
