-- 許可・登録番号 (e.g. 監理団体の許可番号, 登録支援機関の登録番号, 有料職業紹介の許可番号).
-- Shown to candidates next to the company name; contact details are never shown.
ALTER TABLE "corporations" ADD COLUMN "license_no" VARCHAR(100);
