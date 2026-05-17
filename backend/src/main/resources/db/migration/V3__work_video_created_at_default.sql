DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkVideos' AND column_name = 'CreatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "WorkVideos" ALTER COLUMN "CreatedAt" SET DEFAULT now()';
    EXECUTE 'UPDATE "WorkVideos" SET "CreatedAt" = now() WHERE "CreatedAt" IS NULL';
  END IF;
END $$;
