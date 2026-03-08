import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'younov_session';

export function getCookieName() {
  return COOKIE_NAME;
}

export function signSessionToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  // Default 14 days
  const expiresIn = process.env.JWT_EXPIRES_IN || '14d';
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifySessionToken(token) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  return jwt.verify(token, secret);
}

export function setAuthCookie(res, token) {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
  const sameSite = process.env.COOKIE_SAMESITE || 'lax';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 14 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      req.auth = null;
      return next();
    }
    const decoded = verifySessionToken(token);
    if (!decoded?.sub) {
      req.auth = null;
      return next();
    }
    // Attach lightweight user
    const user = await prisma.user.findUnique({
      where: { id: String(decoded.sub) },
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
        pointsBalance: true,
        isBanned: true,
        bannedUntil: true,
        bannedReason: true
      }
    });
    req.auth = user ? { user } : null;
    return next();
  } catch (_err) {
    req.auth = null;
    return next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const u = req.auth.user;
  if (u.isBanned && (!u.bannedUntil || new Date(u.bannedUntil).getTime() > Date.now())) {
    return res.status(403).json({ error: 'banned', reason: u.bannedReason || 'banned' });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.auth?.user) return res.status(401).json({ error: 'unauthorized' });
  const u = req.auth.user;
  if (u.isBanned && (!u.bannedUntil || new Date(u.bannedUntil).getTime() > Date.now())) {
    return res.status(403).json({ error: 'banned', reason: u.bannedReason || 'banned' });
  }
  if (u.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  return next();
}

