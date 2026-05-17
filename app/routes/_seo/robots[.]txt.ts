import { generateRobotsTxt } from '#app/utils/seo.server.ts'
import { type Route } from './+types/robots[.]txt.ts'

export function loader({ request }: Route.LoaderArgs) {
	return generateRobotsTxt({ request })
}
