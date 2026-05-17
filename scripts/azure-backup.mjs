#!/usr/bin/env node
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import {
  buildBackupBlobName,
  buildBackupId,
  normalizeBlobPrefix,
  parseEnvFileText,
  parseKeyValueArgs,
  resolveBackupConfig,
} from './azure-backup-lib.mjs'

async function readEnvFile(envFile) {
  try {
    const contents = await readFile(envFile, 'utf8')
    return parseEnvFileText(contents)
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

function printUsage() {
  console.log(`Usage:
  node scripts/azure-backup.mjs [--env-file .env.prod] [--compose-file docker-compose.prod.yml] [--backup-id ID] [--dry-run]

Environment:
  APP_ENV_FILE                     optional default env file (default: .env.prod)
  AZURE_STORAGE_CONNECTION_STRING  required
  AZURE_STORAGE_CONTAINER          optional (default: woong-blog-prod-backups)
  AZURE_STORAGE_PREFIX             optional (default: woong-blog/prod)
  POSTGRES_DB                      required
  POSTGRES_USER                    required
  POSTGRES_PASSWORD                required
  MEDIA_DATA_DIR                   optional (default: ./.docker-data/prod/media)
`)
}

async function runCommand(command, args, { cwd, env, stdinFile, stdoutFile } = {}) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  const waitForExit = new Promise((resolveExit, rejectExit) => {
    child.on('error', rejectExit)
    child.on('close', (code) => {
      if (code === 0) {
        resolveExit()
        return
      }
      rejectExit(new Error(stderr.trim() || `${command} exited with code ${code}`))
    })
  })

  const tasks = [waitForExit]

  if (stdinFile) {
    tasks.push(
      new Promise((resolvePipe, rejectPipe) => {
        const inputStream = createReadStream(stdinFile)
        inputStream.on('error', rejectPipe)
        child.stdin.on('error', rejectPipe)
        child.stdin.on('close', resolvePipe)
        inputStream.pipe(child.stdin)
      }),
    )
  } else {
    child.stdin.end()
  }

  if (stdoutFile) {
    tasks.push(
      new Promise((resolvePipe, rejectPipe) => {
        const outputStream = createWriteStream(stdoutFile)
        outputStream.on('error', rejectPipe)
        child.stdout.on('error', rejectPipe)
        outputStream.on('finish', resolvePipe)
        child.stdout.pipe(outputStream)
      }),
    )
  } else {
    child.stdout.resume()
  }

  await Promise.all(tasks)
}

async function createMediaArchive({ archivePath, mediaDir, dryRun }) {
  if (dryRun) {
    return
  }

  await runCommand('tar', ['-czf', archivePath, '-C', mediaDir, '.'])
}

async function createPostgresDump({ dumpPath, config, dryRun }) {
  if (dryRun) {
    return
  }

  await runCommand(
    'docker',
    [
      'compose',
      '--env-file',
      config.envFile,
      '-f',
      config.composeFile,
      'exec',
      '-T',
      config.dbService,
      'env',
      `PGPASSWORD=${config.postgresPassword}`,
      'pg_dump',
      '-h',
      '127.0.0.1',
      '-U',
      config.postgresUser,
      '-d',
      config.postgresDb,
      '-Fc',
    ],
    { stdoutFile: dumpPath },
  )
}

async function uploadFiles({ config, backupId, mediaArchivePath, postgresDumpPath, dryRun }) {
  if (dryRun) {
    return {}
  }

  const { BlobServiceClient } = await import('@azure/storage-blob')
  const blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString)
  const containerClient = blobServiceClient.getContainerClient(config.container)
  await containerClient.createIfNotExists()

  const mediaBlobName = buildBackupBlobName({ prefix: config.prefix, backupId, kind: 'media' })
  const postgresBlobName = buildBackupBlobName({ prefix: config.prefix, backupId, kind: 'postgres' })

  await containerClient.getBlockBlobClient(mediaBlobName).uploadFile(mediaArchivePath)
  await containerClient.getBlockBlobClient(postgresBlobName).uploadFile(postgresDumpPath)

  return { mediaBlobName, postgresBlobName }
}

async function main() {
  const cli = parseKeyValueArgs(process.argv.slice(2))
  if (cli.help) {
    printUsage()
    return
  }

  const fileEnv = await readEnvFile(cli.envFile || process.env.APP_ENV_FILE || '.env.prod')
  const mergedEnv = { ...fileEnv, ...process.env }
  const config = resolveBackupConfig({ env: mergedEnv, cli })
  const backupId = cli.backupId || config.backupId || buildBackupId()
  const tempDir = await mkdtemp(join(tmpdir(), 'woong-blog-azure-backup-'))
  const mediaArchivePath = join(tempDir, 'media.tar.gz')
  const postgresDumpPath = join(tempDir, 'postgres.dump')
  const mediaBlobName = buildBackupBlobName({
    prefix: normalizeBlobPrefix(config.prefix),
    backupId,
    kind: 'media',
  })
  const postgresBlobName = buildBackupBlobName({
    prefix: normalizeBlobPrefix(config.prefix),
    backupId,
    kind: 'postgres',
  })

  try {
    if (cli.dryRun) {
      console.log('[azure-backup] dry-run')
      console.log(`[azure-backup] env-file=${config.envFile}`)
      console.log(`[azure-backup] compose-file=${config.composeFile}`)
      console.log(`[azure-backup] backup-id=${backupId}`)
      console.log(`[azure-backup] media-dir=${resolve(config.mediaDir)}`)
      console.log(`[azure-backup] media-blob=${mediaBlobName}`)
      console.log(`[azure-backup] postgres-blob=${postgresBlobName}`)
      console.log('[azure-backup] would create media tar.gz and postgres dump, then upload both to Azure Blob Storage')
      return
    }

    await mkdir(config.mediaDir, { recursive: true })
    await createMediaArchive({ archivePath: mediaArchivePath, mediaDir: config.mediaDir, dryRun: false })
    await createPostgresDump({ dumpPath: postgresDumpPath, config, dryRun: false })
    const uploaded = await uploadFiles({
      config,
      backupId,
      mediaArchivePath,
      postgresDumpPath,
      dryRun: false,
    })

    console.log(`[azure-backup] backup-id=${backupId}`)
    console.log(`[azure-backup] media-blob=${uploaded.mediaBlobName || mediaBlobName}`)
    console.log(`[azure-backup] postgres-blob=${uploaded.postgresBlobName || postgresBlobName}`)
    console.log(`[azure-backup] container=${config.container}`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[azure-backup] failed: ${message}`)
  process.exitCode = 1
})
