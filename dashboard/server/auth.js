// ── Real authentication (Neo4j :User model) ─────────────────────────────────
// Replaces the demo/hardcoded front-end users. Identities live in Neo4j as
// :User nodes; passwords are bcrypt-hashed; sessions are stateless JWTs.
//
//   :User { email (unique), password_hash, name, title, role, status, created_at }
//   (:User)-[:REPRESENTS { status:'pending'|'approved', requested_at,
//                          approved_at, approved_by }]->(:Business)
//
// The REPRESENTS edge is the "business claim". Only an admin approves it
// (pending → approved) — members/other roles cannot claim their own business.

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDriver } from './neo4j.js'

const JWT_EXPIRES_IN = '12h'

// Read lazily so dotenv (configured in index.js after import) has run.
function jwtSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set — refuse to sign tokens with a default')
  return s
}

// ── Password + token primitives ─────────────────────────────────────────────
export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

export function signToken(user) {
  // Keep the token payload small; the client never trusts it for authorization,
  // it's re-verified server-side on every request.
  return jwt.sign(
    { sub: user.email, role: user.role, name: user.name },
    jwtSecret(),
    { expiresIn: JWT_EXPIRES_IN },
  )
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret())
}

// ── Neo4j user store ────────────────────────────────────────────────────────
export async function findUserByEmail(email) {
  const session = getDriver().session()
  try {
    const res = await session.run(
      `MATCH (u:User { email: $email }) RETURN u`,
      { email: (email || '').toLowerCase() },
    )
    return res.records[0]?.get('u').properties || null
  } finally {
    await session.close()
  }
}

// The business a user represents *and* has been approved for. Returns null for
// admins/staff (who represent no single business) or pending/unclaimed users.
export async function getApprovedBusiness(email) {
  const session = getDriver().session()
  try {
    const res = await session.run(
      `MATCH (u:User { email: $email })-[r:REPRESENTS { status: 'approved' }]->(b:Business)
       RETURN b LIMIT 1`,
      { email: (email || '').toLowerCase() },
    )
    return res.records[0]?.get('b').properties || null
  } finally {
    await session.close()
  }
}

export async function createUser({ email, password, name, title, role }) {
  const password_hash = await hashPassword(password)
  const session = getDriver().session()
  try {
    const res = await session.run(
      `MERGE (u:User { email: $email })
       ON CREATE SET u.created_at = datetime()
       SET u.password_hash = $password_hash,
           u.name = $name, u.title = $title, u.role = $role, u.status = 'active'
       RETURN u`,
      { email: email.toLowerCase(), password_hash, name: name || '', title: title || '', role: role || 'member' },
    )
    return sanitizeUser(res.records[0]?.get('u').properties)
  } finally {
    await session.close()
  }
}

export async function listUsers() {
  const session = getDriver().session()
  try {
    const res = await session.run(`MATCH (u:User) RETURN u ORDER BY u.email`)
    return res.records.map(r => sanitizeUser(r.get('u').properties))
  } finally {
    await session.close()
  }
}

// ── Business claims (REPRESENTS edge) ────────────────────────────────────────
export async function createClaim({ email, businessId }) {
  const session = getDriver().session()
  try {
    const res = await session.run(
      `MATCH (u:User { email: $email }), (b:Business { business_id: $businessId })
       MERGE (u)-[r:REPRESENTS]->(b)
       ON CREATE SET r.status = 'pending', r.requested_at = datetime()
       RETURN u.email AS email, b.business_id AS businessId, b.name AS businessName, r.status AS status`,
      { email: email.toLowerCase(), businessId },
    )
    const rec = res.records[0]
    if (!rec) throw new Error('User or business not found')
    return { email: rec.get('email'), businessId: rec.get('businessId'), businessName: rec.get('businessName'), status: rec.get('status') }
  } finally {
    await session.close()
  }
}

export async function listClaims(status = null) {
  const session = getDriver().session()
  try {
    const res = await session.run(
      `MATCH (u:User)-[r:REPRESENTS]->(b:Business)
       ${status ? 'WHERE r.status = $status' : ''}
       RETURN u.email AS email, u.name AS userName, b.business_id AS businessId,
              b.name AS businessName, r.status AS status, r.requested_at AS requestedAt
       ORDER BY r.requested_at DESC`,
      { status },
    )
    return res.records.map(r => ({
      email: r.get('email'), userName: r.get('userName'),
      businessId: r.get('businessId'), businessName: r.get('businessName'),
      status: r.get('status'), requestedAt: r.get('requestedAt')?.toString() || null,
    }))
  } finally {
    await session.close()
  }
}

export async function approveClaim({ email, businessId, approvedBy }) {
  const session = getDriver().session()
  try {
    const res = await session.run(
      `MATCH (u:User { email: $email })-[r:REPRESENTS]->(b:Business { business_id: $businessId })
       SET r.status = 'approved', r.approved_at = datetime(), r.approved_by = $approvedBy
       RETURN u.email AS email, b.business_id AS businessId, r.status AS status`,
      { email: email.toLowerCase(), businessId, approvedBy },
    )
    const rec = res.records[0]
    if (!rec) throw new Error('Claim not found')
    return { email: rec.get('email'), businessId: rec.get('businessId'), status: rec.get('status') }
  } finally {
    await session.close()
  }
}

// Never leak the password hash to any client.
function sanitizeUser(props) {
  if (!props) return null
  const { password_hash, ...safe } = props
  return { ...safe, created_at: safe.created_at?.toString?.() || safe.created_at }
}
export { sanitizeUser }

// ── Express middleware ──────────────────────────────────────────────────────
// Attaches req.user = { email, role, name, businessId } (businessId = approved
// claim, if any). 401 when the token is missing or invalid.
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  let payload
  try {
    payload = verifyToken(token)
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
  // Resolve the approved business lazily only where needed; attach the essentials.
  req.user = { email: payload.sub, role: payload.role, name: payload.name }
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}
