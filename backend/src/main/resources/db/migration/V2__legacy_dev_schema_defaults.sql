DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AuthSessions' AND column_name = 'UserAgent'
  ) THEN
    EXECUTE 'ALTER TABLE "AuthSessions" ALTER COLUMN "UserAgent" SET DEFAULT ''''';
    EXECUTE 'UPDATE "AuthSessions" SET "UserAgent" = '''' WHERE "UserAgent" IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AuthSessions' AND column_name = 'IpAddress'
  ) THEN
    EXECUTE 'ALTER TABLE "AuthSessions" ALTER COLUMN "IpAddress" SET DEFAULT ''''';
    EXECUTE 'UPDATE "AuthSessions" SET "IpAddress" = '''' WHERE "IpAddress" IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Works' AND column_name = 'VideosVersion'
  ) THEN
    EXECUTE 'ALTER TABLE "Works" ALTER COLUMN "VideosVersion" SET DEFAULT 0';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Works' AND column_name = 'CreatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Works" ALTER COLUMN "CreatedAt" SET DEFAULT now()';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Works' AND column_name = 'UpdatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Works" ALTER COLUMN "UpdatedAt" SET DEFAULT now()';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Blogs' AND column_name = 'CreatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Blogs" ALTER COLUMN "CreatedAt" SET DEFAULT now()';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Blogs' AND column_name = 'UpdatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Blogs" ALTER COLUMN "UpdatedAt" SET DEFAULT now()';
  END IF;
END $$;
