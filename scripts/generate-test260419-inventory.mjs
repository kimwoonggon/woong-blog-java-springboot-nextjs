import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const outputRoot = path.join(repoRoot, 'tests', 'playwright', 'test260419')

const categoryRules = [
  ['AUTH', /\b(auth|login|session|csrf|authorization|redirect)\b/i],
  ['UPLOAD', /\b(upload|media|image|resume|pdf|video|youtube|hls|thumbnail)\b/i],
  ['DIAGRAM', /\b(mermaid|diagram|three|code block|html snippet)\b/i],
  ['EDITOR', /\b(editor|tiptap|formatting|inline|unsaved|notion|h2|heading|link|bubble|toolbar)\b/i],
  ['ADMIN', /\b(admin|dashboard|members|bulk|batch ai|site settings|pages|work|blog)\b/i],
  ['PUBLIC', /\b(public|home|works|blog|resume|contact|introduction|navbar|footer|pagination|toc|related|seo|404)\b/i],
  ['RESP', /\b(responsive|mobile|desktop|tablet|viewport|dark|a11y|accessibility|visual|layout|focus|overflow|loading|empty|error)\b/i],
]

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/')
}

function lineForIndex(source, index) {
  return source.slice(0, index).split('\n').length
}

function inferCategory(filePath, title) {
  const text = `${filePath} ${title}`
  for (const [category, pattern] of categoryRules) {
    if (pattern.test(text)) {
      return category
    }
  }

  return 'MISC'
}

function routeHints(source) {
  const routes = new Set()
  const patterns = [
    /page\.goto\(\s*['"`]([^'"`]+)['"`]/g,
    /gotoStable\([^,]+,\s*['"`]([^'"`]+)['"`]/g,
    /baseUrl}\s*([^'"`]+)['"`]/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source)) !== null) {
      const value = match[1]
      if (value.startsWith('/') && !value.includes('${')) {
        routes.add(value)
      }
    }
  }

  return [...routes].slice(0, 8)
}

function testCases() {
  const specFiles = walk(path.join(repoRoot, 'tests'))
    .filter((file) => file.endsWith('.spec.ts'))
    .sort()

  const tests = []
  for (const file of specFiles) {
    const source = read(file)
    const routes = routeHints(source)
    const regex = /\btest(?:\.(?:skip|fixme|only))?\s*\(\s*['"`]([^'"`]+)['"`]/g
    let match
    while ((match = regex.exec(source)) !== null) {
      const title = match[1].replace(/\s+/g, ' ').trim()
      const category = inferCategory(rel(file), title)
      tests.push({
        source: rel(file),
        line: lineForIndex(source, match.index),
        title,
        category,
        routes,
      })
    }
  }

  const counters = new Map()
  return tests.map((test) => {
    const next = (counters.get(test.category) ?? 0) + 1
    counters.set(test.category, next)
    return {
      id: `T260419-${test.category}-${String(next).padStart(3, '0')}`,
      ...test,
      authState: inferAuthState(test.source, test.title, test.category),
      viewport: 'desktop/tablet/mobile',
      artifactPattern: `tests/playwright/test260419/**/${path.basename(test.source, '.spec.ts')}-*.webm`,
      status: 'Planned',
    }
  })
}

function inferAuthState(source, title, category) {
  const text = `${source} ${title}`
  if (
    /admin|authenticated|storageState|feature-recording-0418|mermaid-batch-prompt-0419|mermaid-worstcase-0419|plain-baseline-0419|public-blog-inline-redirects|public-page-inline-save/i.test(text)
  ) {
    return 'admin'
  }

  return category === 'AUTH' ? 'runtime-auth' : 'public'
}

function appRoutes() {
  const files = walk(path.join(repoRoot, 'src', 'app'))
    .filter((file) => /(?:page\.tsx|layout\.tsx|route\.ts)$/.test(file))
    .sort()

  return files.map((file) => rel(file))
}

function apiExports() {
  const files = walk(path.join(repoRoot, 'src', 'lib', 'api'))
    .filter((file) => file.endsWith('.ts'))
    .sort()
  const exports = []
  for (const file of files) {
    const source = read(file)
    const regex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)/g
    let match
    while ((match = regex.exec(source)) !== null) {
      exports.push({ source: rel(file), name: match[1] ?? match[2] })
    }
  }

  return exports
}

function componentFiles() {
  return walk(path.join(repoRoot, 'src', 'components'))
    .filter((file) => file.endsWith('.tsx'))
    .sort()
    .map((file) => rel(file))
}

function markdown(inventory) {
  const lines = [
    '# test260419 Feature Inventory',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Feature TODO candidates from Playwright behavior tests: ${inventory.features.length}`,
    `- App route/layout/page files: ${inventory.appRoutes.length}`,
    `- Component files inspected: ${inventory.components.length}`,
    `- Frontend API exports inspected: ${inventory.apiExports.length}`,
    '',
    '## Category Counts',
    '',
    '| Category | Count |',
    '| --- | ---: |',
  ]

  for (const [category, count] of Object.entries(inventory.categoryCounts)) {
    lines.push(`| ${category} | ${count} |`)
  }

  lines.push(
    '',
    '## Feature TODOs',
    '',
    '| ID | Category | Auth | Viewports | Source | Feature | Routes | Artifact Pattern | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  )

  for (const feature of inventory.features) {
    const routes = feature.routes.length > 0 ? feature.routes.join('<br>') : '-'
    lines.push(`| ${feature.id} | ${feature.category} | ${feature.authState} | ${feature.viewport} | ${feature.source}:${feature.line} | ${feature.title.replaceAll('|', '\\|')} | ${routes} | ${feature.artifactPattern} | ${feature.status} |`)
  }

  return `${lines.join('\n')}\n`
}

function testList(features) {
  return [...new Set(features.map((feature) => feature.source))].sort().join('\n') + '\n'
}

function categoryCounts(features) {
  return features.reduce((counts, feature) => {
    counts[feature.category] = (counts[feature.category] ?? 0) + 1
    return counts
  }, {})
}

fs.mkdirSync(outputRoot, { recursive: true })

const features = testCases()
const inventory = {
  generatedAt: new Date().toISOString(),
  featureDefinition: 'A user-visible frontend behavior represented by a Playwright test case, deduplicated at the test-title level and enriched with route/API/component inventory context.',
  featureCount: features.length,
  categoryCounts: categoryCounts(features),
  appRoutes: appRoutes(),
  components: componentFiles(),
  apiExports: apiExports(),
  features,
}

fs.writeFileSync(path.join(outputRoot, 'feature-inventory.json'), JSON.stringify(inventory, null, 2))
fs.writeFileSync(path.join(outputRoot, 'feature-inventory.md'), markdown(inventory))
fs.writeFileSync(path.join(outputRoot, 'todolist-test260419.md'), markdown(inventory).replace('# test260419 Feature Inventory', '# test260419 Feature TODO List'))
fs.writeFileSync(path.join(outputRoot, 'test-files.txt'), testList(features))

console.log(`Generated ${features.length} feature TODO candidates in ${path.relative(repoRoot, outputRoot)}`)
