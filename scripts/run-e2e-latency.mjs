import { spawn } from 'node:child_process'
import path from 'node:path'
import { writeLatencySummary } from './summarize-e2e-latency.mjs'

const rawArgs = process.argv.slice(2)
const separatorIndex = rawArgs.indexOf('--')
const playwrightArgs = separatorIndex >= 0 ? rawArgs.slice(separatorIndex + 1) : rawArgs
const playwrightBin = path.resolve('node_modules/.bin/playwright')

const playwrightExitCode = await run(playwrightBin, ['test', ...playwrightArgs])
let summaryExitCode = 0

try {
  const { jsonPath, mdPath, summary } = await writeLatencySummary()
  console.log(`Wrote ${jsonPath}`)
  console.log(`Wrote ${mdPath}`)
  console.log(`Latency artifacts: ${summary.testCount}, budget failures: ${summary.budgetFailureCount}, warnings: ${summary.warningCount}`)
  if (summary.budgetFailureCount > 0) {
    summaryExitCode = 1
  }
} catch (error) {
  summaryExitCode = 1
  console.error(error)
}

process.exitCode = playwrightExitCode || summaryExitCode

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    })

    child.on('error', (error) => {
      console.error(error)
      resolve(1)
    })

    child.on('close', (code) => {
      resolve(code ?? 1)
    })
  })
}
