import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'

const defaultModel = process.env.CODEX_MODEL || ''
const codexCommand = process.env.CODEX_COMMAND || 'codex'
const workdir = process.env.CODEX_WORKDIR || process.cwd()
const timeoutMs = Number(process.env.CODEX_TIMEOUT_MS || 180000)
const defaultReasoningEffort = process.env.CODEX_REASONING_EFFORT || ''

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ''

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => {
      resolve(data.trim())
    })
    process.stdin.on('error', reject)
  })
}

function printUsage() {
  console.log(`Usage:
  node scripts/codex-api-test.mjs "질문할 텍스트"
  echo "질문할 텍스트" | node scripts/codex-api-test.mjs
  node scripts/codex-api-test.mjs --image ./image.png "이 이미지 설명해줘"
  node scripts/codex-api-test.mjs --image ./a.png --image ./b.jpg "두 이미지 차이 비교해줘"

Environment:
  CODEX_COMMAND    optional (default: ${codexCommand})
  CODEX_MODEL      optional${defaultModel ? ` (default: ${defaultModel})` : ''}
  CODEX_REASONING_EFFORT optional${defaultReasoningEffort ? ` (default: ${defaultReasoningEffort})` : ''}
  CODEX_WORKDIR    optional (default: current working directory)
  CODEX_TIMEOUT_MS optional (default: ${timeoutMs})
`)
}

function parseArgs(argv) {
  const args = [...argv]
  let model = defaultModel
  let reasoningEffort = defaultReasoningEffort
  const images = []

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1]
      args.splice(i, 2)
      i -= 1
      continue
    }

    if (args[i] === '--image' && args[i + 1]) {
      images.push(resolve(args[i + 1]))
      args.splice(i, 2)
      i -= 1
      continue
    }

    if (args[i] === '--reasoning' && args[i + 1]) {
      reasoningEffort = args[i + 1]
      args.splice(i, 2)
      i -= 1
    }
  }

  return {
    model,
    reasoningEffort,
    images,
    prompt: args.join(' ').trim(),
  }
}

async function ensureImagesExist(images) {
  for (const imagePath of images) {
    await access(imagePath)
  }
}

async function main() {
  const { model, reasoningEffort, images, prompt: argPrompt } = parseArgs(process.argv.slice(2))
  const stdinPrompt = process.stdin.isTTY ? '' : await readStdin()
  const prompt = argPrompt || stdinPrompt || (images.length > 0 ? 'Describe the attached image(s).' : '')

  if (images.length > 0) {
    await ensureImagesExist(images)
  }

  if (!prompt) {
    printUsage()
    process.exitCode = 1
    return
  }

  const dir = await mkdtemp(join(tmpdir(), 'codex-api-test-'))
  const outFile = join(dir, 'last-message.txt')

  try {
    const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-C', workdir, '-o', outFile, '-']
    if (model) {
      args.splice(1, 0, '-m', model)
    }
    if (reasoningEffort) {
      args.splice(1, 0, '-c', `model_reasoning_effort="${reasoningEffort}"`)
    }
    for (let i = images.length - 1; i >= 0; i -= 1) {
      args.splice(1, 0, '-i', images[i])
    }

    const child = spawn(codexCommand, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.stdin.write(prompt)
    child.stdin.end()

    const exitCode = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error(`Codex request timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      child.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        resolve(code ?? 1)
      })
    })

    if (exitCode !== 0) {
      throw new Error(stderr.trim() || `codex exited with code ${exitCode}`)
    }

    const text = await readFile(outFile, 'utf8')
    console.log(text.trim())
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Request failed: ${message}`)
  process.exitCode = 1
})
