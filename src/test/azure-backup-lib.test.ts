import { describe, expect, it } from 'vitest'
import {
  buildBackupBlobName,
  buildBackupId,
  buildCronEntry,
  normalizeBlobPrefix,
  parseEnvFileText,
  parseKeyValueArgs,
  resolveBackupConfig,
  shellQuote,
} from '../../scripts/azure-backup-lib.mjs'

describe('azure backup helpers', () => {
  it('parses env file lines without shell expansion', () => {
    expect(
      parseEnvFileText(`
        # comment
        FOO=bar
        export BAR="baz qux"
        EMPTY=
      `),
    ).toEqual({
      FOO: 'bar',
      BAR: 'baz qux',
      EMPTY: '',
    })
  })

  it('parses boolean and value flags', () => {
    expect(parseKeyValueArgs(['--dry-run', '--env-file', '.env.prod', '--backup-id', 'abc'])).toEqual({
      _: [],
      backupId: 'abc',
      dryRun: true,
      envFile: '.env.prod',
    })
  })

  it('builds stable blob names from a prefix and backup id', () => {
    expect(normalizeBlobPrefix('/woong/prod/')).toBe('woong/prod')
    expect(buildBackupBlobName({ prefix: 'woong/prod', backupId: '20260101T000000Z', kind: 'media' })).toBe(
      'woong/prod/20260101T000000Z/media.tar.gz',
    )
    expect(buildBackupBlobName({ prefix: 'woong/prod', backupId: '20260101T000000Z', kind: 'postgres' })).toBe(
      'woong/prod/20260101T000000Z/postgres.dump',
    )
  })

  it('formats backup ids and cron entries', () => {
    expect(buildBackupId(new Date('2026-04-18T00:00:00Z'))).toBe('20260418T090000KST')
    const cronEntry = buildCronEntry({
      backupScriptPath: '/repo/scripts/azure-backup.mjs',
      envFile: '.env.prod',
      logFile: '/repo/.docker-data/prod/azure-backup.log',
      nodeBinary: '/usr/bin/node',
      repoRoot: '/repo',
    })

    expect(cronEntry).toContain('Runs at 07:00 Asia/Seoul using the server UTC cron clock.')
    expect(cronEntry).toContain("0 22 * * *")
    expect(cronEntry).toContain("APP_ENV_FILE='.env.prod'")
    expect(cronEntry).toContain("'/usr/bin/node' '/repo/scripts/azure-backup.mjs'")
  })

  it('shell-quotes embedded apostrophes safely', () => {
    expect(shellQuote("it's fine")).toBe("'it'\\''s fine'")
  })

  it('prefers backup-specific Azure container and prefix environment names', () => {
    const config = resolveBackupConfig({
      env: {
        NODE_ENV: 'test',
        AZURE_BACKUP_CONTAINER: 'backup-container',
        AZURE_BACKUP_PREFIX: 'backup-prefix',
        AZURE_STORAGE_CONTAINER: 'generic-container',
        AZURE_STORAGE_PREFIX: 'generic-prefix',
      },
      cli: { dryRun: true },
    })

    expect(config.container).toBe('backup-container')
    expect(config.prefix).toBe('backup-prefix')
  })
})
