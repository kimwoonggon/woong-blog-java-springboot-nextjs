#!/usr/bin/env node
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import {
  buildBackupBlobName,
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
  node scripts/azure-restore.mjs --backup-id ID --confirm [--env-file .env.prod] [--compose-file docker-compose.prod.yml] [--dry-run]

Restore downloads the selected media.tar.gz and postgres.dump from Azure Blob Storage,
then replaces the local media tree and restores the database.
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

async function downloadBlobToFile({ blobClient, filePath, dryRun }) {
  if (dryRun) {
    return
  }
  await blobClient.downloadToFile(filePath)
}

async function restoreMedia({ mediaArchivePath, mediaDir, dryRun }) {
  if (dryRun) {
    return
  }

  const resolvedMediaDir = resolve(mediaDir)
  const resolvedRepoRoot = resolve('.')
  if (resolvedMediaDir === '/' || resolvedMediaDir === resolvedRepoRoot) {
    throw new Error(`Refusing to restore into unsafe directory: ${mediaDir}`)
  }

  await rm(resolvedMediaDir, { recursive: true, force: true })
  await mkdir(resolvedMediaDir, { recursive: true })
  await runCommand('tar', ['-xzf', mediaArchivePath, '-C', resolvedMediaDir])
}

async function restoreDatabase({ dumpPath, config, dryRun }) {
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
      'pg_restore',
      '-h',
      '127.0.0.1',
      '-U',
      config.postgresUser,
      '-d',
      config.postgresDb,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
    ],
    { stdinFile: dumpPath },
  )
}

async function main() {
  const cli = parseKeyValueArgs(process.argv.slice(2))
  if (cli.help) {
    printUsage()
    return
  }

  const backupId = cli.backupId || cli._[0]
  if (!backupId) {
    throw new Error('Missing --backup-id for restore')
  }
  if (!cli.dryRun && !cli.confirm) {
    throw new Error('Refusing to restore without --confirm')
  }

  const fileEnv = await readEnvFile(cli.envFile || process.env.APP_ENV_FILE || '.env.prod')
  const mergedEnv = { ...fileEnv, ...process.env }
  const config = resolveBackupConfig({ env: mergedEnv, cli })
  const tempDir = await mkdtemp(join(tmpdir(), 'woong-blog-azure-restore-'))
  const mediaArchivePath = join(tempDir, 'media.tar.gz')
  const postgresDumpPath = join(tempDir, 'postgres.dump')
  const normalizedPrefix = normalizeBlobPrefix(config.prefix)
  const mediaBlobName = buildBackupBlobName({ prefix: normalizedPrefix, backupId, kind: 'media' })
  const postgresBlobName = buildBackupBlobName({
    prefix: normalizedPrefix,
    backupId,
    kind: 'postgres',
  })

  try {
    if (cli.dryRun) {
      console.log('[azure-restore] dry-run')
      console.log(`[azure-restore] env-file=${config.envFile}`)
      console.log(`[azure-restore] compose-file=${config.composeFile}`)
      console.log(`[azure-restore] backup-id=${backupId}`)
      console.log(`[azure-restore] media-blob=${mediaBlobName}`)
      console.log(`[azure-restore] postgres-blob=${postgresBlobName}`)
      console.log('[azure-restore] would download both blobs, replace media contents, and restore the database')
      return
    }

    const { BlobServiceClient } = await import('@azure/storage-blob')
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString)
    const containerClient = blobServiceClient.getContainerClient(config.container)
    const mediaBlobClient = containerClient.getBlockBlobClient(mediaBlobName)
    const postgresBlobClient = containerClient.getBlockBlobClient(postgresBlobName)

    await downloadBlobToFile({ blobClient: mediaBlobClient, filePath: mediaArchivePath, dryRun: false })
    await downloadBlobToFile({ blobClient: postgresBlobClient, filePath: postgresDumpPath, dryRun: false })
    await restoreMedia({ mediaArchivePath, mediaDir: config.mediaDir, dryRun: false })
    await restoreDatabase({ dumpPath: postgresDumpPath, config, dryRun: false })

    console.log(`[azure-restore] restored backup-id=${backupId}`)
    console.log(`[azure-restore] media-blob=${mediaBlobName}`)
    console.log(`[azure-restore] postgres-blob=${postgresBlobName}`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[azure-restore] failed: ${message}`)
  process.exitCode = 1
})
