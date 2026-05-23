export type SitemapEntry = {
	route: string
	lastmod?: string
	changefreq?:
		| 'always'
		| 'hourly'
		| 'daily'
		| 'weekly'
		| 'monthly'
		| 'yearly'
		| 'never'
	priority?: number
}

export type SEOHandle = {
	getSitemapEntries?:
		| ((request: Request) => SitemapEntry[] | null | Promise<SitemapEntry[] | null>)
		| undefined
}
