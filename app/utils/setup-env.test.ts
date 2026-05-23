import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { consoleWarn } from '../../tests/setup/setup-test-env.ts'

async function loadSetupModule() {
	return import('../../scripts/setup.js') as Promise<{
		getSetupEnvironment: (options?: {
			cwd?: string
			parentEnv?: NodeJS.ProcessEnv
		}) => {
			envPath: string
			envFile: Record<string, string>
			setupEnv: NodeJS.ProcessEnv
		}
		isValidSqliteDatabaseUrl: (databaseUrl: unknown) => boolean
	}>
}

const tempDirectories: Array<string> = []

beforeEach(() => {
	consoleWarn.mockImplementation(() => {})
})

afterEach(async () => {
	await Promise.all(
		tempDirectories.map((directory) =>
			fs.rm(directory, { recursive: true, force: true }),
		),
	)
	tempDirectories.length = 0
})

test('accepts Prisma SQLite file URLs', async () => {
	const { isValidSqliteDatabaseUrl } = await loadSetupModule()

	expect(isValidSqliteDatabaseUrl('file:./data.db?connection_limit=1')).toBe(
		true,
	)
	expect(
		isValidSqliteDatabaseUrl('jdbc:postgresql://127.0.0.1:5432/template'),
	).toBe(false)
})

test('prefers the project .env DATABASE_URL over an inherited DATABASE_URL', async () => {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'epic-stack-setup-'),
	)
	tempDirectories.push(directory)

	await fs.writeFile(
		path.join(directory, '.env'),
		[
			'DATABASE_PATH="./prisma/data.db"',
			'DATABASE_URL="file:./data.db?connection_limit=1"',
			'CACHE_DATABASE_PATH="./other/cache.db"',
			'SESSION_SECRET="from-env-file"',
		].join('\n'),
	)

	const { getSetupEnvironment } = await loadSetupModule()
	const { setupEnv } = getSetupEnvironment({
		cwd: directory,
		parentEnv: {
			DATABASE_URL:
				'jdbc:postgresql://127.0.0.1:5432/template?currentSchema=template',
			NODE_ENV: 'test',
			SESSION_SECRET: 'from-parent-env',
			UNRELATED_ENV: 'kept',
		} as unknown as NodeJS.ProcessEnv,
	})

	expect(setupEnv.DATABASE_URL).toBe('file:./data.db?connection_limit=1')
	expect(setupEnv.SESSION_SECRET).toBe('from-parent-env')
	expect(setupEnv.UNRELATED_ENV).toBe('kept')
})

test('rejects non-SQLite DATABASE_URL values from .env', async () => {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'epic-stack-setup-'),
	)
	tempDirectories.push(directory)

	await fs.writeFile(
		path.join(directory, '.env'),
		'DATABASE_URL="jdbc:postgresql://127.0.0.1:5432/template?currentSchema=template"\n',
	)

	const { getSetupEnvironment } = await loadSetupModule()

	expect(() => getSetupEnvironment({ cwd: directory })).toThrow(
		'DATABASE_URL in .env',
	)
})
