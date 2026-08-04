// ── Seed the initial admin user ─────────────────────────────────────────────
// Run once after Neo4j is up and loaded:
//   ADMIN_EMAIL=you@chamber.org ADMIN_PASSWORD='...' npm run seed-admin
//
// Reads ADMIN_EMAIL / ADMIN_PASSWORD from the environment (repo-root .env, then
// server/.env), creates the :User uniqueness constraint, and upserts the admin.
// Idempotent — re-running updates the password/profile of the same email.

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { getDriver, closeDriver } from './neo4j.js'
import { createUser } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })
config({ path: resolve(__dirname, '.env') })

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Administrator'
  const title = process.env.ADMIN_TITLE || 'System Admin'

  if (!email || !password) {
    console.error('✗ Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.')
    console.error("  e.g. ADMIN_EMAIL=admin@cgcc.org ADMIN_PASSWORD='change-me' npm run seed-admin")
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('✗ ADMIN_PASSWORD must be at least 8 characters.')
    process.exit(1)
  }

  const session = getDriver().session()
  try {
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE')
  } finally {
    await session.close()
  }

  const user = await createUser({ email, password, name, title, role: 'admin' })
  console.log(`✓ Admin user ready: ${user.email} (${user.role})`)
  await closeDriver()
}

main().catch(async (err) => {
  console.error('✗ Seed failed:', err.message)
  await closeDriver()
  process.exit(1)
})
