import base from './playwright.config'
import { defineConfig, type Project } from '@playwright/test'

const screen2Args = ['--window-position=3840,0', '--window-size=1080,1920']

type Screen2Use = {
  headless?: boolean
  launchOptions?: {
    args?: string[]
  }
} & Record<string, unknown>

const baseUse = (base.use ?? {}) as Screen2Use
const baseLaunchOptions = baseUse.launchOptions ?? {}
const baseProjects = (base.projects ?? []) as Array<Project & { use?: Screen2Use }>

export default defineConfig({
  ...base,
  use: {
    ...baseUse,
    headless: false,
    launchOptions: {
      ...baseLaunchOptions,
      args: [...(baseLaunchOptions.args ?? []), ...screen2Args],
    },
  },
  projects: baseProjects.map((project) => ({
    ...project,
    use: {
      ...(project.use ?? {}),
      headless: false,
      launchOptions: {
        ...((project.use ?? {}).launchOptions ?? {}),
        args: [...((((project.use ?? {}).launchOptions ?? {}).args ?? [])), ...screen2Args],
      },
    },
  })),
})
