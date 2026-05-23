# SEO

Remix has built-in support for setting up `meta` tags on a per-route basis which
you can read about
[in the Remix Metadata docs](https://remix.run/docs/en/main/route/meta).

The Epic Stack also has built-in support for `/robots.txt` and `/sitemap.xml`
via [resource routes](https://remix.run/docs/en/main/guides/resource-routes).
The sitemap loader walks the React Router server route manifest, skips known
private/resource sections by default, and lets routes opt out or add custom
entries via a `handle.getSitemapEntries` export. Only public-facing pages
should be included in the `sitemap.xml` file.

Here are two quick examples of how to customize the sitemap on a per-route
basis:

```tsx
// routes/blog/_layout.tsx
import { type SEOHandle } from '#app/utils/seo.ts'
import { serverOnly$ } from 'vite-env-only/macros'

export const handle: SEOHandle = {
	getSitemapEntries: serverOnly$(async (request) => {
		const blogs = await db.blog.findMany()
		return blogs.map((blog) => {
			return { route: `/blog/${blog.slug}`, priority: 0.7 }
		})
	}),
}
```

Note the use of
[`vite-env-only/macros`](https://github.com/pcattori/vite-env-only). This is
because `handle` is a route export object that goes in both the client as well
as the server, but our sitemap function should only be run on the server. So we
use `vite-env-only/macros` to make sure the function is removed for the client
build. Support for this is pre-configured in the `vite.config.ts` file.

```tsx
// in your routes/url-that-doesnt-need-sitemap
import { type SEOHandle } from '#app/utils/seo.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}
```
