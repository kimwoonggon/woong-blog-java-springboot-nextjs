#!/usr/bin/env node
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import process from 'node:process'
import {
  AZURE_BACKUP_CRON_MARKER_END,
  AZURE_BACKUP_CRON_MARKER_START,
  buildCronEntry,
  parseKeyValueArgs,
} from './azure-backup-lib.mjs'

function printUsage() {
  console.log(`Usage:
  node scripts/install-azure-backup-cron.mjs [--env-file .env.prod] [--log-file ./path/to/log] [--dry-run]

Installs a daily cron entry at 07:00 Asia/Seoul that runs scripts/azure-backup.mjs.
`)
}

async function getRepoRoot() {
  const child = spawn('git', ['rev-parse', '--show-toplevel'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })

  if (code !== 0) {
    throw new Error(stderr.trim() || 'Unable to determine repository root')
  }

  return stdout.trim()
}

async function readExistingCrontab() {
  const child = spawn('crontab', ['-l'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })

  if (code !== 0) {
    if (/no crontab/i.test(stderr)) {
      return ''
    }
    throw new Error(stderr.trim() || 'Unable to read crontab')
  }

  return stdout
}

function rebuildCrontab(existing, replacementBlock) {
  const lines = String(existing ?? '').split(/\r?\n/)
  const next = []
  let skipping = false

  for (const line of lines) {
    if (line === AZURE_BACKUP_CRON_MARKER_START) {
      skipping = true
      continue
    }
    if (line === AZURE_BACKUP_CRON_MARKER_END) {
      skipping = false
      continue
    }
    if (!skipping && line.trim() !== '') {
      next.push(line)
    }
  }

  if (next.length > 0) {
    next.push('')
  }
  next.push(replacementBlock)
  return `${next.join('\n').trimEnd()}\n`
}

async function writeCrontab(contents) {
  const child = spawn('crontab', ['-'], { stdio: ['pipe', 'inherit', 'inherit'] })
  child.stdin.end(contents)

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })

  if (code !== 0) {
    throw new Error('Failed to install crontab')
  }
}

async function main() {
  const cli = parseKeyValueArgs(process.argv.slice(2))
  if (cli.help) {
    printUsage()
    return
  }

  const repoRoot = await getRepoRoot()
  const nodeBinary = process.env.AZURE_BACKUP_NODE_BINARY || process.execPath
  const backupScriptPath = join(repoRoot, 'scripts/azure-backup.mjs')
  const envFile = cli.envFile || process.env.APP_ENV_FILE || '.env.prod'
  const logFile = cli.logFile || process.env.AZURE_BACKUP_LOG_FILE || join(repoRoot, '.docker-data/prod/azure-backup.log')
  await mkdir(dirname(logFile), { recursive: true })
  const cronEntry = buildCronEntry({
    backupScriptPath,
    envFile,
    logFile,
    nodeBinary,
    repoRoot,
  })

  if (cli.dryRun) {
    console.log(cronEntry)
    return
  }

  const existing = await readExistingCrontab()
  const updated = rebuildCrontab(existing, cronEntry)
  await writeCrontab(updated)
  console.log('[azure-backup-cron] installed daily backup cron at 07:00 Asia/Seoul')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[azure-backup-cron] failed: ${message}`)
  process.exitCode = 1
})
