-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "file_kind" AS ENUM ('resume', 'photo', 'logo');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "rejection_reason" VARCHAR(500),
ADD COLUMN     "review_status" "review_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "individuals" ADD COLUMN     "photo_file_id" UUID,
ADD COLUMN     "rejection_reason" VARCHAR(500),
ADD COLUMN     "resume_file_id" UUID,
ADD COLUMN     "review_status" "review_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN     "rejection_reason" VARCHAR(500),
ADD COLUMN     "review_status" "review_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "member_credentials" (
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(300) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "member_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(300),

    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "kind" "file_kind" NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_sessions_token_hash_key" ON "member_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "member_sessions_user_id_idx" ON "member_sessions"("user_id");

-- CreateIndex
CREATE INDEX "member_sessions_expires_at_idx" ON "member_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_storage_key_key" ON "uploaded_files"("storage_key");

-- CreateIndex
CREATE INDEX "uploaded_files_owner_user_id_idx" ON "uploaded_files"("owner_user_id");

-- CreateIndex
CREATE INDEX "applications_review_status_created_at_idx" ON "applications"("review_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_postings_review_status_created_at_idx" ON "job_postings"("review_status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "member_credentials" ADD CONSTRAINT "member_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "individuals" ADD CONSTRAINT "individuals_resume_file_id_fkey" FOREIGN KEY ("resume_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "individuals" ADD CONSTRAINT "individuals_photo_file_id_fkey" FOREIGN KEY ("photo_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Keep updated_at current, like the other tables (see docs/database-guide.md).
CREATE TRIGGER member_credentials_set_updated_at BEFORE UPDATE ON member_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Everything that existed before reviews were introduced was entered or vetted
-- by staff, so it counts as approved. New rows default to 'pending'.
UPDATE individuals  SET review_status = 'approved', submitted_at = created_at, reviewed_at = now();
UPDATE job_postings SET review_status = 'approved', submitted_at = created_at, reviewed_at = now();
UPDATE applications SET review_status = 'approved', submitted_at = created_at, reviewed_at = now();
