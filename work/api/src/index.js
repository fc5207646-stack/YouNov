import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import fs from 'node:fs';
import archiver from 'archiver';

import path from 'node:path';
import multer from 'multer';

import { prisma } from './prisma.js';
import { getRedis } from './redis.js';
import {
  authMiddleware,
  clearAuthCookie,
  getCookieName,
  requireAdmin,
  requireAuth,
  setAuthCookie,
  signSessionToken
} from './auth.js';

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(morgan('combined'));
const port = Number(process.env.PORT || 8080);

// 双 API/双库：对端地址，用于本机无数据时回退到对端（轮询取有数据的一侧）
const PEER_API_URL = (process.env.PEER_API_URL || '').replace(/\/+$/, '');
const INTERNAL_FALLBACK_HEADER = 'x-internal-fallback';

/** 向对端请求同路径，带上原 query，避免对端再回退造成环。返回 JSON 或 null */
async function fetchFromPeer(pathWithQuery) {
  if (!PEER_API_URL) return null;
  const url = pathWithQuery.startsWith('http') ? pathWithQuery : `${PEER_API_URL}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
  const timeoutMs = 8000;
  let signal;
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    signal = AbortSignal.timeout(timeoutMs);
  } else {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), timeoutMs);
    signal = ac.signal;
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { [INTERNAL_FALLBACK_HEADER]: '1' },
      signal
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data;
  } catch (_e) {
    return null;
  }
}

// Multer config for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});
// Ensure uploads dir exists
fs.promises.mkdir('uploads', { recursive: true }).catch(() => {});

const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
const billingMode = (process.env.BILLING_MODE || 'mock').toLowerCase(); // mock | stripe

async function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const mod = await import('stripe');
  return new mod.default(key);
}

function isBannedUser(u) {
  if (!u?.isBanned) return false;
  if (!u.bannedUntil) return true;
  return new Date(u.bannedUntil).getTime() > Date.now();
}

function normalizeIp(ip) {
  if (!ip) return null;
  const s = String(ip);
  // Express may return IPv6-mapped IPv4 like ::ffff:127.0.0.1
  if (s.startsWith('::ffff:')) return s.slice('::ffff:'.length);
  // Strip IPv6 zone index if any (rare)
  const zoneIdx = s.indexOf('%');
  if (zoneIdx !== -1) return s.slice(0, zoneIdx);
  return s;
}

app.set('trust proxy', 1);

// Cloudflare / Proxy Middleware
app.use((req, res, next) => {
  // Fix for Cloudflare Flexible SSL
  if (req.headers['cf-visitor'] && req.headers['cf-visitor'].includes('https')) {
    req.headers['x-forwarded-proto'] = 'https';
  }
  next();
});

const allowedOrigins = new Set([
  webOrigin,
  'https://younov.com',
  'https://www.younov.com',
  'http://localhost:3000',
  'http://localhost:3001', // 添加本地开发端口
]);

app.use(
  cors({
    origin(origin, cb) {
      // 没有 Origin（curl、服务端调用等）直接放行
      if (!origin) return cb(null, true);

      if (allowedOrigins.has(origin)) return cb(null, true);

      // Temporary Allow all for debugging Cloudflare issues
      // TODO: Revert this once stable
      // return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(helmet({
  contentSecurityPolicy: false, // Cloudflare might inject scripts or user content issues
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images from other domains if needed
}));

// Stripe webhook 需要 raw body（必须在 express.json 之前注册）
app.post('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = await getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return res.status(501).json({ error: 'billing_not_configured' });

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'missing_signature' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (_err) {
    return res.status(400).json({ error: 'invalid_signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const providerSessionId = String(session.id);
      const userId = session?.metadata?.userId ? String(session.metadata.userId) : null;
      const planId = session?.metadata?.planId ? String(session.metadata.planId) : null;
      if (userId && planId) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await prisma.checkoutSession.updateMany({
          where: { provider: 'STRIPE', providerSessionId },
          data: { status: 'PAID', providerCustomerId: session.customer ? String(session.customer) : undefined }
        });

        await prisma.subscription.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'CANCELED' }
        });
        await prisma.subscription.create({
          data: {
            userId,
            planId,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt,
            provider: 'STRIPE',
            providerRef: session.subscription ? String(session.subscription) : undefined,
            checkoutSessionId: providerSessionId
          }
        });

        const registerRef = await prisma.referralEvent.findFirst({
          where: { userId, eventType: 'register' },
          orderBy: { createdAt: 'desc' },
          select: { referralCodeId: true }
        });
        if (registerRef?.referralCodeId) {
          await prisma.referralEvent.create({
            data: {
              referralCodeId: registerRef.referralCodeId,
              userId,
              eventType: 'subscribe',
              ip: null,
              userAgent: null
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('stripe webhook error', err);
    return res.status(500).json({ error: 'webhook_failed' });
  }

  return res.json({ received: true });
});

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Prioritize CF-Connecting-IP, then X-Forwarded-For, then socket IP
      return req.headers['cf-connecting-ip'] || req.ip; 
    }
  })
);

app.use(authMiddleware);

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    username: u.username || null,
    avatarUrl: u.avatarUrl || null,
    role: u.role,
    pointsBalance: u.pointsBalance,
    isBanned: Boolean(u.isBanned),
    bannedUntil: u.bannedUntil || null
  };
}

async function userHasActiveSubscription(userId) {
  const now = new Date();
  const active = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: now } },
    select: { id: true }
  });
  return Boolean(active);
}

async function getActiveSubscription(userId) {
  const now = new Date();
  return prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: now } },
    orderBy: { expiresAt: 'desc' },
    select: { id: true, planId: true, status: true, startsAt: true, expiresAt: true, provider: true, providerRef: true }
  });
}

async function loadPromoCode(codeRaw) {
  const code = String(codeRaw || '').trim().toUpperCase();
  if (!code) return null;
  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) return null;
  if (!promo.active) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) return null;
  if (promo.maxRedemptions != null && promo.redeemedCount >= promo.maxRedemptions) return null;
  return promo;
}

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true, version: 'v11' }));

// Version check (explicit)
app.get('/api/version', (_req, res) => res.json({ version: 'v11', timestamp: new Date().toISOString() }));


// No-store cache control for admin routes
app.use('/api/admin', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(1).max(30),
    username: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional()
    ),
    referralCode: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().min(3).max(32).optional()
    )
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const { email, password, displayName, username, referralCode } = parsed.data;
  const usernameRequested = Boolean(username);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return res.status(409).json({ error: 'email_taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  let user;

  const makeUsernameBase = (raw) => {
    const base = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    if (base.length >= 3) return base;
    return `user${Math.random().toString(36).slice(2, 8)}`;
  };

  const isUniqueViolation = (e) => e?.code === 'P2002';

  const createUserWithUsername = async (u) => {
    return prisma.user.create({
      data: { email, passwordHash, displayName, ...(u ? { username: u } : {}) }
    });
  };

  try {
    if (usernameRequested) {
      user = await createUserWithUsername(username);
    } else {
      const base = makeUsernameBase(displayName);
      // Try a few variations before falling back to null username
      const candidates = [
        base,
        `${base}_${Math.random().toString(36).slice(2, 6)}`,
        `${base}_${Math.random().toString(36).slice(2, 6)}`,
        `${base}_${Math.random().toString(36).slice(2, 6)}`
      ].map((c) => c.slice(0, 24));

      for (const cand of candidates) {
        try {
          user = await createUserWithUsername(cand);
          break;
        } catch (e) {
          if (!isUniqueViolation(e)) throw e;
        }
      }

      if (!user) {
        // As a last resort, allow null username (unique nullable)
        user = await createUserWithUsername(undefined);
      }
    }
  } catch (e) {
    if (isUniqueViolation(e) && usernameRequested) {
      return res.status(409).json({ error: 'username_taken' });
    }
    throw e;
  }

  // Create referral code for user
  await prisma.referralCode.create({
    data: { userId: user.id, code: `u${user.id.slice(-6)}`.toLowerCase() }
  });

  // Track referral register event (optional)
  if (referralCode) {
    const ref = await prisma.referralCode.findUnique({ where: { code: String(referralCode).toLowerCase() }, select: { id: true } });
    if (ref) {
      await prisma.referralEvent.create({
        data: {
          referralCodeId: ref.id,
          userId: user.id,
          eventType: 'register',
          ip: req.ip,
          userAgent: req.get('user-agent') || undefined
        }
      });
    }
  }

  const token = signSessionToken({ sub: user.id });
  setAuthCookie(res, token);
  return res.json({ user: publicUser(user), cookieName: getCookieName() });
});

app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, displayName: true, role: true, pointsBalance: true }
  });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signSessionToken({ sub: user.id });
  setAuthCookie(res, token);
  return res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', async (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  return res.json({ user: publicUser(req.auth.user) });
});

// User profile / homepage
app.get('/api/users/me/home', requireAuth, async (req, res) => {
  const userId = req.auth.user.id;

  const [sub, referralCode, reading] = await Promise.all([
    getActiveSubscription(userId),
    prisma.referralCode.findUnique({ where: { userId }, select: { id: true, code: true } }),
    prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        progress: true,
        updatedAt: true,
        chapter: {
          select: {
            id: true,
            orderIndex: true,
            title: true,
            novel: { select: { slug: true, title: true, coverUrl: true, authorName: true } }
          }
        }
      }
    })
  ]);

  let referral = null;
  if (referralCode) {
    const [clicks, registers, subscribes] = await Promise.all([
      prisma.referralEvent.count({ where: { referralCodeId: referralCode.id, eventType: 'click' } }),
      prisma.referralEvent.count({ where: { referralCodeId: referralCode.id, eventType: 'register' } }),
      prisma.referralEvent.count({ where: { referralCodeId: referralCode.id, eventType: 'subscribe' } })
    ]);
    referral = { code: referralCode.code, clicks, registers, subscribes };
  }

  return res.json({
    user: publicUser(req.auth.user),
    subscription: sub,
    referral,
    readingHistory: reading
  });
});

// Bookshelf (Library)
app.get('/api/bookshelf/me', requireAuth, async (req, res) => {
  const userId = req.auth.user.id;
  const items = await prisma.bookshelfItem.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      progress: true,
      updatedAt: true,
      novel: { select: { slug: true, title: true, coverUrl: true, authorName: true } }
    }
  });
  return res.json({ items });
});

app.get('/api/bookshelf/:slug', requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });

  const item = await prisma.bookshelfItem.findUnique({
    where: { userId_novelId: { userId: req.auth.user.id, novelId: novel.id } },
    select: { id: true, progress: true, updatedAt: true }
  });
  return res.json({ inBookshelf: Boolean(item), item });
});

app.post('/api/bookshelf/:slug', requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });

  const created = await prisma.bookshelfItem.upsert({
    where: { userId_novelId: { userId: req.auth.user.id, novelId: novel.id } },
    update: { updatedAt: new Date() },
    create: { userId: req.auth.user.id, novelId: novel.id },
    select: { id: true, progress: true, updatedAt: true }
  });
  return res.json({ ok: true, item: created });
});

app.delete('/api/bookshelf/:slug', requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });
  await prisma.bookshelfItem.deleteMany({ where: { userId: req.auth.user.id, novelId: novel.id } });
  return res.json({ ok: true });
});

// Points ledger (for user center)
app.get('/api/points/ledger', requireAuth, async (req, res) => {
  const userId = req.auth.user.id;
  const items = await prisma.pointsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, delta: true, reason: true, metadata: true, createdAt: true }
  });
  return res.json({ items });
});

app.patch('/api/users/me', requireAuth, async (req, res) => {
  const schema = z.object({
    displayName: z.string().min(1).max(30).optional(),
    username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    bio: z.string().max(200).optional().nullable()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  try {
    const updated = await prisma.user.update({
      where: { id: req.auth.user.id },
      data: {
        ...(parsed.data.displayName ? { displayName: parsed.data.displayName } : {}),
        ...(parsed.data.username ? { username: parsed.data.username } : {}),
        ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {})
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
        pointsBalance: true,
        isBanned: true,
        bannedUntil: true
      }
    });
    return res.json({ user: publicUser(updated) });
  } catch (_e) {
    return res.status(409).json({ error: 'username_taken' });
  }
});

app.get('/api/users/by-username/:username', async (req, res) => {
  const username = String(req.params.username || '');
  const u = await prisma.user.findUnique({
    where: { username },
    select: { id: true, displayName: true, username: true, avatarUrl: true, bio: true, createdAt: true }
  });
  if (!u) return res.status(404).json({ error: 'not_found' });
  return res.json({ profile: u });
});

// 分类依据：小说详情页关键词标签。8 个分类：Urban, Fantasy, Military, Historical, Suspense, Martial Arts, Xianxia, Other
// tag 参数：匹配 novel.tags（JSON 数组字符串）中整词标签，不区分大小写（urban/Urban 均可）
function buildTagFilter(tag) {
  if (!tag) return {};
  const s = String(tag).replace(/"/g, '').trim();
  if (!s) return {};
  const quoted = `"${s}"`;
  const lower = s.toLowerCase();
  const quotedLower = `"${lower}"`;
  return {
    OR: [
      { tags: { contains: `[${quoted}` } },
      { tags: { contains: `,${quoted}` } },
      { tags: { contains: `[${quotedLower}` } },
      { tags: { contains: `,${quotedLower}` } }
    ]
  };
}

// Novel browse / detail (Library 页)
app.get('/api/novels', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const tag = String(req.query.tag || '').trim();
  const take = Math.min(Number(req.query.take || 24), 50);
  const skip = Math.max(Number(req.query.skip || 0), 0);

  const andParts = [];
  if (tag) andParts.push(buildTagFilter(tag));
  if (q) andParts.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { authorName: { contains: q, mode: 'insensitive' } }] });
  const where = {
    isPublished: true,
    ...(andParts.length > 0 ? { AND: andParts } : {})
  };

  const [items, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        authorName: true,
        coverUrl: true,
        description: true,
        tags: true,
        category: true,
        views: true,
        rating: true,
        ratingCount: true,
        updatedAt: true
      }
    }),
    prisma.novel.count({ where })
  ]);

  const hasData = Array.isArray(items) && items.length > 0;
  if (hasData) return res.json({ items, total, skip, take });
  if (req.get(INTERNAL_FALLBACK_HEADER) || !PEER_API_URL) return res.json({ items, total, skip, take });
  const peer = await fetchFromPeer(req.originalUrl || '/api/novels');
  if (peer && typeof peer === 'object' && Array.isArray(peer.items) && peer.items.length > 0) return res.json(peer);
  return res.json({ items, total, skip, take });
});

// Free novels: published novels that have at least one published free chapter（分类按 tag 关键词标签）
app.get('/api/free-novels', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const tag = String(req.query.tag || '').trim();
  const take = Math.min(Number(req.query.take || 24), 50);
  const skip = Math.max(Number(req.query.skip || 0), 0);

  const andParts = [];
  if (tag) andParts.push(buildTagFilter(tag));
  if (q) andParts.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { authorName: { contains: q, mode: 'insensitive' } }] });
  const where = {
    isPublished: true,
    chapters: { some: { isPublished: true, isFree: true } },
    ...(andParts.length > 0 ? { AND: andParts } : {})
  };

  const [items, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        authorName: true,
        coverUrl: true,
        description: true,
        tags: true,
        category: true,
        views: true,
        rating: true,
        ratingCount: true,
        updatedAt: true
      }
    }),
    prisma.novel.count({ where })
  ]);

  const hasData = Array.isArray(items) && items.length > 0;
  if (hasData) return res.json({ items, total, skip, take });
  if (req.get(INTERNAL_FALLBACK_HEADER) || !PEER_API_URL) return res.json({ items, total, skip, take });
  const peer = await fetchFromPeer(req.originalUrl || '/api/free-novels');
  if (peer && typeof peer === 'object' && Array.isArray(peer.items) && peer.items.length > 0) return res.json(peer);
  return res.json({ items, total, skip, take });
});

app.get('/api/novels/:slug', async (req, res) => {
  const slug = String(req.params.slug);
  
  // Fetch novel data first for speed
  const novel = await prisma.novel.findUnique({
    where: { slug },
    select: {
        id: true,
        slug: true,
        title: true,
        authorName: true,
        coverUrl: true,
        description: true,
        tags: true,
        category: true,
        views: true,
        rating: true,
        ratingCount: true,
        status: true,
        updatedAt: true,
        chapters: {
          where: { isPublished: true },
          select: { wordCount: true }
        }
      }
  });

  if (!novel) return res.status(404).json({ error: 'not_found' });

  // Calculate total word count
  const wordCount = novel.chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);
  const novelData = { ...novel, wordCount };
  delete novelData.chapters; // Don't send full chapter list in summary

  // Increment views asynchronously (fire and forget)
  prisma.novel.update({
    where: { id: novel.id },
    data: { views: { increment: 1 } }
  }).catch(err => console.error('Failed to increment views:', err));

  return res.json({ novel: novelData });
});

// Rate a novel (1-5). Stores per-user rating and updates aggregate fields on Novel.
app.post('/api/novels/:slug/rate', requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const schema = z.object({ rating: z.number().int().min(1).max(5) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const userId = req.auth.user.id;
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true, rating: true, ratingCount: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });

  const newRating = parsed.data.rating;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.novelRating.findUnique({
      where: { novelId_userId: { novelId: novel.id, userId } },
      select: { id: true, rating: true }
    });

    if (!existing) {
      await tx.novelRating.create({ data: { novelId: novel.id, userId, rating: newRating } });
      const count = (novel.ratingCount || 0) + 1;
      const avg = ((novel.rating || 0) * (novel.ratingCount || 0) + newRating) / count;
      const updatedNovel = await tx.novel.update({
        where: { id: novel.id },
        data: { rating: avg, ratingCount: count },
        select: { slug: true, rating: true, ratingCount: true }
      });
      return { updatedNovel, yourRating: newRating };
    }

    await tx.novelRating.update({ where: { id: existing.id }, data: { rating: newRating } });
    const count = Math.max(1, novel.ratingCount || 1);
    const avg = ((novel.rating || 0) * count - existing.rating + newRating) / count;
    const updatedNovel = await tx.novel.update({
      where: { id: novel.id },
      data: { rating: avg, ratingCount: count },
      select: { slug: true, rating: true, ratingCount: true }
    });
    return { updatedNovel, yourRating: newRating };
  });

  return res.json({ novel: result.updatedNovel, yourRating: result.yourRating });
});

// Leaderboard（双库回退：本机无数据时用对端数据）
app.get('/api/leaderboard', async (req, res) => {
  const selectNovel = {
    id: true,
    slug: true,
    title: true,
    authorName: true,
    coverUrl: true,
    views: true,
    rating: true,
    ratingCount: true,
    updatedAt: true
  };
  const [mostRead, topRated] = await Promise.all([
    prisma.novel.findMany({ where: { isPublished: true }, orderBy: [{ views: 'desc' }, { updatedAt: 'desc' }], take: 12, select: selectNovel }),
    prisma.novel.findMany({
      where: { isPublished: true },
      orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
      select: selectNovel
    })
  ]);
  const hasData = (Array.isArray(mostRead) && mostRead.length > 0) || (Array.isArray(topRated) && topRated.length > 0);
  if (hasData) return res.json({ mostRead, topRated });
  if (req.get(INTERNAL_FALLBACK_HEADER) || !PEER_API_URL) return res.json({ mostRead, topRated });
  const peer = await fetchFromPeer(req.originalUrl || '/api/leaderboard');
  if (peer && typeof peer === 'object' && (peer.mostRead?.length > 0 || peer.topRated?.length > 0)) return res.json(peer);
  return res.json({ mostRead, topRated });
});

// Public notifications (global announcements)
app.get('/api/notifications', async (_req, res) => {
  const items = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  const unreadCount = items.filter((n) => !n.isRead).length;
  return res.json({ items, unreadCount });
});

app.get('/api/novels/:slug/chapters', async (req, res) => {
  const slug = String(req.params.slug);
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });

  const chapters = await prisma.chapter.findMany({
    where: { novelId: novel.id, isPublished: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      orderIndex: true,
      title: true,
      wordCount: true,
      isFree: true
    }
  });
  return res.json({ chapters });
});

// Read chapter (paywall)
app.get('/api/chapters/:id', async (req, res) => {
  const id = String(req.params.id);
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    select: {
      id: true,
      orderIndex: true,
      title: true,
      content: true,
      wordCount: true,
      isFree: true,
      novel: { select: { slug: true, title: true } }
    }
  });
  if (!chapter) return res.status(404).json({ error: 'not_found' });

  // Free chapter
  if (chapter.isFree) return res.json({ chapter: { ...chapter, content: chapter.content } });

  const userId = req.auth?.user?.id;
  if (req.auth?.user && isBannedUser(req.auth.user)) {
    return res.status(403).json({ error: 'banned' });
  }
  if (!userId) {
    return res.status(402).json({ error: 'paywall', reason: 'login_required' });
  }

  const hasSub = await userHasActiveSubscription(userId);
  if (!hasSub) {
    return res.status(402).json({
      error: 'paywall',
      reason: 'subscription_required'
    });
  }

  // Cache chapter content
  const redis = getRedis();
  const cacheKey = `chapter:${chapter.id}:content`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ chapter: { ...chapter, content: cached } });
      await redis.set(cacheKey, chapter.content, 'EX', 60 * 10);
    } catch (_e) {
      // ignore cache errors
    }
  }

  // Record reading history (best-effort)
  prisma.readingHistory
    .upsert({
      where: { userId_chapterId: { userId, chapterId: chapter.id } },
      update: { progress: 0 },
      create: { userId, chapterId: chapter.id, progress: 0 }
    })
    .catch(() => {});

  return res.json({ chapter: { ...chapter, content: chapter.content } });
});

// Comments
app.get('/api/chapters/:id/comments', async (req, res) => {
  const chapterId = String(req.params.id);
  const take = Math.min(Number(req.query.take || 50), 200);
  const skip = Math.max(Number(req.query.skip || 0), 0);

  const items = await prisma.comment.findMany({
    where: { chapterId },
    orderBy: { createdAt: 'asc' },
    take,
    skip,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true } }
    }
  });
  const total = await prisma.comment.count({ where: { chapterId } });
  return res.json({ items, total, take, skip });
});

app.post('/api/chapters/:id/comments', requireAuth, async (req, res) => {
  const chapterId = String(req.params.id);
  const schema = z.object({ content: z.string().min(1).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId }, select: { id: true, novelId: true, isPublished: true } });
  if (!chapter) return res.status(404).json({ error: 'not_found' });
  if (!chapter.isPublished && req.auth.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });

  const created = await prisma.comment.create({
    data: {
      chapterId: chapter.id,
      novelId: chapter.novelId,
      userId: req.auth.user.id,
      content: parsed.data.content.trim()
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true } }
    }
  });

  return res.json({ comment: created });
});

app.delete('/api/comments/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const c = await prisma.comment.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!c) return res.status(404).json({ error: 'not_found' });
  if (c.userId !== req.auth.user.id && req.auth.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  await prisma.comment.delete({ where: { id } });
  return res.json({ ok: true });
});

// Subscription
app.get('/api/subscriptions/me', requireAuth, async (req, res) => {
  const userId = req.auth.user.id;
  const sub = await getActiveSubscription(userId);
  return res.json({ subscription: sub });
});

// Promo code validation
app.get('/api/promo/:code', async (req, res) => {
  const promo = await loadPromoCode(req.params.code);
  if (!promo) return res.status(404).json({ error: 'not_found' });
  return res.json({
    promo: {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      expiresAt: promo.expiresAt,
      maxRedemptions: promo.maxRedemptions,
      redeemedCount: promo.redeemedCount
    }
  });
});

app.post('/api/subscriptions/checkout', requireAuth, async (req, res) => {
  const schema = z.object({
    planId: z.enum(['basic', 'premium', 'svip']),
    promoCode: z.string().min(3).max(32).optional(),
    usePoints: z.number().int().nonnegative().optional().default(0)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const userId = req.auth.user.id;
  const planId = parsed.data.planId;
  const promo = parsed.data.promoCode ? await loadPromoCode(parsed.data.promoCode) : null;

  // Pricing model: mock 为演示；stripe 为真实支付（密钥留空时返回 billing_not_configured）
  const planAmountCents = planId === 'svip' ? 2990 : planId === 'premium' ? 1990 : 990;
  const currency = 'usd';

  // 计算优惠
  let discountCents = 0;
  let bonusCoins = 0;
  if (promo) {
    if (promo.type === 'PERCENT') discountCents = Math.floor((planAmountCents * promo.value) / 100);
    if (promo.type === 'AMOUNT') discountCents = Math.min(planAmountCents, promo.value);
    if (promo.type === 'COINS') bonusCoins = promo.value;
  }
  const finalAmountCents = Math.max(0, planAmountCents - discountCents);

  if (billingMode === 'stripe') {
    const stripe = await getStripeClient();
    const priceId =
      planId === 'svip'
        ? process.env.STRIPE_PRICE_SVIP
        : planId === 'premium'
          ? process.env.STRIPE_PRICE_PREMIUM
          : process.env.STRIPE_PRICE_BASIC;

    if (!stripe || !priceId) return res.status(501).json({ error: 'billing_not_configured' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.BILLING_SUCCESS_URL || `${webOrigin}/subscription?status=success`,
      cancel_url: process.env.BILLING_CANCEL_URL || `${webOrigin}/subscription?status=cancel`,
      metadata: { userId, planId, promoCode: promo?.code || '' }
    });

    await prisma.checkoutSession.create({
      data: {
        provider: 'STRIPE',
        userId,
        planId,
        status: 'PENDING',
        amountCents: finalAmountCents,
        currency,
        promoCodeId: promo?.id || null,
        providerSessionId: String(session.id)
      }
    });

    return res.json({ mode: 'stripe', checkoutUrl: session.url });
  }

  // ---- mock 开通订阅（用于未配置密钥的本地/演示环境）----
  const planReward = planId === 'svip' ? 30 : planId === 'premium' ? 20 : 10;

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Expire previous active subscriptions (demo behavior)
  await prisma.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'CANCELED' }
  });

  const sub = await prisma.$transaction(async (tx) => {
    const checkout = await tx.checkoutSession.create({
      data: {
        provider: 'STRIPE',
        userId,
        planId,
        status: 'PAID',
        amountCents: finalAmountCents,
        currency,
        promoCodeId: promo?.id || null,
        providerSessionId: `mock_${userId}_${Date.now()}`
      }
    });

    if (promo) {
      await tx.promoRedemption.create({ data: { promoCodeId: promo.id, userId } }).catch(() => {});
      await tx.promoCode.update({ where: { id: promo.id }, data: { redeemedCount: { increment: 1 } } }).catch(() => {});
    }

    const created = await tx.subscription.create({
      data: {
        userId,
        planId,
        status: 'ACTIVE',
        startsAt,
        expiresAt,
        provider: null,
        providerRef: null,
        checkoutSessionId: checkout.providerSessionId
      }
    });

    // 订阅奖励积分 + 优惠码赠送 coins
    const totalBonus = planReward + bonusCoins;
    if (totalBonus > 0) {
      await tx.user.update({ where: { id: userId }, data: { pointsBalance: { increment: totalBonus } } });
      await tx.pointsLedger.create({
        data: { userId, delta: totalBonus, reason: 'subscription_reward', metadata: { planId, promoCode: promo?.code || null } }
      });
    }

    const registerRef = await tx.referralEvent.findFirst({
      where: { userId, eventType: 'register' },
      orderBy: { createdAt: 'desc' },
      select: { referralCodeId: true }
    });
    if (registerRef?.referralCodeId) {
      await tx.referralEvent.create({
        data: {
          referralCodeId: registerRef.referralCodeId,
          userId,
          eventType: 'subscribe',
          ip: null,
          userAgent: null
        }
      });
    }

    return created;
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, role: true, pointsBalance: true }
  });

  return res.json({
    mode: 'mock',
    pricing: { amountCents: planAmountCents, discountCents, finalAmountCents, currency, promoCode: promo?.code || null },
    subscription: sub,
    user: publicUser(updated)
  });
});

// Promotion/referral
app.post('/api/referrals/click', async (req, res) => {
  const schema = z.object({ code: z.string().min(3).max(32) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const ref = await prisma.referralCode.findUnique({ where: { code: String(parsed.data.code).toLowerCase() }, select: { id: true } });
  if (ref) {
    await prisma.referralEvent.create({
      data: {
        referralCodeId: ref.id,
        eventType: 'click',
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined
      }
    });
  }
  return res.json({ ok: true });
});

app.get('/api/referrals/me', requireAuth, async (req, res) => {
  const userId = req.auth.user.id;
  const code = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true, id: true } });
  if (!code) return res.json({ referral: null });
  const [clicks, registers, subscribes] = await Promise.all([
    prisma.referralEvent.count({ where: { referralCodeId: code.id, eventType: 'click' } }),
    prisma.referralEvent.count({ where: { referralCodeId: code.id, eventType: 'register' } }),
    prisma.referralEvent.count({ where: { referralCodeId: code.id, eventType: 'subscribe' } })
  ]);
  return res.json({ referral: { code: code.code, clicks, registers, subscribes } });
});

// IP check (simple demo: allow all unless whitelist-only enabled)
app.get('/api/ip/check', async (req, res) => {
  const ip = normalizeIp(req.ip);
  const mode = (process.env.IP_WHITELIST_MODE || 'disabled').toLowerCase(); // disabled | allowlist
  if (mode !== 'allowlist') return res.json({ allowed: true, ip });
  const entries = await prisma.ipWhitelist.findMany({ where: { enabled: true }, select: { ipCidr: true } });
  // Very lightweight: exact match only for demo
  const allowed = entries.some((e) => {
    const rule = String(e.ipCidr || '').trim();
    if (!rule) return false;
    if (rule === ip) return true;
    if (rule.endsWith('/32') && rule.slice(0, -3) === ip) return true;
    if (rule.endsWith('/128') && rule.slice(0, -4) === ip) return true;
    return false;
  });
  return res.json({ allowed, ip });
});

// Admin endpoints (minimal)
app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      email: true,
      displayName: true,
      username: true,
      role: true,
      pointsBalance: true,
      isBanned: true,
      bannedUntil: true,
      bannedReason: true,
      createdAt: true
    }
  });
  return res.json({ users });
});

app.get('/api/admin/novels', requireAdmin, async (req, res) => {
  const take = Math.min(Number(req.query.take || 200), 500);
  const items = await prisma.novel.findMany({
    orderBy: { updatedAt: 'desc' },
    take,
    select: { id: true, slug: true, title: true, authorName: true, coverUrl: true, tags: true, isPublished: true, updatedAt: true }
  });
  return res.json({ items });
});

app.get('/api/admin/novels/:slug', requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  const novel = await prisma.novel.findUnique({ where: { slug } });
  if (!novel) return res.status(404).json({ error: 'not_found' });
  return res.json({ novel });
});

app.get('/api/admin/novels/:slug/chapters', requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });
  const chapters = await prisma.chapter.findMany({
    where: { novelId: novel.id },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, orderIndex: true, title: true, wordCount: true, isFree: true, isPublished: true, updatedAt: true }
  });
  return res.json({ chapters });
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = String(req.params.id);
  const schema = z.object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    pointsDelta: z.number().int().optional(),
    ban: z
      .object({
        isBanned: z.boolean(),
        bannedUntil: z.string().datetime().optional().nullable(),
        bannedReason: z.string().max(200).optional().nullable()
      })
      .optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!u) return res.status(404).json({ error: 'not_found' });

  await prisma.$transaction(async (tx) => {
    if (parsed.data.role) {
      await tx.user.update({ where: { id: userId }, data: { role: parsed.data.role } });
    }
    if (parsed.data.pointsDelta && parsed.data.pointsDelta !== 0) {
      await tx.user.update({ where: { id: userId }, data: { pointsBalance: { increment: parsed.data.pointsDelta } } });
      await tx.pointsLedger.create({
        data: { userId, delta: parsed.data.pointsDelta, reason: 'admin_adjust', metadata: { by: req.auth.user.id } }
      });
    }
    if (parsed.data.ban) {
      await tx.user.update({
        where: { id: userId },
        data: {
          isBanned: parsed.data.ban.isBanned,
          bannedUntil: parsed.data.ban.bannedUntil ? new Date(parsed.data.ban.bannedUntil) : null,
          bannedReason: parsed.data.ban.bannedReason ?? null
        }
      });
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      username: true,
      role: true,
      pointsBalance: true,
      isBanned: true,
      bannedUntil: true,
      bannedReason: true
    }
  });
  return res.json({ user: updated });
});

// Admin promo codes
app.get('/api/admin/promo-codes', requireAdmin, async (_req, res) => {
  const items = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return res.json({ items });
});

app.post('/api/admin/promo-codes', requireAdmin, async (req, res) => {
  const schema = z.object({
    code: z.string().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),
    type: z.enum(['PERCENT', 'AMOUNT', 'COINS']),
    value: z.number().int().positive(),
    expiresAt: z.string().datetime().optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    note: z.string().max(200).optional().nullable(),
    active: z.boolean().optional().default(true)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const created = await prisma.promoCode.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      type: parsed.data.type,
      value: parsed.data.value,
      active: parsed.data.active,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      maxRedemptions: parsed.data.maxRedemptions ?? null,
      note: parsed.data.note ?? null
    }
  });
  return res.json({ promoCode: created });
});

app.post('/api/admin/novels', requireAdmin, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    authorName: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().min(1),
    coverUrl: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    isPublished: z.boolean().optional().default(true),
    status: z.enum(['ONGOING', 'COMPLETED']).optional().default('ONGOING')
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const novel = await prisma.novel.create({ data: parsed.data });
  return res.json({ novel });
});

app.patch('/api/admin/novels/:slug', requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  console.log(`[PATCH] Updating novel ${slug}`, JSON.stringify(req.body));
  const schema = z.object({
    title: z.string().min(1).optional(),
    authorName: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    coverUrl: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    isPublished: z.boolean().optional(),
    status: z.enum(['ONGOING', 'COMPLETED']).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const novel = await prisma.novel.update({ where: { slug }, data: parsed.data });
  return res.json({ novel });
});

app.delete('/api/admin/novels/:slug', requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  await prisma.novel.delete({ where: { slug } });
  return res.json({ ok: true });
});

app.post('/api/admin/novels/:slug/chapters', requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  const schema = z.object({
    orderIndex: z.number().int().positive().optional(),
    title: z.string().optional(),
    content: z.string().min(1),
    isFree: z.boolean().optional().default(false),
    isPublished: z.boolean().optional().default(true)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const novel = await prisma.novel.findUnique({ where: { slug }, select: { id: true } });
  if (!novel) return res.status(404).json({ error: 'not_found' });

  let { orderIndex, title } = parsed.data;

  if (!orderIndex) {
    const last = await prisma.chapter.findFirst({
      where: { novelId: novel.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true }
    });
    orderIndex = (last?.orderIndex || 0) + 1;
  }
  
  if (!title) {
    title = "";
  }

  const chapter = await prisma.chapter.create({
    data: {
      novelId: novel.id,
      orderIndex: orderIndex,
      title: title,
      content: parsed.data.content,
      wordCount: parsed.data.content.length,
      isFree: parsed.data.isFree,
      isPublished: parsed.data.isPublished
    }
  });
  return res.json({ chapter });
});

app.get('/api/admin/chapters/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) return res.status(404).json({ error: 'not_found' });
  return res.json({ chapter });
});

app.patch('/api/admin/chapters/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const schema = z.object({
    title: z.string().optional(),
    content: z.string().min(1).optional(),
    orderIndex: z.number().int().positive().optional(),
    isFree: z.boolean().optional(),
    isPublished: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const chapter = await prisma.chapter.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.content ? { wordCount: parsed.data.content.length } : {})
    }
  });
  return res.json({ chapter });
});

app.delete('/api/admin/chapters/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  await prisma.chapter.delete({ where: { id } });
  return res.json({ ok: true });
});

// ---------------- Admin extensions (migrated from old Supabase UI) ----------------

// IP whitelist CRUD
app.get('/api/admin/ip-whitelist', requireAdmin, async (_req, res) => {
  const items = await prisma.ipWhitelist.findMany({ orderBy: { createdAt: 'desc' } });
  return res.json({ items });
});

app.post('/api/admin/ip-whitelist', requireAdmin, async (req, res) => {
  const schema = z.object({
    ipCidr: z.string().min(3).max(64),
    note: z.string().max(200).optional().nullable(),
    enabled: z.boolean().optional().default(true)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const item = await prisma.ipWhitelist.create({
    data: { ipCidr: parsed.data.ipCidr.trim(), note: parsed.data.note?.trim() || null, enabled: parsed.data.enabled }
  });
  return res.json({ item });
});

app.patch('/api/admin/ip-whitelist/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const schema = z.object({
    note: z.string().max(200).optional().nullable(),
    enabled: z.boolean().optional(),
    ipCidr: z.string().min(3).max(64).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const updated = await prisma.ipWhitelist.update({
    where: { id },
    data: {
      ...(parsed.data.ipCidr ? { ipCidr: parsed.data.ipCidr.trim() } : {}),
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {})
    }
  });
  return res.json({ item: updated });
});

app.delete('/api/admin/ip-whitelist/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  await prisma.ipWhitelist.delete({ where: { id } });
  return res.json({ ok: true });
});

// Comments moderation
app.get('/api/admin/comments', requireAdmin, async (req, res) => {
  const take = Math.min(Number(req.query.take || 200), 500);
  const skip = Math.max(Number(req.query.skip || 0), 0);
  const items = await prisma.comment.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, email: true, displayName: true, username: true } },
      novel: { select: { slug: true, title: true } },
      chapter: { select: { id: true, orderIndex: true, title: true } }
    }
  });
  const total = await prisma.comment.count();
  return res.json({ items, total, take, skip });
});

app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  await prisma.comment.delete({ where: { id } });
  return res.json({ ok: true });
});

// Notifications
app.get('/api/admin/notifications', requireAdmin, async (_req, res) => {
  const items = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  return res.json({ items });
});

app.post('/api/admin/notifications', requireAdmin, async (req, res) => {
  const schema = z.object({ title: z.string().min(1).max(120), message: z.string().min(1).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const created = await prisma.notification.create({ data: { title: parsed.data.title.trim(), message: parsed.data.message.trim() } });
  return res.json({ notification: created });
});

app.patch('/api/admin/notifications/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const schema = z.object({ isRead: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const updated = await prisma.notification.update({
    where: { id },
    data: { ...(parsed.data.isRead !== undefined ? { isRead: parsed.data.isRead } : {}) }
  });
  return res.json({ notification: updated });
});

app.delete('/api/admin/notifications/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  await prisma.notification.delete({ where: { id } });
  return res.json({ ok: true });
});

// Site settings (seo/general/backup status, etc.)
app.get('/api/admin/site-settings', requireAdmin, async (_req, res) => {
  const items = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  return res.json({ items });
});

app.put('/api/admin/site-settings/:key', requireAdmin, async (req, res) => {
  const key = String(req.params.key);
  const schema = z.object({ value: z.any().optional().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const updated = await prisma.siteSetting.upsert({
    where: { key },
    update: { value: parsed.data.value ?? null },
    create: { key, value: parsed.data.value ?? null }
  });
  return res.json({ item: updated });
});

// Analytics (computed from current schema)
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 1), 180);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totalUsers, totalChapters, totalViewsAgg, activeSubs, topNovels] = await Promise.all([
    prisma.user.count(),
    prisma.chapter.count(),
    prisma.novel.aggregate({ _sum: { views: true } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
    prisma.novel.findMany({
      where: { isPublished: true },
      orderBy: [{ views: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
      select: { slug: true, title: true, views: true, rating: true, ratingCount: true, category: true }
    })
  ]);

  // Subscription distribution: by active subs planId + free users
  const subsByPlan = await prisma.subscription.groupBy({
    by: ['planId'],
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
    _count: { _all: true }
  });
  const subscribedUserIds = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
    distinct: ['userId'],
    select: { userId: true }
  });
  const freeUsers = Math.max(0, totalUsers - subscribedUserIds.length);
  const subscriptionDistribution = [
    { name: 'free', value: freeUsers },
    ...subsByPlan.map((x) => ({ name: x.planId || 'unknown', value: x._count._all }))
  ];

  // Daily activity (registrations / subscriptions / reads)
  const [regRows, subRows, readRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT date_trunc('day', "startsAt") AS day, COUNT(*)::int AS count
      FROM "Subscription"
      WHERE "startsAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT date_trunc('day', "updatedAt") AS day, COUNT(*)::int AS count
      FROM "ReadingHistory"
      WHERE "updatedAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `
  ]);

  const toKey = (d) => new Date(d).toISOString().slice(0, 10);
  const regMap = new Map(regRows.map((r) => [toKey(r.day), Number(r.count)]));
  const subMap = new Map(subRows.map((r) => [toKey(r.day), Number(r.count)]));
  const readMap = new Map(readRows.map((r) => [toKey(r.day), Number(r.count)]));

  const dailyActivity = [];
  for (let i = days; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = toKey(day);
    dailyActivity.push({
      date: key,
      visits: readMap.get(key) || 0,
      subscriptions: subMap.get(key) || 0,
      registrations: regMap.get(key) || 0
    });
  }

  return res.json({
    stats: {
      totalViews: totalViewsAgg._sum.views || 0,
      totalUsers,
      premiumUsers: activeSubs,
      totalChapters,
      topNovels,
      subscriptionDistribution,
      dailyActivity
    }
  });
});

// Backup (simple JSON snapshot stored on API server filesystem with static resources)

import AdmZip from 'adm-zip';
import { createReadStream } from 'node:fs';

function backupDir() {
  return path.resolve(process.cwd(), 'backups');
}
function backupFilePath() {
  return path.join(backupDir(), 'backup-latest.zip');
}

app.get('/api/admin/backup/status', requireAdmin, async (_req, res) => {
  const status = await prisma.siteSetting.findUnique({ where: { key: 'backup_status' } });
  return res.json({ status: status?.value || null });
});

app.post('/api/admin/backup/run', requireAdmin, async (_req, res) => {
  await fs.promises.mkdir(backupDir(), { recursive: true });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    users: await prisma.user.findMany({
      select: { id: true, email: true, displayName: true, username: true, role: true, pointsBalance: true, isBanned: true, bannedUntil: true, bannedReason: true, createdAt: true }
    }),
    novels: await prisma.novel.findMany(),
    chapters: await prisma.chapter.findMany(),
    subscriptions: await prisma.subscription.findMany(),
    promoCodes: await prisma.promoCode.findMany(),
    promoRedemptions: await prisma.promoRedemption.findMany(),
    pointsLedger: await prisma.pointsLedger.findMany(),
    referralCodes: await prisma.referralCode.findMany(),
    referralEvents: await prisma.referralEvent.findMany(),
    ipWhitelist: await prisma.ipWhitelist.findMany(),
    comments: await prisma.comment.findMany(),
    notifications: await prisma.notification.findMany(),
    siteSettings: await prisma.siteSetting.findMany()
  };

  const jsonPath = path.join(backupDir(), 'snapshot.json');
  const json = JSON.stringify(snapshot, null, 2);
  await fs.promises.writeFile(jsonPath, json, 'utf8');

  // Pack static resources
  const output = fs.createWriteStream(backupFilePath());
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => console.log('Backup zip created'));
  archive.on('warning', (err) => { throw err; });
  archive.on('error', (err) => { throw err; });

  archive.pipe(output);
  archive.file(jsonPath, { name: 'snapshot.json' });
  archive.directory('uploads/', 'resources/');
  await archive.finalize();

  await fs.promises.unlink(jsonPath); // Clean up temp json

  const stat = await fs.promises.stat(backupFilePath());
  const statusValue = { lastBackupAt: snapshot.generatedAt, sizeBytes: stat.size };
  await prisma.siteSetting.upsert({
    where: { key: 'backup_status' },
    update: { value: statusValue },
    create: { key: 'backup_status', value: statusValue }
  });

  return res.json({ ok: true, status: statusValue });
});

app.get('/api/admin/backup/download', requireAdmin, async (_req, res) => {
  try {
    await fs.promises.stat(backupFilePath());
  } catch (_e) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.download(backupFilePath(), 'backup-latest.zip');
});

app.post('/api/admin/backup/restore', requireAdmin, upload.single('backupFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });

  const zipPath = req.file.path;
  try {
    const zip = new AdmZip(zipPath);
    const tempDir = path.join(backupDir(), 'restore-temp');
    await fs.promises.mkdir(tempDir, { recursive: true });
    zip.extractAllTo(tempDir, true);

    // Restore database snapshot
    const snapshotPath = path.join(tempDir, 'snapshot.json');
    const snapshot = JSON.parse(await fs.promises.readFile(snapshotPath, 'utf8'));

    await prisma.$transaction(async (tx) => {
      // Clear existing data (careful in production!)
      await tx.user.deleteMany();
      await tx.novel.deleteMany();
      await tx.chapter.deleteMany();
      await tx.subscription.deleteMany();
      await tx.promoCode.deleteMany();
      await tx.promoRedemption.deleteMany();
      await tx.pointsLedger.deleteMany();
      await tx.referralCode.deleteMany();
      await tx.referralEvent.deleteMany();
      await tx.ipWhitelist.deleteMany();
      await tx.comment.deleteMany();
      await tx.notification.deleteMany();
      await tx.siteSetting.deleteMany();

      // Restore data
      await tx.user.createMany({ data: snapshot.users });
      await tx.novel.createMany({ data: snapshot.novels });
      await tx.chapter.createMany({ data: snapshot.chapters });
      await tx.subscription.createMany({ data: snapshot.subscriptions });
      await tx.promoCode.createMany({ data: snapshot.promoCodes });
      await tx.promoRedemption.createMany({ data: snapshot.promoRedemptions });
      await tx.pointsLedger.createMany({ data: snapshot.pointsLedger });
      await tx.referralCode.createMany({ data: snapshot.referralCodes });
      await tx.referralEvent.createMany({ data: snapshot.referralEvents });
      await tx.ipWhitelist.createMany({ data: snapshot.ipWhitelist });
      await tx.comment.createMany({ data: snapshot.comments });
      await tx.notification.createMany({ data: snapshot.notifications });
      await tx.siteSetting.createMany({ data: snapshot.siteSettings });
    });

    // Restore static resources
    const resourcesDir = path.join(tempDir, 'resources');
    await fs.promises.cp(resourcesDir, 'uploads/', { recursive: true });

    // Cleanup
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    await fs.promises.unlink(zipPath);

    return res.json({ ok: true, message: 'Restore successful' });
  } catch (error) {
    console.error('Restore failed:', error);
    return res.status(500).json({ error: 'restore_failed', message: error.message });
  }
});

// File upload
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  if (res.headersSent) {
    return next(err);
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'conflict', message: 'Unique constraint violation' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'not_found', message: 'Record not found' });
  }

  // Zod errors
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'invalid_input', details: err.flatten() });
  }

  return res.status(500).json({ 
    error: 'internal_server_error', 
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Unknown error')
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on :${port}`);
});

