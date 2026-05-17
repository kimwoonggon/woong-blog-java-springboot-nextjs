CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "Assets" (
  "Id" uuid PRIMARY KEY,
  "Bucket" text NOT NULL DEFAULT 'media',
  "Path" text NOT NULL,
  "PublicUrl" text NOT NULL,
  "MimeType" text NOT NULL,
  "Size" bigint NULL,
  "Kind" text NOT NULL DEFAULT 'other',
  "CreatedBy" uuid NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "Singleton" boolean PRIMARY KEY DEFAULT true,
  "OwnerName" text NOT NULL DEFAULT 'Woonggon Kim',
  "Tagline" text NOT NULL DEFAULT 'Creative Technologist',
  "FacebookUrl" text NOT NULL DEFAULT '',
  "InstagramUrl" text NOT NULL DEFAULT '',
  "TwitterUrl" text NOT NULL DEFAULT '',
  "LinkedInUrl" text NOT NULL DEFAULT '',
  "GitHubUrl" text NOT NULL DEFAULT '',
  "ResumeAssetId" uuid NULL REFERENCES "Assets" ("Id") ON DELETE SET NULL,
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Profiles" (
  "Id" uuid PRIMARY KEY,
  "Provider" text NOT NULL DEFAULT 'google',
  "ProviderSubject" text NOT NULL,
  "Email" text NOT NULL,
  "DisplayName" text NOT NULL,
  "Role" text NOT NULL DEFAULT 'user',
  "LastLoginAt" timestamptz NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_Profiles_Email" ON "Profiles" ("Email");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Profiles_Provider_ProviderSubject" ON "Profiles" ("Provider", "ProviderSubject");

CREATE TABLE IF NOT EXISTS "Pages" (
  "Id" uuid PRIMARY KEY,
  "Slug" text NOT NULL,
  "Title" text NOT NULL,
  "ContentJson" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Pages_Slug" ON "Pages" ("Slug");

CREATE TABLE IF NOT EXISTS "Blogs" (
  "Id" uuid PRIMARY KEY,
  "Slug" text NOT NULL,
  "Title" text NOT NULL,
  "Excerpt" text NOT NULL DEFAULT '',
  "ContentJson" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "PublicContentHtml" text NOT NULL DEFAULT '',
  "PublicContentMarkdown" text NOT NULL DEFAULT '',
  "SearchTitle" text NOT NULL DEFAULT '',
  "SearchText" text NOT NULL DEFAULT '',
  "CoverAssetId" uuid NULL REFERENCES "Assets" ("Id") ON DELETE SET NULL,
  "PublicCoverUrl" text NOT NULL DEFAULT '',
  "Tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "Published" boolean NOT NULL DEFAULT false,
  "PublishedAt" timestamptz NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Blogs_Slug" ON "Blogs" ("Slug");
CREATE INDEX IF NOT EXISTS "IX_Blogs_Published_PublishedAt" ON "Blogs" ("Published", "PublishedAt" DESC);
CREATE INDEX IF NOT EXISTS "IX_Blogs_SearchTitle_Trgm" ON "Blogs" USING gin ("SearchTitle" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "IX_Blogs_SearchText_Trgm" ON "Blogs" USING gin ("SearchText" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "Works" (
  "Id" uuid PRIMARY KEY,
  "Slug" text NOT NULL,
  "Title" text NOT NULL,
  "Excerpt" text NOT NULL DEFAULT '',
  "ContentJson" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "PublicContentHtml" text NOT NULL DEFAULT '',
  "PublicContentMarkdown" text NOT NULL DEFAULT '',
  "SearchTitle" text NOT NULL DEFAULT '',
  "SearchText" text NOT NULL DEFAULT '',
  "ThumbnailAssetId" uuid NULL REFERENCES "Assets" ("Id") ON DELETE SET NULL,
  "PublicThumbnailUrl" text NOT NULL DEFAULT '',
  "IconAssetId" uuid NULL REFERENCES "Assets" ("Id") ON DELETE SET NULL,
  "PublicIconUrl" text NOT NULL DEFAULT '',
  "PublicSocialShareMessage" text NOT NULL DEFAULT '',
  "Category" text NOT NULL DEFAULT '',
  "Period" text NULL,
  "AllPropertiesJson" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "Tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "VideosVersion" integer NOT NULL DEFAULT 0,
  "PublicVideosJson" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "Published" boolean NOT NULL DEFAULT false,
  "PublishedAt" timestamptz NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Works_Slug" ON "Works" ("Slug");
CREATE INDEX IF NOT EXISTS "IX_Works_Published_PublishedAt" ON "Works" ("Published", "PublishedAt" DESC);
CREATE INDEX IF NOT EXISTS "IX_Works_SearchTitle_Trgm" ON "Works" USING gin ("SearchTitle" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "IX_Works_SearchText_Trgm" ON "Works" USING gin ("SearchText" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "WorkVideos" (
  "Id" uuid PRIMARY KEY,
  "WorkId" uuid NOT NULL REFERENCES "Works" ("Id") ON DELETE CASCADE,
  "SourceType" text NOT NULL,
  "SourceKey" text NOT NULL,
  "OriginalFileName" text NULL,
  "MimeType" text NULL,
  "FileSize" bigint NULL,
  "Width" integer NULL,
  "Height" integer NULL,
  "DurationSeconds" double precision NULL,
  "TimelinePreviewVttStorageKey" text NULL,
  "TimelinePreviewSpriteStorageKey" text NULL,
  "SortOrder" integer NOT NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_WorkVideos_WorkId_SortOrder" ON "WorkVideos" ("WorkId", "SortOrder");

CREATE TABLE IF NOT EXISTS "WorkVideoUploadSessions" (
  "Id" uuid PRIMARY KEY,
  "WorkId" uuid NOT NULL REFERENCES "Works" ("Id") ON DELETE CASCADE,
  "StorageType" text NOT NULL,
  "StorageKey" text NOT NULL,
  "OriginalFileName" text NOT NULL DEFAULT '',
  "ExpectedMimeType" text NOT NULL,
  "ExpectedSize" bigint NOT NULL,
  "Status" text NOT NULL,
  "ExpiresAt" timestamptz NOT NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_WorkVideoUploadSessions_WorkId" ON "WorkVideoUploadSessions" ("WorkId");
CREATE INDEX IF NOT EXISTS "IX_WorkVideoUploadSessions_ExpiresAt" ON "WorkVideoUploadSessions" ("ExpiresAt");

CREATE TABLE IF NOT EXISTS "AuthSessions" (
  "Id" uuid PRIMARY KEY,
  "ProfileId" uuid NOT NULL REFERENCES "Profiles" ("Id") ON DELETE CASCADE,
  "SessionKey" text NOT NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "LastSeenAt" timestamptz NOT NULL DEFAULT now(),
  "ExpiresAt" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_AuthSessions_ProfileId" ON "AuthSessions" ("ProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AuthSessions_SessionKey" ON "AuthSessions" ("SessionKey");

CREATE TABLE IF NOT EXISTS "AuthAuditLogs" (
  "Id" uuid PRIMARY KEY,
  "ProfileId" uuid NULL,
  "EventType" text NOT NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_AuthAuditLogs_CreatedAt" ON "AuthAuditLogs" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_AuthAuditLogs_EventType" ON "AuthAuditLogs" ("EventType");

CREATE TABLE IF NOT EXISTS "PageViews" (
  "Id" bigserial PRIMARY KEY,
  "Path" text NOT NULL DEFAULT '',
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AiBatchJobs" (
  "Id" uuid PRIMARY KEY,
  "TargetType" text NOT NULL,
  "Status" text NOT NULL,
  "SelectionMode" text NOT NULL DEFAULT 'selected',
  "SelectionLabel" text NOT NULL DEFAULT '',
  "SelectionKey" text NOT NULL DEFAULT '',
  "All" boolean NOT NULL DEFAULT false,
  "AutoApply" boolean NOT NULL DEFAULT false,
  "WorkerCount" integer NULL,
  "CancelRequested" boolean NOT NULL DEFAULT false,
  "TotalCount" integer NOT NULL DEFAULT 0,
  "ProcessedCount" integer NOT NULL DEFAULT 0,
  "SucceededCount" integer NOT NULL DEFAULT 0,
  "FailedCount" integer NOT NULL DEFAULT 0,
  "Provider" text NOT NULL DEFAULT 'fake',
  "Model" text NOT NULL DEFAULT '',
  "ReasoningEffort" text NULL,
  "PromptMode" text NOT NULL DEFAULT 'default',
  "CustomPrompt" text NULL,
  "RequestedByProfileId" uuid NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "StartedAt" timestamptz NULL,
  "FinishedAt" timestamptz NULL,
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_AiBatchJobs_TargetType_Status_CreatedAt" ON "AiBatchJobs" ("TargetType", "Status", "CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_AiBatchJobs_TargetType_SelectionKey_Status" ON "AiBatchJobs" ("TargetType", "SelectionKey", "Status");

CREATE TABLE IF NOT EXISTS "AiBatchJobItems" (
  "Id" uuid PRIMARY KEY,
  "JobId" uuid NOT NULL REFERENCES "AiBatchJobs" ("Id") ON DELETE CASCADE,
  "EntityId" uuid NOT NULL,
  "Title" text NOT NULL,
  "Status" text NOT NULL,
  "FixedHtml" text NULL,
  "Error" text NULL,
  "Provider" text NULL,
  "Model" text NULL,
  "ReasoningEffort" text NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "StartedAt" timestamptz NULL,
  "FinishedAt" timestamptz NULL,
  "AppliedAt" timestamptz NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AiBatchJobItems_JobId_EntityId" ON "AiBatchJobItems" ("JobId", "EntityId");
CREATE INDEX IF NOT EXISTS "IX_AiBatchJobItems_JobId_Status" ON "AiBatchJobItems" ("JobId", "Status");

CREATE TABLE IF NOT EXISTS "VideoStorageCleanupJobs" (
  "Id" uuid PRIMARY KEY,
  "WorkId" uuid NULL,
  "WorkVideoId" uuid NULL,
  "StorageType" text NOT NULL,
  "StorageKey" text NOT NULL,
  "AttemptCount" integer NOT NULL DEFAULT 0,
  "Status" text NOT NULL,
  "LastError" text NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_VideoStorageCleanupJobs_Status" ON "VideoStorageCleanupJobs" ("Status");
CREATE INDEX IF NOT EXISTS "IX_VideoStorageCleanupJobs_CreatedAt" ON "VideoStorageCleanupJobs" ("CreatedAt");

CREATE TABLE IF NOT EXISTS "SchemaPatches" (
  "Id" text PRIMARY KEY,
  "AppliedAt" timestamptz NOT NULL DEFAULT now()
);
