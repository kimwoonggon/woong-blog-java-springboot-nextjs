# Mermaid 영향 범위 리포트 - 2026-04-19

## Executive Summary

Mermaid 문제는 단순히 “diagram renderer가 하나 추가됐다” 수준이 아니다. Mermaid syntax는 `User->>Frontend`, `A --> B`, `participant`, `sequenceDiagram`처럼 HTML parser, markdown fence, code block, excerpt 생성, Next.js App Router prefetch 경로와 쉽게 충돌할 수 있다.

이번 리포트의 결론은 Mermaid를 **명시적 Tiptap node**로만 유지해야 한다는 것이다.

공식 지원 경로:

```text
/mermaid 또는 toolbar Mermaid button
  -> Tiptap mermaidBlock
  -> 저장 HTML: <mermaid-block data-code="...">
  -> public render: MermaidRenderer
```

지원하지 않는 경로:

```text
```mermaid ... ```
```sequenceDiagram ... ```
<pre><code class="language-mermaid">...</code></pre>
paragraph 안에 들어간 Mermaid fence
```

이유는 Mermaid 자동 추론이 기존 code block, public card/list, related navigation, backend excerpt, Next.js RSC prefetch와 결합되면 CPU 100%, memory 증가, 504 gateway timeout, frontend container OOM으로 번질 수 있기 때문이다.

## 현재 선택한 독립성 경계

Mermaid-aware 코드가 있어도 되는 곳:

- `src/components/admin/tiptap/MermaidBlock.ts`
- `src/components/admin/tiptap/MermaidComponent.tsx`
- `src/components/content/MermaidRenderer.tsx`
- `src/lib/content/mermaid-content.ts`
- `src/components/content/InteractiveRenderer.tsx`의 Mermaid segment dispatch 부분

Mermaid syntax를 직접 해석하면 안 되는 곳:

- public blog/work cards
- related pagination
- prev/next navigation
- 일반 code block renderer
- 일반 paragraph renderer
- backend generic HTML strip/excerpt logic, 단 explicit `<mermaid-block>` 제거만 허용

## Impact Map

### 1. Tiptap 입력 경로

파일:

- `src/components/admin/TiptapEditor.tsx:59-66`
- `src/components/admin/tiptap/Commands.ts:101-108`
- `src/components/admin/tiptap/MermaidBlock.ts:5-41`
- `src/components/admin/tiptap/MermaidComponent.tsx:8-61`

현재 code:

```tsx
// src/components/admin/TiptapEditor.tsx:59-66
handlePaste: (_view, event) => {
    if (event.clipboardData?.files?.[0]?.type.startsWith('image/')) {
        void handleImageUpload(event.clipboardData.files[0])
        return true
    }

    return false
},
```

```ts
// src/components/admin/tiptap/Commands.ts:101-108
{
    title: 'Mermaid Diagram',
    description: 'Insert an editable Mermaid diagram block.',
    shortcuts: ['m', 'd'],
    icon: 'mermaid',
    command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).insertContent({ type: 'mermaidBlock' }).run()
    },
},
```

영향:

- `/mermaid` slash command는 명시적으로 Mermaid block을 만든다.
- paste된 plain text fence는 더 이상 Mermaid로 자동 변환하지 않는다.
- 이 결정은 Tiptap의 기존 ` ``` ` code block input rule과 충돌하지 않기 위해 필요하다.

최악의 경우:

- paste fence 자동 변환을 유지하면, 사용자가 일반 code sample을 붙여넣었는데 Mermaid node로 바뀔 수 있다.
- code block input rule과 Mermaid conversion이 동시에 작동하면 editor state가 꼬이고 저장 HTML이 예측 불가능해진다.
- admin edit page는 열리지만 public 저장 결과가 renderer와 충돌할 수 있다.

### 2. Mermaid helper 경로

파일:

- `src/lib/content/mermaid-content.ts:1-96`

현재 code:

```ts
// src/lib/content/mermaid-content.ts:1-3
export type MermaidContentSegment =
  | { type: 'html'; html: string }
  | { type: 'mermaid'; code: string }
```

```ts
// src/lib/content/mermaid-content.ts:17-19
export function stripMermaidForExcerpt(value: string) {
  return stripCustomMermaidBlocks(value)
}
```

```ts
// src/lib/content/mermaid-content.ts:34-49
function findTagEnd(htmlContent: string, startIndex: number) {
  let quote: '"' | "'" | null = null

  for (let index = startIndex; index < htmlContent.length; index += 1) {
    const character = htmlContent[index]
    if ((character === '"' || character === "'") && htmlContent[index - 1] !== '\\') {
      quote = quote === character ? null : quote ?? character
      continue
    }

    if (character === '>' && !quote) {
      return index
    }
  }

  return -1
}
```

```ts
// src/lib/content/mermaid-content.ts:52-96
function splitCustomMermaidBlocks(htmlContent: string): MermaidContentSegment[] {
  ...
  const openingTag = htmlContent.slice(start, openingEnd + 1)
  const code = decodeBasicHtmlEntities(extractAttribute(openingTag, 'data-code'))
  segments.push({ type: 'mermaid', code })
  ...
}

export function splitMermaidContent(htmlContent: string): MermaidContentSegment[] {
  return splitCustomMermaidBlocks(htmlContent)
}

export function containsMermaidSyntax(htmlContent: string) {
  return htmlContent.toLowerCase().includes('<mermaid-block')
}
```

영향:

- helper는 explicit `<mermaid-block>`만 해석한다.
- `data-code` 안의 `>`는 quote-aware `findTagEnd`가 처리한다.
- `User->>Frontend`, `A --> B` 같은 Mermaid arrow syntax를 HTML tag end로 오인하지 않는다.

최악의 경우:

- helper가 regex `<mermaid-block\b([^>]*)>` 같은 방식으로 돌아가면 `data-code` 안의 `>`를 tag end로 잘못 판단한다.
- 그 결과 Mermaid block segment가 중간에서 잘리고, 남은 HTML이 다시 `InteractiveRenderer`로 들어가 재귀/과다 렌더가 생길 수 있다.
- 잘못 잘린 HTML segment가 sanitizer나 React render에 들어가면 slug page 전체가 느려지거나 멈출 수 있다.

### 3. Public renderer 경로

파일:

- `src/components/content/InteractiveRenderer.tsx:100-138`
- `src/components/content/MermaidRenderer.tsx:28-101`

현재 code:

```tsx
// src/components/content/InteractiveRenderer.tsx:106-121
const hasWorkVideoEmbed = hasWorkVideoEmbeds(processedHtml)
const hasHtmlSnippet = processedHtml.includes('html-snippet')
const hasThreeJsBlock = processedHtml.includes('three-js-block')
const hasMermaidBlock = containsMermaidSyntax(processedHtml)

if (hasWorkVideoEmbed) {
    return renderVideoSegments(splitWorkVideoEmbedContent(processedHtml), workVideos)
}

if (hasMermaidBlock) {
    return (
        <div className="prose prose-lg max-w-none space-y-6 dark:prose-invert">
            {splitMermaidContent(processedHtml).map((segment, index) => {
                if (segment.type === 'mermaid') {
                    return <MermaidRenderer key={`mermaid-${index}`} code={segment.code} />
                }
```

```tsx
// src/components/content/MermaidRenderer.tsx:46-58
const renderDiagram = async () => {
  try {
    const mod = await import('mermaid')
    const mermaid = (mod.default ?? mod) as MermaidModule

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: getTheme(),
      fontFamily: 'inherit',
    })

    const result = await mermaid.render(`mermaid-${reactId}`, diagram)
```

영향:

- `InteractiveRenderer`는 explicit `<mermaid-block>`이 있을 때만 Mermaid path로 들어간다.
- `MermaidRenderer`는 client component이며 browser에서만 Mermaid package를 dynamic import한다.
- Server Component에서 Mermaid package를 직접 import하지 않는다.

최악의 경우:

- `containsMermaidSyntax`가 `language-mermaid` 또는 ` ```mermaid`까지 탐지하면, 일반 code block/paragraph도 Mermaid renderer path로 들어간다.
- HTML segment를 다시 `InteractiveRenderer`로 넘기는 구조가 잘못된 segment split과 결합되면 recursive render가 커진다.
- MermaidRenderer가 여러 related/prefetch route에서 동시에 mount되면 client CPU와 memory가 급증한다.

### 4. Public work/blog detail 경로

파일:

- `src/app/(public)/works/[slug]/page.tsx:156-185`
- `src/app/(public)/blog/[slug]/page.tsx:166-196`

현재 code:

```tsx
// src/app/(public)/works/[slug]/page.tsx:156
<InteractiveRenderer html={contentHtml} workVideos={orderedVideos} />
```

```tsx
// src/app/(public)/works/[slug]/page.tsx:167-182
<Link
    href={`/works/${newerWork.slug}${...}`}
    prefetch={false}
...
<Link
    href={`/works/${olderWork.slug}${...}`}
    prefetch={false}
```

```tsx
// src/app/(public)/blog/[slug]/page.tsx:178-193
<Link
    href={`/blog/${newerBlog.slug}${...}`}
    prefetch={false}
...
<Link
    href={`/blog/${olderBlog.slug}${...}`}
    prefetch={false}
```

영향:

- public detail에서 본문 Mermaid block은 `InteractiveRenderer`로 들어간다.
- prev/next는 `prefetch={false}`라 viewport 진입만으로 다음 slug RSC를 가져오지 않는다.

최악의 경우:

- prefetch가 켜져 있으면 Mermaid detail 하나를 열었을 뿐인데 주변 slug들이 `_rsc`로 연쇄 서버 렌더된다.
- related page가 많은 상태에서 Mermaid 포함 post가 여러 개 있으면 frontend container가 CPU 100%로 유지될 수 있다.
- nginx 입장에서는 frontend upstream이 응답하지 않아 504 gateway timeout이 난다.

### 5. Related/card/list 경로

파일:

- `src/components/content/RelatedContentList.tsx:178-188`
- `src/app/(public)/blog/page.tsx:183-188`
- `src/app/(public)/works/page.tsx:132-138`

현재 code:

```tsx
// src/components/content/RelatedContentList.tsx:178-184
<Link
  key={item.id}
  href={`${hrefBase}/${item.slug}?relatedPage=${currentPage}`}
  prefetch={false}
  className="group block h-full"
  data-testid={`${testIdBase}-card`}
```

```tsx
// src/app/(public)/blog/page.tsx:183-188
<Link
    key={blog.id}
    href={`/blog/${blog.slug}?returnTo=${returnTo}&relatedPage=${page}`}
    prefetch={false}
    className="group/card block h-full"
    data-testid="blog-card"
```

```tsx
// src/app/(public)/works/page.tsx:132-138
<Link
    key={work.id}
    href={`/works/${work.slug}?returnTo=${returnTo}&relatedPage=${page}`}
    prefetch={false}
    className="group/card block h-full"
    data-testid="work-card"
```

영향:

- public list/card/related list는 Mermaid renderer를 직접 호출하지 않는다.
- card는 title/excerpt/tags만 표시한다.
- `prefetch={false}`로 dynamic detail route background load를 막는다.

Next.js rendering 주의:

- Next.js App Router `<Link>` prefetch는 production에서 viewport에 들어온 link route/data를 background load한다.
- 목록에 detail link가 많으면 많은 `_rsc` 요청이 발생할 수 있다.
- Mermaid detail route는 client Mermaid chunk와 detail data가 결합되므로 prefetch를 끄는 것이 안정적이다.

최악의 경우:

- public list에 Mermaid 포함 posts가 많고 prefetch가 켜져 있으면 list 렌더 직후 다수 detail RSC가 동시 요청된다.
- 각 detail이 related list를 포함하면 다시 related detail prefetch로 번질 수 있다.
- 결과적으로 CPU 100%, memory 증가, 504 timeout, frontend container crash로 이어질 수 있다.

### 6. Backend excerpt 경로

파일:

- `backend/src/WoongBlog.Api/Modules/Content/Common/Application/Support/AdminContentText.cs:13-28`
- `backend/src/WoongBlog.Api/Modules/Content/Common/Application/Support/AdminContentJson.cs:35-69`

현재 code:

```csharp
// AdminContentText.cs:13-28
public static string GenerateExcerpt(string html)
{
    if (string.IsNullOrWhiteSpace(html))
    {
        return string.Empty;
    }

    var withoutMermaidBlocks = System.Text.RegularExpressions.Regex.Replace(
        html,
        "<mermaid-block\\b[\\s\\S]*?</mermaid-block>",
        " ",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    var text = System.Text.RegularExpressions.Regex.Replace(withoutMermaidBlocks, "<[^>]*>", " ");
    text = System.Text.RegularExpressions.Regex.Replace(text, "\\s+", " ").Trim();
    return text.Length <= 160 ? text : $"{text[..160].Trim()}...";
}
```

영향:

- explicit `<mermaid-block>`은 excerpt에서 제거된다.
- generic markdown/code fence는 Mermaid로 추론하지 않는다.
- public card/list에는 Mermaid block source가 노출되지 않아야 한다.

최악의 경우:

- Mermaid source가 excerpt에 들어가면 public cards/search/list가 Mermaid syntax를 텍스트로 표시한다.
- `data-code="... User->>Frontend ..."` 안의 `>` 때문에 HTML strip regex가 깨질 수 있다.
- card/list의 텍스트 자체가 커지고, 검색/content filtering에도 노이즈가 들어간다.

## Worst-Case Failure Scenarios

### Scenario 1: `data-code` arrow parsing failure

조건:

```html
<mermaid-block data-code="sequenceDiagram
User->>Frontend: Login
A --> B"></mermaid-block>
```

위험:

- `>`를 HTML tag end로 오인하면 opening tag를 중간에서 잘라낸다.
- renderer segment가 깨지고 HTML segment recursion이 늘어난다.
- public slug page가 느려지거나 멈춘다.

방어:

- `findTagEnd`는 quote 내부의 `>`를 tag end로 보지 않는다.
- Mermaid는 `<mermaid-block>`만 split한다.

### Scenario 2: public detail prefetch cascade

조건:

- `/works/[slug]`에 Mermaid block 있음
- related list/prev-next/list card가 prefetch enabled
- 많은 detail links가 viewport에 있음

위험:

- Next.js가 다수 `_rsc` 요청을 background로 발생시킨다.
- Mermaid 포함 detail들이 연쇄 서버 렌더된다.
- frontend container CPU가 100% 근처로 유지되고 memory가 증가한다.
- nginx가 upstream response header를 못 받아 504를 반환한다.

방어:

- related, prev/next, public card links에 `prefetch={false}`를 적용한다.

### Scenario 3: excerpt source leak

조건:

- Mermaid block이 content HTML에 포함됨
- backend excerpt 생성이 Mermaid block을 제거하지 않음

위험:

- public cards에 `sequenceDiagram`, `data-code`, `User->>Frontend`가 노출된다.
- HTML strip regex가 `>`로 깨져 excerpt가 오염된다.

방어:

- `AdminContentText.GenerateExcerpt`에서 `<mermaid-block>`을 먼저 제거한다.

### Scenario 4: admin works but public slug fails

조건:

- admin editor preview는 client-only isolated view
- public slug는 related list, prev/next, server data fetching, RSC, table of contents를 함께 렌더링

위험:

- admin에서는 정상인데 public slug에서만 OOM/504가 발생한다.
- 원인은 Mermaid renderer 자체가 아니라 public shell과의 결합일 수 있다.

방어:

- Mermaid parsing/rendering은 content segment에만 묶고 navigation/list/prefetch와 분리한다.

### Scenario 5: shorthand/code block 오인

조건:

```markdown
```sequenceDiagram
User->>Frontend: Login
```
```

위험:

- markdown language name을 Mermaid diagram type으로 오인하면 일반 code block 기능이 깨진다.
- `bash`, `typescript`, `json`, custom DSL까지 오탐할 가능성이 커진다.

방어:

- Mermaid는 `/mermaid` 또는 toolbar button만 공식 지원한다.
- code block language를 보고 Mermaid로 추론하지 않는다.

## Confirmed Facts vs Hypotheses

### Confirmed

- frontend container가 CPU 100% 근처와 약 1.9GiB memory를 사용한 상태가 있었다.
- nginx logs에 `_rsc` 요청이 대량으로 찍혔다.
- nginx logs에 504 upstream timeout이 있었다.
- direct public Mermaid work slug 로드가 이전에 OOM/timeout을 유발했다.
- admin editor preview는 상대적으로 정상 동작했다.
- `prefetch={false}` 후 public independence test는 통과했다.

### Hypotheses

- CPU 100% 유지의 직접 원인은 Next.js RSC prefetch cascade와 Mermaid detail rendering의 결합일 가능성이 높다.
- Mermaid parser가 `>`를 잘못 처리할 경우 recursive render 부담을 키울 수 있다.
- excerpt/card 오염은 gateway timeout의 직접 원인보다는 list/card/search 불안정과 prefetch trigger 증가에 기여할 수 있다.

## Recommended Independence Boundary

유지할 Mermaid-aware code:

- `src/components/admin/tiptap/MermaidBlock.ts`
- `src/components/admin/tiptap/MermaidComponent.tsx`
- `src/components/content/MermaidRenderer.tsx`
- `src/lib/content/mermaid-content.ts`
- `InteractiveRenderer`의 dispatch layer

금지할 Mermaid inference:

- 일반 code block language 추론
- paragraph text 추론
- paste fence 자동 변환
- `sequenceDiagram` shorthand 추론
- public card/list에서 Mermaid syntax 해석
- related/navigation에서 Mermaid syntax 해석

## Verification Checklist

필수 확인:

- `npm run typecheck`
- `npm run lint`
- Mermaid helper/unit tests
- backend excerpt tests
- public Mermaid independence Playwright
- Docker frontend CPU/memory idle 확인
- Mermaid 포함 `/works/[slug]` 반복 로드 후 frontend container `Up` 확인

