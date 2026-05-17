import { getDomainUrl } from '#app/utils/misc.tsx'
import { type SEOHandle, type SitemapEntry } from '#app/utils/seo.ts'

type ServerBuildRoute = {
	id: string
	parentId?: string
	path?: string
	index?: boolean
	module?: {
		handle?: unknown
	}
}

type ServerBuildRoutes = Record<string, ServerBuildRoute | undefined>

const hiddenPathPrefixes = ['admin', 'settings', 'resources']
const hiddenRoutePrefixes = [
	'routes/_auth/',
	'routes/_seo/',
	'routes/admin/',
	'routes/settings/',
	'routes/resources/',
]

export function generateRobotsTxt({ request }: { request: Request }) {
	const sitemapUrl = `${getDomainUrl(request)}/sitemap.xml`
	return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': `public, max-age=${60 * 5}`,
		},
	})
}

export async function generateSitemap({
	request,
	routes,
}: {
	request: Request
	routes: ServerBuildRoutes
}) {
	const entries = await collectSitemapEntries({ request, routes })
	const siteUrl = getDomainUrl(request)
	const body = renderSitemapXml(entries, siteUrl)

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': `public, max-age=${60 * 5}`,
		},
	})
}

async function collectSitemapEntries({
	request,
	routes,
}: {
	request: Request
	routes: ServerBuildRoutes
}) {
	const seen = new Set<string>()
	const entries: SitemapEntry[] = []

	for (const route of Object.values(routes)) {
		if (!route) continue
		const customEntries = await getCustomEntries(route, request)
		if (customEntries === null) continue
		const routePath = getRoutePath(route, routes)
		if (routePath && !shouldExcludeRoute(route, routePath)) {
			pushEntry(entries, seen, { route: routePath })
		}

		if (Array.isArray(customEntries)) {
			for (const entry of customEntries) {
				pushEntry(entries, seen, entry)
			}
		}
	}

	return entries.sort((a, b) => a.route.localeCompare(b.route))
}

async function getCustomEntries(route: ServerBuildRoute, request: Request) {
	const handle = route.module?.handle as SEOHandle | undefined
	return await handle?.getSitemapEntries?.(request)
}

function pushEntry(entries: SitemapEntry[], seen: Set<string>, entry: SitemapEntry) {
	if (seen.has(entry.route)) return
	seen.add(entry.route)
	entries.push(entry)
}

function shouldExcludeRoute(route: ServerBuildRoute, routePath: string) {
	if (route.path === '*') return true
	if (hiddenRoutePrefixes.some((prefix) => route.id.startsWith(prefix))) return true
	if (hiddenPathPrefixes.some((prefix) => routePath === `/${prefix}` || routePath.startsWith(`/${prefix}/`))) {
		return true
	}
	if (routePath.endsWith('.txt') || routePath.endsWith('.xml')) return true
	if (routePath.includes('/:') || routePath.includes('*')) return true
	return false
}

function getRoutePath(route: ServerBuildRoute, routes: ServerBuildRoutes) {
	const segments: string[] = []
	let current: ServerBuildRoute | undefined = route

	while (current) {
		if (current.path) segments.unshift(current.path)
		current = current.parentId ? routes[current.parentId] : undefined
	}

	const pathname = `/${segments.join('/')}`.replace(/\/+/g, '/')
	return pathname === '/' ? pathname : pathname.replace(/\/$/, '')
}

function renderSitemapXml(entries: SitemapEntry[], siteUrl: string) {
	const urls = entries
		.map((entry) => {
			const tags = [
				xmlTag('loc', new URL(entry.route, `${siteUrl}/`).toString()),
				entry.lastmod ? xmlTag('lastmod', entry.lastmod) : null,
				entry.changefreq ? xmlTag('changefreq', entry.changefreq) : null,
				typeof entry.priority === 'number'
					? xmlTag('priority', entry.priority.toFixed(1))
					: null,
			]
				.filter(Boolean)
				.join('')

			return `<url>${tags}</url>`
		})
		.join('')

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`
}

function xmlTag(name: string, value: string) {
	return `<${name}>${escapeXml(value)}</${name}>`
}

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}
