import { generateSitemap } from '#app/utils/seo.server.ts'
import { type Route } from './+types/sitemap[.]xml.ts'

export async function loader({ request, context }: Route.LoaderArgs) {
	return generateSitemap({ request, routes: context.serverBuild.routes })
}
