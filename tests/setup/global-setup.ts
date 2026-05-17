import path from 'node:path'
import { execaCommand } from 'execa'
import fsExtra from 'fs-extra'
import 'dotenv/config'
import '#app/utils/env.server.ts'

export const BASE_DATABASE_PATH = path.join(
	process.cwd(),
	`./tests/prisma/base.db`,
)

export async function setup() {
	const databaseExists = await fsExtra.pathExists(BASE_DATABASE_PATH)

	if (databaseExists) {
		const databaseLastModifiedAt = (await fsExtra.stat(BASE_DATABASE_PATH))
			.mtime
		const watchedPrismaInputs = await Promise.all([
			fsExtra.stat('./prisma/schema.prisma'),
			fsExtra.stat('./prisma/seed.ts'),
			fsExtra.stat('./prisma.config.ts'),
		])
		const latestPrismaInputAt = watchedPrismaInputs.reduce(
			(latest, file) =>
				file.mtime > latest ? file.mtime : latest,
			watchedPrismaInputs[0].mtime,
		)

		if (latestPrismaInputAt < databaseLastModifiedAt) {
			return
		}
	}

	await execaCommand(
		'pnpm exec prisma migrate reset --force',
		{
			stdio: 'inherit',
			env: {
				...process.env,
				DATABASE_URL: `file:${BASE_DATABASE_PATH}`,
				// allow AI agents to reset the database while running tests
				PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'true',
			},
		},
	)
}
