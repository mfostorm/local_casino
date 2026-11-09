import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { resolve } from 'node:path';
import { Casino, check } from './store.js';
import { AVATARS } from '../shared/model.js';
const app = express(),
  server = createServer(app),
  io = new Server(server, { maxHttpBufferSize: 32768 });
const casino = new Casino(process.env.DB_PATH || 'data/casino.sqlite');
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
const limits = new Map<string, { count: number; until: number }>();
app.use('/api', (req, res, next) => {
  const key = req.ip || 'unknown',
    now = Date.now();
  let l = limits.get(key);
  if (!l || l.until < now) {
    l = { count: 0, until: now + 60000 };
    limits.set(key, l);
  }
  if (++l.count > 240)
    return res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
  next();
});
setInterval(() => {
  for (const [key, l] of limits) if (l.until < Date.now()) limits.delete(key);
}, 60000).unref();
function text(value: unknown, fallback: string, max: number) {
  const s = typeof value === 'string' ? value.trim() : fallback;
  check(s.length > 0 && s.length <= max, 'Проверьте длину имени или названия');
  return s;
}
function auth(req: express.Request) {
  const token = req.headers.authorization?.replace(/^Bearer /, '') || '';
  check(token.length === 64, 'Нужно подключиться к комнате');
  return casino.authenticate(token);
}
function broadcast(code: string) {
  for (const socket of io.sockets.sockets.values())
    if (socket.data.code === code)
      try {
        const { room, session } = casino.authenticate(socket.data.token);
        socket.emit('state', casino.view(room, session));
      } catch {
        socket.disconnect(true);
      }
}
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Михрюказино' }));
app.post('/api/rooms', (req, res) => {
  const { room, token } = casino.create(
    text(req.body.name, 'Ведущий', 24),
    text(req.body.title, 'Вечер в Михрюказино', 48),
  );
  res.status(201).json({ token, code: room.code });
});
app.get('/api/rooms/:code', (req, res) => {
  const r = casino.rooms.get(String(req.params.code));
  check(!!r, 'Комната не найдена');
  res.json({ code: r.code, title: r.title, count: r.players.length, ended: r.phase === 'ended' });
});
app.post('/api/rooms/:code/join', (req, res) => {
  const r = casino.rooms.get(String(req.params.code));
  check(!!r, 'Комната не найдена');
  const avatar = AVATARS.includes(req.body.avatar) ? req.body.avatar : AVATARS[1];
  const token = casino.join(r, text(req.body.name, '', 24), avatar);
  broadcast(r.code);
  res.json({ token, code: r.code });
});
app.get('/api/session', (req, res) => {
  const { room, session } = auth(req);
  res.json(casino.view(room, session));
});
app.post('/api/action', (req, res) => {
  const { room, session } = auth(req);
  const result = casino.act(room, session, req.body);
  broadcast(room.code);
  res.json({ ok: true, ...result, state: casino.view(room, session) });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Адрес не найден' }));
io.use((socket, next) => {
  try {
    const t = socket.handshake.auth.token;
    check(typeof t === 'string' && t.length === 64, 'Нет сессии');
    const { room } = casino.authenticate(t);
    socket.data.token = t;
    socket.data.code = room.code;
    next();
  } catch {
    next(new Error('Сессия недействительна'));
  }
});
io.on('connection', (socket) => {
  const { room, session } = casino.authenticate(socket.data.token);
  socket.emit('state', casino.view(room, session));
});
setInterval(() => {
  for (const r of casino.tick()) broadcast(r.code);
}, 200).unref();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
  res.status(400).json({ error: error.message || 'Не удалось выполнить действие' }),
);
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Михрюказино · http://0.0.0.0:${port}`));
function shutdown() {
  io.close();
  server.close(() => {
    casino.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
