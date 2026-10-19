-- CreateTable
CREATE TABLE "staff_credentials" (
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(300) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "staff_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(300),

    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_sessions_token_hash_key" ON "staff_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "staff_sessions_user_id_idx" ON "staff_sessions"("user_id");

-- CreateIndex
CREATE INDEX "staff_sessions_expires_at_idx" ON "staff_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Keep updated_at current, like the other tables (see docs/database-guide.md).
CREATE TRIGGER staff_credentials_set_updated_at BEFORE UPDATE ON staff_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
