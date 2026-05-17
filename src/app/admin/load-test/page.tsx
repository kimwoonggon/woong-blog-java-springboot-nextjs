import { LoadTestDashboard } from '@/components/admin/LoadTestDashboard'
import { fetchPublicBlogs } from '@/lib/api/blogs'
import { fetchPublicWorks } from '@/lib/api/works'
import { buildLoadTestTargets } from '@/lib/load-test-dashboard'

export const dynamic = 'force-dynamic'

async function loadTargetSlugs() {
  let targetLoadWarning: string | null = null
  let workSlugs: string[] = []
  let blogSlugs: string[] = []

  const [worksResult, blogsResult] = await Promise.allSettled([
    fetchPublicWorks(1, 12),
    fetchPublicBlogs(1, 12),
  ])

  if (worksResult.status === 'fulfilled') {
    workSlugs = worksResult.value.items.map((work) => work.slug).filter(Boolean)
  } else {
    targetLoadWarning = 'Work targets could not include detail pages because public works failed to load.'
  }

  if (blogsResult.status === 'fulfilled') {
    blogSlugs = blogsResult.value.items.map((blog) => blog.slug).filter(Boolean)
  } else {
    targetLoadWarning = targetLoadWarning
      ? 'Work and Study detail targets could not be loaded. List targets remain available.'
      : 'Study targets could not include detail pages because public study posts failed to load.'
  }

  return {
    targets: buildLoadTestTargets({
      workSlugs,
      blogSlugs,
    }),
    targetLoadWarning,
  }
}

export default async function AdminLoadTestPage() {
  const { targets, targetLoadWarning } = await loadTargetSlugs()

  return (
    <LoadTestDashboard targets={targets} targetLoadWarning={targetLoadWarning} />
  )
}
