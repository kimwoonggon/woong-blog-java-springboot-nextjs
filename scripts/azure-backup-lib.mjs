import process from 'node:process'

export const AZURE_BACKUP_CRON_SCHEDULE = '0 22 * * *'
export const AZURE_BACKUP_CRON_MARKER_START = '# Woong Blog Azure backup cron start'
export const AZURE_BACKUP_CRON_MARKER_END = '# Woong Blog Azure backup cron end'

export function normalizeBlobPrefix(prefix) {
  return String(prefix ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/')
}

export function buildBackupId(date = new Date()) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hour = String(kstDate.getUTCHours()).padStart(2, '0')
  const minute = String(kstDate.getUTCMinutes()).padStart(2, '0')
  const second = String(kstDate.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hour}${minute}${second}KST`
}

export function buildBackupBlobName({ prefix, backupId, kind }) {
  const normalizedPrefix = normalizeBlobPrefix(prefix)
  const root = normalizedPrefix ? `${normalizedPrefix}/${backupId}` : backupId

  if (kind === 'media') {
    return `${root}/media.tar.gz`
  }

  if (kind === 'postgres') {
    return `${root}/postgres.dump`
  }

  throw new Error(`Unsupported backup kind: ${kind}`)
}

export function shellQuote(value) {
  const text = String(value ?? '')
  return `'${text.replace(/'/g, `'\\''`)}'`
}

export function buildCronEntry({
  backupScriptPath,
  envFile,
  logFile,
  nodeBinary,
  repoRoot,
}) {
  return [
    AZURE_BACKUP_CRON_MARKER_START,
    '# Runs at 07:00 Asia/Seoul using the server UTC cron clock.',
    `${AZURE_BACKUP_CRON_SCHEDULE} cd ${shellQuote(repoRoot)} && APP_ENV_FILE=${shellQuote(envFile)} ${shellQuote(nodeBinary)} ${shellQuote(backupScriptPath)} >> ${shellQuote(logFile)} 2>&1`,
    AZURE_BACKUP_CRON_MARKER_END,
  ].join('\n')
}

export function parseEnvFileText(text) {
  const env = {}
  const lines = String(text ?? '').split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line
    const equalsIndex = normalized.indexOf('=')
    if (equalsIndex < 0) {
      continue
    }

    const key = normalized.slice(0, equalsIndex).trim()
    if (!key) {
      continue
    }

    let value = normalized.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

export function parseKeyValueArgs(argv) {
  const parsed = { _: [] }
  const args = [...argv]

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--') {
      parsed._.push(...args.slice(i + 1))
      break
    }

    if (!arg.startsWith('--')) {
      parsed._.push(arg)
      continue
    }

    const [flag, inlineValue] = arg.split('=', 2)
    const needsValue = !['--dry-run', '--confirm', '--help'].includes(flag)
    let value = inlineValue

    if (needsValue && value === undefined) {
      const next = args[i + 1]
      if (next === undefined || String(next).startsWith('--')) {
        throw new Error(`Missing value for ${flag}`)
      }
      value = next
      i += 1
    }

    switch (flag) {
      case '--dry-run':
        parsed.dryRun = true
        break
      case '--confirm':
        parsed.confirm = true
        break
      case '--help':
        parsed.help = true
        break
      case '--env-file':
        parsed.envFile = value
        break
      case '--compose-file':
        parsed.composeFile = value
        break
      case '--db-service':
        parsed.dbService = value
        break
      case '--media-dir':
        parsed.mediaDir = value
        break
      case '--backup-id':
        parsed.backupId = value
        break
      case '--container':
        parsed.container = value
        break
      case '--prefix':
        parsed.prefix = value
        break
      case '--log-file':
        parsed.logFile = value
        break
      case '--node-bin':
        parsed.nodeBinary = value
        break
      default:
        parsed._.push(arg)
        break
    }
  }

  return parsed
}

export function resolveBackupConfig({
  env = process.env,
  cli = {},
  defaultEnvFile = '.env.prod',
  defaultComposeFile = 'docker-compose.prod.yml',
  defaultDbService = 'db',
  defaultContainer = 'woong-blog-prod-backups',
  defaultPrefix = 'woong-blog/prod',
  defaultLogFile = './.docker-data/prod/azure-backup.log',
} = {}) {
  const envFile = cli.envFile || env.APP_ENV_FILE || defaultEnvFile
  const composeFile = cli.composeFile || env.AZURE_BACKUP_COMPOSE_FILE || defaultComposeFile
  const dbService = cli.dbService || env.AZURE_BACKUP_DB_SERVICE || defaultDbService
  const mediaDir = cli.mediaDir || env.MEDIA_DATA_DIR || './.docker-data/prod/media'
  const container = cli.container || env.AZURE_BACKUP_CONTAINER || env.AZURE_STORAGE_CONTAINER || defaultContainer
  const prefix = cli.prefix || env.AZURE_BACKUP_PREFIX || env.AZURE_STORAGE_PREFIX || defaultPrefix
  const logFile = cli.logFile || env.AZURE_BACKUP_LOG_FILE || defaultLogFile
  const nodeBinary = cli.nodeBinary || env.AZURE_BACKUP_NODE_BINARY || 'node'
  const backupId = cli.backupId || env.AZURE_BACKUP_ID || buildBackupId()
  const postgresDb = env.POSTGRES_DB || 'portfolio'
  const postgresUser = env.POSTGRES_USER || 'portfolio'
  const postgresPassword = env.POSTGRES_PASSWORD || ''

  const required = []
  if (!cli.dryRun && !env.POSTGRES_DB) {
    required.push('POSTGRES_DB')
  }
  if (!cli.dryRun && !env.POSTGRES_USER) {
    required.push('POSTGRES_USER')
  }
  if (!cli.dryRun && !env.POSTGRES_PASSWORD) {
    required.push('POSTGRES_PASSWORD')
  }
  if (!cli.dryRun && !env.AZURE_STORAGE_CONNECTION_STRING) {
    required.push('AZURE_STORAGE_CONNECTION_STRING')
  }

  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`)
  }

  return {
    backupId,
    composeFile,
    container,
    dbService,
    envFile,
    logFile,
    mediaDir,
    nodeBinary,
    postgresDb,
    postgresPassword,
    postgresUser,
    prefix,
    storageConnectionString: env.AZURE_STORAGE_CONNECTION_STRING,
  }
}
