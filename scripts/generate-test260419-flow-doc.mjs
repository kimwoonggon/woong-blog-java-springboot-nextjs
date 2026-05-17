import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const inventoryPath = path.join(repoRoot, 'tests', 'playwright', 'test260419', 'feature-inventory.json')
const outputPath = path.join(repoRoot, 'docs', 'test260419-feature-flow-map.md')
const mirrorPath = path.join(repoRoot, 'tests', 'playwright', 'test260419', 'feature-flow-map.md')

function contains(feature, pattern) {
  return pattern.test(`${feature.source} ${feature.title} ${feature.routes.join(' ')}`)
}

function pickPrimaryRoute(feature) {
  return feature.routes[0] ?? inferFrontendRoute(feature)
}

function inferFrontendRoute(feature) {
  const text = `${feature.source} ${feature.title}`
  if (/admin.*dashboard|dashboard/i.test(text)) return '/admin/dashboard'
  if (/admin.*members|members/i.test(text)) return '/admin/members'
  if (/notion/i.test(text)) return '/admin/blog/notion'
  if (/admin.*blog|blog editor|batch ai|ai fixer/i.test(text)) return '/admin/blog'
  if (/admin.*work|work editor|video/i.test(text)) return '/admin/works'
  if (/site settings|introduction|contact|resume|pages/i.test(text)) return '/admin/pages'
  if (/login|auth/i.test(text)) return '/login'
  if (/home|hero|featured|recent|navbar|footer/i.test(text)) return '/'
  if (/work/i.test(text)) return '/works'
  if (/blog|study/i.test(text)) return '/blog'
  if (/resume/i.test(text)) return '/resume'
  if (/contact/i.test(text)) return '/contact'
  if (/introduction/i.test(text)) return '/introduction'
  return '-'
}

function flowFor(feature) {
  const text = `${feature.source} ${feature.title}`.toLowerCase()

  if (contains(feature, /csrf|logout|session|local admin|test-login|login|auth/i)) {
    return {
      api: '/api/auth/*',
      endpoint: 'Identity endpoints: LoginEndpoint, TestLoginEndpoint, GetSessionEndpoint, GetCsrfEndpoint, LogoutEndpoint',
      handler: 'Mostly direct endpoint logic; GetAdminMembers uses GetAdminMembersQueryHandler',
      service: 'IIdentityInteractionService/IdentityInteractionService, AuthRecorder, ASP.NET auth middleware',
      dto: 'LoginRequest, LogoutRequest, TestLoginRequest, session/csrf response DTOs',
    }
  }

  if (contains(feature, /admin members|members page/i)) {
    return {
      api: 'GET /api/admin/members',
      endpoint: 'GetAdminMembersEndpoint',
      handler: 'GetAdminMembersQueryHandler',
      service: 'IAdminMemberService/AdminMemberService',
      dto: 'AdminMemberListItemDto',
    }
  }

  if (contains(feature, /dashboard|summary cards|recent content|collections/i)) {
    return {
      api: 'GET /api/admin/dashboard/summary',
      endpoint: 'GetDashboardSummaryEndpoint',
      handler: 'GetDashboardSummaryQueryHandler',
      service: 'IAdminDashboardService/AdminDashboardService',
      dto: 'AdminDashboardSummaryDto',
    }
  }

  if (contains(feature, /admin-ai|batch ai|ai batch|batch panel|ai fix|ai fixer|runtime config|codex backend|provider|cancel queued|cancel job/i)) {
    return {
      api: '/api/admin/ai/*',
      endpoint: 'AI endpoints: RuntimeConfigEndpoint, BlogFixEndpoints, BatchJobEndpoints, WorkEnrichEndpoint',
      handler: 'Direct endpoint-to-IAiAdminService calls',
      service: 'IAiAdminService/AiAdminService, IBlogAiFixService/BlogAiFixService, AiBatchJobProcessor',
      dto: 'AiApiContracts: BlogFixRequest/Response, BlogFixBatchJob* DTOs, WorkEnrichRequest/Response',
    }
  }

  if (contains(feature, /resume.*upload|resume pdf|pdf upload|non-pdf|resume editor/i)) {
    return {
      api: 'POST /api/admin/media/assets, PUT /api/admin/site-settings, GET /api/public/resume',
      endpoint: 'UploadAssetEndpoint, UpdateSiteSettingsEndpoint, GetResumeEndpoint',
      handler: 'UpdateSiteSettingsCommandHandler, GetResumeQueryHandler',
      service: 'IMediaAssetService/MediaAssetService, IAdminSiteSettingsService/AdminSiteSettingsService, IPublicSiteService/PublicSiteService',
      dto: 'UpdateSiteSettingsRequest/Command, AdminSiteSettingsDto, ResumeDto',
    }
  }

  if (feature.category === 'UPLOAD') {
    return {
      api: 'POST /api/admin/media/assets, followed by the owning blog/work/page mutation',
      endpoint: 'UploadAssetEndpoint plus Create/Update Blog, Work, Page, or Site Settings endpoint',
      handler: 'Owning mutation handler where persisted content changes; upload endpoint calls service directly',
      service: 'IMediaAssetService/MediaAssetService plus owning command store/service',
      dto: 'Upload response contract, Asset entity fields, owning request/command DTO',
    }
  }

  if (contains(feature, /site settings|owner|tagline|social|facebook|instagram|github|linkedin/i)) {
    return {
      api: 'GET/PUT /api/admin/site-settings, GET /api/public/site-settings',
      endpoint: 'GetAdminSiteSettingsEndpoint, UpdateSiteSettingsEndpoint, GetSiteSettingsEndpoint',
      handler: 'GetAdminSiteSettingsQueryHandler, UpdateSiteSettingsCommandHandler, GetSiteSettingsQueryHandler',
      service: 'IAdminSiteSettingsService/AdminSiteSettingsService, IPublicSiteService/PublicSiteService',
      dto: 'UpdateSiteSettingsRequest/Command, AdminSiteSettingsDto, SiteSettingsDto',
    }
  }

  if (contains(feature, /home page editor|introduction|contact|inline page|admin pages|page save|Content \(HTML\/Text\)/i)) {
    return {
      api: 'GET /api/admin/pages, PUT /api/admin/pages, GET /api/public/pages/{slug}',
      endpoint: 'GetAdminPagesEndpoint, UpdatePageEndpoint, GetPageBySlugEndpoint',
      handler: 'GetAdminPagesQueryHandler, UpdatePageCommandHandler, GetPageBySlugQueryHandler',
      service: 'IPageQueryStore/PageQueryStore, IPageCommandStore/PageCommandStore',
      dto: 'GetAdminPagesQuery, AdminPageListItemDto, UpdatePageRequest/Command, PageDto',
    }
  }

  if (contains(feature, /video|youtube|mp4|hls|thumbnail|work video/i)) {
    return {
      api: '/api/admin/works/{id}/videos/*, GET /api/public/works/{slug}',
      endpoint: 'WorkVideoEndpoints, GetWorkBySlugEndpoint',
      handler: 'Work video endpoints call IWorkVideoService directly; detail read uses GetWorkBySlugQueryHandler',
      service: 'IWorkVideoService/WorkVideoService, IVideoObjectStorage, IWorkQueryStore/WorkQueryStore',
      dto: 'WorkVideoDto, VideoUploadTargetResult, WorkVideosMutationResult, WorkDetailDto',
    }
  }

  if (contains(feature, /work|works|작업/i)) {
    if (contains(feature, /create|publish|draft|toggle|edit|delete|metadata|category|period|tag|admin/i)) {
      return {
        api: 'GET/POST/PUT/DELETE /api/admin/works',
        endpoint: 'GetAdminWorksEndpoint, GetAdminWorkByIdEndpoint, CreateWorkEndpoint, UpdateWorkEndpoint, DeleteWorkEndpoint',
        handler: 'GetAdminWorksQueryHandler, GetAdminWorkByIdQueryHandler, CreateWorkCommandHandler, UpdateWorkCommandHandler, DeleteWorkCommandHandler',
        service: 'IWorkQueryStore/WorkQueryStore, IWorkCommandStore/WorkCommandStore',
        dto: 'AdminWorkListItemDto, AdminWorkDetailDto, CreateWorkRequest/Command, UpdateWorkRequest/Command, AdminMutationResult',
      }
    }

    return {
      api: 'GET /api/public/works, GET /api/public/works/{slug}',
      endpoint: 'GetWorksEndpoint, GetWorkBySlugEndpoint',
      handler: 'GetWorksQueryHandler, GetWorkBySlugQueryHandler',
      service: 'IWorkQueryStore/WorkQueryStore',
      dto: 'PagedWorksDto, WorkCardDto, WorkDetailDto, WorkVideoDto',
    }
  }

  if (contains(feature, /blog|study|post|글/i)) {
    if (contains(feature, /create|publish|draft|toggle|edit|delete|tag|admin|notion|batch/i)) {
      return {
        api: 'GET/POST/PUT/DELETE /api/admin/blogs',
        endpoint: 'GetAdminBlogsEndpoint, GetAdminBlogByIdEndpoint, CreateBlogEndpoint, UpdateBlogEndpoint, DeleteBlogEndpoint',
        handler: 'GetAdminBlogsQueryHandler, GetAdminBlogByIdQueryHandler, CreateBlogCommandHandler, UpdateBlogCommandHandler, DeleteBlogCommandHandler',
        service: 'IBlogQueryStore/BlogQueryStore, IBlogCommandStore/BlogCommandStore',
        dto: 'AdminBlogListItemDto, AdminBlogDetailDto, CreateBlogRequest/Command, UpdateBlogRequest/Command, AdminMutationResult',
      }
    }

    return {
      api: 'GET /api/public/blogs, GET /api/public/blogs/{slug}',
      endpoint: 'GetBlogsEndpoint, GetBlogBySlugEndpoint',
      handler: 'GetBlogsQueryHandler, GetBlogBySlugQueryHandler',
      service: 'IBlogQueryStore/BlogQueryStore',
      dto: 'PagedBlogsDto, BlogCardDto, BlogDetailDto',
    }
  }

  if (contains(feature, /home|hero|featured|recent|cta|navbar|footer|layout|loading|dark|theme|responsive|a11y|visual|focus|overflow|seo|404/i)) {
    return {
      api: 'GET /api/public/home and/or client-only route rendering',
      endpoint: 'GetHomeEndpoint where page data is needed; otherwise no ASP.NET endpoint',
      handler: 'GetHomeQueryHandler where page data is needed',
      service: 'IPublicHomeService/PublicHomeService and public React components',
      dto: 'HomeDto, WorkCardDto, BlogCardDto, or N/A for client-only UI behavior',
    }
  }

  return {
    api: 'N/A or route initial data fetch',
    endpoint: 'N/A or inferred from route',
    handler: 'N/A',
    service: 'Client-side React component behavior',
    dto: 'N/A',
  }
}

function escape(value) {
  return String(value).replaceAll('|', '\\|').replace(/\n/g, '<br>')
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
const lines = [
  '# test260419 Frontend Feature Flow Map',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  `Total frontend behavior features inventoried: ${inventory.features.length}`,
  '',
  'This document maps each frontend behavior to the likely request path through Next.js/browser code and the ASP.NET Core backend. “Endpoint” means Minimal API endpoint unless explicitly named as a controller. Several visual-only features do not call ASP.NET after initial page data load; those are marked as client-only or initial data fetch.',
  '',
  '## Numbered Feature Flow Table',
  '',
  '| # | Feature ID | Category | Frontend source | User behavior | Frontend route | API request | ASP.NET endpoint/controller | Handler | Store/service | DTO/contracts |',
  '| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
]

inventory.features.forEach((feature, index) => {
  const flow = flowFor(feature)
  lines.push([
    index + 1,
    feature.id,
    feature.category,
    `${feature.source}:${feature.line}`,
    escape(feature.title),
    escape(pickPrimaryRoute(feature)),
    escape(flow.api),
    escape(flow.endpoint),
    escape(flow.handler),
    escape(flow.service),
    escape(flow.dto),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
})

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`)
fs.writeFileSync(mirrorPath, `${lines.join('\n')}\n`)
console.log(`Wrote ${inventory.features.length} feature flow rows to ${path.relative(repoRoot, outputPath)}`)
