import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Casino, hash, type Room, type Session } from '../server/store.js';
import type { Card } from '../shared/model.js';
const fixtures: { dir: string; casino: Casino }[] = [];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'mihryu-'));
  const casino = new Casino(join(dir, 'test.sqlite'));
  fixtures.push({ dir, casino });
  const made = casino.create('Хозяин', 'Тестовый вечер'),
    r = made.room,
    s = casino.authenticate(made.token).session;
  const t = casino.join(r, 'Друг', '🦊'),
    p = casino.authenticate(t).session;
  return { casino, r, s, p, token: made.token };
}
afterEach(() => {
  for (const f of fixtures.splice(0)) {
    try {
      f.casino.close();
    } catch {}
    rmSync(f.dir, { recursive: true, force: true });
  }
});
function act(c: Casino, r: Room, s: Session, type: string, extra: Record<string, unknown> = {}) {
  return c.act(r, s, { type, requestId: randomUUID(), roundId: r.round?.id, ...extra });
}
function preset(r: Room, sequence: number[]) {
  r.shoes.blackjack = [
    ...Array.from({ length: 150 }, () => ({ rank: 10, suit: 0 })),
    ...sequence.map((rank) => ({ rank, suit: 0 })).reverse(),
  ];
}
function betBlackjack(f: ReturnType<typeof fixture>, sequence: number[]) {
  const { casino: c, r, s } = f;
  act(c, r, s, 'game', { game: 'blackjack' });
  act(c, r, s, 'open');
  act(c, r, s, 'bet', { target: 'hand', amount: 10000 });
  preset(r, sequence);
  act(c, r, s, 'close');
}
test('atomic bets, cancellation and duplicate request delivery', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'open');
  const request = {
    type: 'bet',
    target: 'n:7',
    amount: 10000,
    roundId: r.round!.id,
    requestId: randomUUID(),
  };
  c.act(r, s, request);
  c.act(r, s, request);
  assert.equal(r.players[0].balance, 990000);
  assert.equal(r.round!.bets.length, 1);
  act(c, r, s, 'clear');
  assert.equal(r.players[0].balance, 1000000);
  assert.equal(r.round!.bets.length, 0);
});
test('invalid, fractional, excessive, stale and late bets roll back entirely', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'open');
  for (const amount of [0, -1000, 1000.1, NaN, Infinity, 1000000, 1050])
    assert.throws(() => act(c, r, s, 'bet', { target: 'n:7', amount }));
  assert.throws(() => act(c, r, s, 'bet', { target: 'n:99', amount: 10000 }));
  assert.throws(() => act(c, r, s, 'bet', { target: 'n:7', amount: 10000, roundId: 'stale' }));
  assert.equal(r.players[0].balance, 1000000);
  act(c, r, s, 'bet', { target: 'n:7', amount: 10000 });
  act(c, r, s, 'close');
  assert.throws(() => act(c, r, s, 'clear'));
  assert.throws(() => act(c, r, s, 'bet', { target: 'n:8', amount: 10000 }));
  assert.equal(r.players[0].balance, 990000);
});
test('maximum bet is enforced across simultaneous selections', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'open');
  act(c, r, s, 'bet', { target: 'red', amount: 60000 });
  assert.throws(() => act(c, r, s, 'bet', { target: 'black', amount: 60000 }));
  assert.equal(r.players[0].balance, 940000);
});
test('spectators cannot act; players cannot administer; private projections omit outcome and shoes', () => {
  const { casino: c, r, s, p } = fixture(),
    spectator = c.authenticate(r.spectatorToken).session;
  assert.throws(() => act(c, r, spectator, 'open'));
  for (const type of ['open', 'close', 'game', 'settings', 'grant', 'rebuy', 'recover', 'end'])
    assert.throws(() => act(c, r, p, type));
  act(c, r, s, 'game', { game: 'ducks' });
  act(c, r, s, 'open');
  act(c, r, p, 'bet', { target: '1', amount: 10000 });
  act(c, r, s, 'close');
  for (const session of [s, p, spectator]) {
    const v = c.view(r, session),
      json = JSON.stringify(v);
    assert.equal(v.round?.outcome, undefined);
    assert.ok(!json.includes('secretOutcome'));
    assert.ok(!json.includes('shoes'));
    assert.ok(!json.includes('sessions'));
    if (session.role !== 'host') assert.ok(!json.includes(r.spectatorToken));
  }
});
test('settlement credits exactly once and allows the next round', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'game', { game: 'ducks' });
  act(c, r, s, 'open');
  act(c, r, s, 'bet', { target: '0', amount: 10000 });
  act(c, r, s, 'close');
  (r.round as any).secretOutcome = { winner: 0 };
  c.settle(r);
  assert.equal(r.players[0].balance, 1030000);
  assert.throws(() => c.settle(r));
  act(c, r, s, 'open');
  assert.equal(r.round!.number, 2);
});
test('blackjack hides dealer hole card, stands on soft 17, and pays a tied hand', () => {
  const f = fixture(),
    { casino: c, r, s } = f;
  betBlackjack(f, [10, 1, 7, 6]);
  assert.deepEqual(c.view(r, s).round!.blackjack!.dealer, [{ rank: 1, suit: 0 }, null]);
  act(c, r, s, 'blackjack', { move: 'stand', handIndex: 0 });
  assert.equal(r.phase, 'result');
  assert.equal(r.round!.blackjack!.dealer.length, 2);
  assert.equal(r.players[0].balance, 1000000);
});
test('dealer checks natural before player decisions and original natural pushes', () => {
  const f = fixture();
  betBlackjack(f, [1, 10, 13, 1]);
  assert.equal(f.r.phase, 'result');
  assert.equal(f.r.players[0].balance, 1000000);
  assert.throws(() => act(f.casino, f.r, f.s, 'blackjack', { move: 'hit', handIndex: 0 }));
});
test('doubling debits one additional stake and gives exactly one card', () => {
  const f = fixture(),
    { casino: c, r, s } = f;
  betBlackjack(f, [5, 10, 6, 7, 10]);
  act(c, r, s, 'blackjack', { move: 'double', handIndex: 0 });
  assert.equal(r.phase, 'result');
  const h = r.round!.blackjack!.seats[0].hands[0];
  assert.equal(h.cards.length, 3);
  assert.equal(h.stake, 20000);
  assert.equal(r.players[0].balance, 1020000);
});
test('split aces receive one card each and cannot resplit or count as natural', () => {
  const f = fixture(),
    { casino: c, r, s } = f;
  betBlackjack(f, [1, 10, 1, 7, 10, 1]);
  act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 });
  assert.equal(r.phase, 'result');
  const hands = r.round!.blackjack!.seats[0].hands;
  assert.equal(hands.length, 2);
  assert.ok(hands.every((h) => h.cards.length === 2 && h.splitAces && h.status === 'stood'));
  assert.equal(hands[0].payout, 20000);
  assert.equal(hands[1].payout, 0);
});
test('split caps at four hands and supports doubling after split', () => {
  const f = fixture(),
    { casino: c, r, s } = f;
  betBlackjack(f, [8, 10, 8, 7, 8, 8, 8, 8, 8, 8, 3]);
  act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 });
  act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 });
  act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 });
  assert.equal(r.round!.blackjack!.seats[0].hands.length, 4);
  assert.throws(() => act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 }));
  act(c, r, s, 'blackjack', { move: 'double', handIndex: 0 });
  assert.equal(r.round!.blackjack!.seats[0].hands[0].stake, 20000);
});
test('individual hand timeout advances only the current hand', () => {
  const f = fixture(),
    { casino: c, r, s } = f;
  betBlackjack(f, [8, 10, 8, 7, 2, 3]);
  act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 });
  const hands = r.round!.blackjack!.seats[0].hands;
  hands[1].deadline = 0;
  assert.equal(c.tick().length, 0);
  hands[0].deadline = 0;
  c.tick();
  assert.equal(hands[0].status, 'stood');
  assert.equal(hands[1].status, 'playing');
  assert.ok(hands[1].deadline > Date.now());
});
test('rebuy requires zero settled balance, host approval and respects shared limit', () => {
  const { casino: c, r, s, p } = fixture();
  act(c, r, s, 'settings', { settings: { maxRebuys: 1, maxBet: 1000000 } });
  assert.throws(() => act(c, r, p, 'rebuy-request'));
  act(c, r, s, 'open');
  act(c, r, p, 'bet', { target: 'n:1', amount: 1000000 });
  assert.equal(r.players[1].balance, 0);
  assert.throws(() => act(c, r, p, 'rebuy-request'));
  act(c, r, s, 'close');
  (r.round as any).secretOutcome = { number: 2 };
  c.settle(r);
  act(c, r, p, 'rebuy-request');
  act(c, r, s, 'rebuy', { playerId: p.playerId });
  assert.equal(r.players[1].balance, 1000000);
  assert.equal(r.players[1].rebuys, 1);
  assert.throws(() => act(c, r, s, 'rebuy', { playerId: p.playerId }));
  r.players[1].balance = 0;
  assert.throws(() => act(c, r, p, 'rebuy-request'));
});
test('restart safely refunds unresolved split and doubled hands, then remains idempotent', () => {
  const f = fixture(),
    { casino: c, r, s } = f;
  betBlackjack(f, [8, 10, 8, 7, 2, 3, 4]);
  act(c, r, s, 'blackjack', { move: 'split', handIndex: 0 });
  act(c, r, s, 'blackjack', { move: 'double', handIndex: 0 });
  assert.equal(r.players[0].balance, 970000);
  const path = join(fixtures[0].dir, 'test.sqlite');
  c.close();
  const restored = new Casino(path);
  fixtures[0].casino = restored;
  const rr = restored.rooms.get(r.code)!;
  assert.equal(rr.phase, 'lobby');
  assert.equal(rr.players[0].balance, 1000000);
  assert.equal(rr.paused, true);
  restored.close();
  const again = new Casino(path);
  fixtures[0].casino = again;
  assert.equal(again.rooms.get(r.code)!.players[0].balance, 1000000);
});
test('game switching, settings, and ending cannot interrupt active rounds', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'open');
  for (const type of ['game', 'settings', 'end'])
    assert.throws(() => act(c, r, s, type, { game: 'dice', settings: { auto: true } }));
  act(c, r, s, 'pause', { paused: true });
  act(c, r, s, 'close');
  assert.equal(r.phase, 'result');
  assert.throws(() => act(c, r, s, 'open'));
  act(c, r, s, 'end');
  assert.equal(r.phase, 'ended');
  assert.throws(() => act(c, r, s, 'open'));
});
test('recovery replaces player authentication without changing balance', () => {
  const { casino: c, r, s, p } = fixture();
  const result = act(c, r, s, 'recover', { playerId: p.playerId })!;
  assert.ok(result.recoveryToken);
  assert.equal(
    r.sessions.some((x) => x.hash === p.hash),
    false,
  );
  assert.equal(c.authenticate(result.recoveryToken).session.playerId, p.playerId);
  assert.equal(r.players[1].balance, 1000000);
});
test('tick closes betting, settles and auto opens without repeated calculations', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'settings', { settings: { auto: true } });
  act(c, r, s, 'game', { game: 'dice' });
  act(c, r, s, 'open');
  act(c, r, s, 'bet', { target: 'seven', amount: 10000 });
  r.round!.deadline = 0;
  c.tick();
  assert.equal(r.phase, 'playing');
  r.round!.deadline = 0;
  c.tick();
  assert.equal(r.phase, 'result');
  const balance = r.players[0].balance;
  c.tick();
  assert.equal(r.players[0].balance, balance);
  r.round!.deadline = 0;
  c.tick();
  assert.equal(r.phase, 'betting');
  assert.equal(r.roundNumber, 2);
});
test('bets reject expired server deadlines even before the scheduler runs', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'open');
  r.round!.deadline = Date.now() - 1;
  assert.throws(() => act(c, r, s, 'bet', { target: 'n:1', amount: 10000 }), /Время ставок/);
  assert.equal(r.players[0].balance, 1000000);
});
test('unknown and inherited game names never enter room state', () => {
  const { casino: c, r, s } = fixture();
  for (const game of ['__proto__', 'constructor', 'toString', 'slots', null])
    assert.throws(() => act(c, r, s, 'game', { game }));
  assert.equal(r.game, 'roulette');
});
test('starting balance changes equally for existing and new players, then locks after first round', () => {
  const { casino: c, r, s } = fixture();
  act(c, r, s, 'settings', { settings: { startingBalance: 500000 } });
  assert.deepEqual(
    r.players.map((p) => p.balance),
    [500000, 500000],
  );
  c.join(r, 'Третий', '🐸');
  assert.equal(r.players[2].balance, 500000);
  act(c, r, s, 'open');
  act(c, r, s, 'close');
  assert.throws(() => act(c, r, s, 'settings', { settings: { startingBalance: 1000000 } }));
});
test('small remainder is never removed silently and may be explicitly forfeited before rebuy', () => {
  const { casino: c, r, s, p } = fixture();
  r.players[1].balance = 950;
  assert.throws(() => act(c, r, p, 'rebuy-request'));
  assert.equal(r.players[1].balance, 950);
  act(c, r, p, 'rebuy-request', { forfeitRemainder: true });
  assert.equal(r.players[1].balance, 0);
  assert.ok(r.players[1].rebuyRequested);
  assert.equal(r.ledger.at(-1)!.amount, -950);
  act(c, r, s, 'rebuy', { playerId: p.playerId });
  assert.equal(r.players[1].balance, 1000000);
});
