import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import {
  type Player,
  type PublicRoom,
  type Settings,
  type Round,
  type Game,
  type Ledger,
  type Outcome,
  DEFAULT_SETTINGS,
  optionsFor,
  GAMES,
  AVATARS,
  handValue,
} from '../shared/model.js';
import { shoe, draw, generateOutcome, payout, natural, blackjackPayout } from './games.js';
export type Session = { hash: string; role: 'host' | 'player' | 'spectator'; playerId?: string };
export type Room = Omit<
  PublicRoom,
  'now' | 'role' | 'selfId' | 'spectatorToken' | 'recoveryToken'
> & {
  sessions: Session[];
  spectatorToken: string;
  shoes: { blackjack: ReturnType<typeof shoe>; baccarat: ReturnType<typeof shoe> };
  seen: string[];
};
export const token = () => randomBytes(32).toString('hex');
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export class Casino {
  db: DatabaseSync;
  rooms = new Map<string, Room>();
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL)',
    );
    for (const row of this.db.prepare('SELECT state FROM rooms').all()) {
      const room = JSON.parse(String(row.state)) as Room;
      this.rooms.set(room.code, room);
    }
    this.recover();
  }
  save(r: Room) {
    this.db
      .prepare(
        'INSERT INTO rooms(code,state) VALUES (?,?) ON CONFLICT(code) DO UPDATE SET state=excluded.state',
      )
      .run(r.code, JSON.stringify(r));
  }
  transaction<T>(r: Room, fn: () => T): T {
    const before = structuredClone(r);
    try {
      const value = fn();
      r.version++;
      this.save(r);
      return value;
    } catch (e) {
      Object.assign(r, before);
      throw e;
    }
  }
  create(name: string, title: string) {
    const hostToken = token(),
      spectatorToken = token();
    let code = '';
    do {
      code = String(randomInt(100000, 1000000));
    } while (this.rooms.has(code));
    const p = this.makePlayer(name, AVATARS[0], DEFAULT_SETTINGS.startingBalance);
    const r: Room = {
      code,
      title,
      game: 'roulette',
      phase: 'lobby',
      paused: false,
      settings: { ...DEFAULT_SETTINGS },
      players: [p],
      roundNumber: 0,
      history: [],
      ledger: [],
      version: 0,
      sessions: [
        { hash: hash(hostToken), role: 'host', playerId: p.id },
        { hash: hash(spectatorToken), role: 'spectator' },
      ],
      spectatorToken,
      shoes: { blackjack: [], baccarat: [] },
      seen: [],
    };
    this.credit(r, p, 0, 'Начальный баланс', false);
    this.save(r);
    this.rooms.set(code, r);
    return { room: r, token: hostToken };
  }
  makePlayer(name: string, avatar: string, balance: number): Player {
    return { id: randomUUID(), name, avatar, balance, rebuys: 0, rebuyRequested: false };
  }
  join(r: Room, name: string, avatar: string) {
    return this.transaction(r, () => {
      check(r.phase !== 'ended', 'Вечер уже завершён');
      check(r.players.length < 10, 'За столом уже 10 игроков');
      check(
        !r.players.some((p) => p.name.toLocaleLowerCase() === name.toLocaleLowerCase()),
        'Такое имя уже занято',
      );
      const p = this.makePlayer(name, avatar, r.settings.startingBalance),
        t = token();
      r.players.push(p);
      r.sessions.push({ hash: hash(t), role: 'player', playerId: p.id });
      this.credit(r, p, 0, 'Начальный баланс', false);
      return t;
    });
  }
  authenticate(t: string) {
    const h = hash(t);
    for (const r of this.rooms.values()) {
      const s = r.sessions.find((s) => s.hash === h);
      if (s) return { room: r, session: s };
    }
    throw new Error('Сессия не найдена. Подключитесь к комнате заново.');
  }
  credit(r: Room, p: Player, amount: number, reason: string, apply = true) {
    if (apply) p.balance += amount;
    check(
      Number.isSafeInteger(p.balance) && p.balance >= 0 && p.balance <= 1e13,
      'Недопустимый баланс',
    );
    r.ledger.push({
      id: randomUUID(),
      at: Date.now(),
      playerId: p.id,
      amount: apply ? amount : p.balance,
      reason,
      roundId: r.round?.id,
    });
  }
  view(r: Room, s: Session): PublicRoom {
    const round = r.round ? structuredClone(r.round) : undefined;
    if (round) delete (round as SecretRound).secretOutcome;
    if (round?.blackjack && r.phase !== 'result' && r.phase !== 'ended')
      round.blackjack.dealer = round.blackjack.dealer.map((c, i) => (i === 0 ? c : null));
    return {
      code: r.code,
      title: r.title,
      game: r.game,
      phase: r.phase,
      paused: r.paused,
      settings: r.settings,
      players: r.players,
      round,
      roundNumber: r.roundNumber,
      history: r.history.slice(-20),
      ledger: (s.role === 'host'
        ? r.ledger
        : r.ledger.filter((x) => x.playerId === s.playerId)
      ).slice(-100),
      version: r.version,
      now: Date.now(),
      role: s.role,
      selfId: s.playerId,
      ...(s.role === 'host' ? { spectatorToken: r.spectatorToken } : {}),
    };
  }
  recover() {
    for (const r of this.rooms.values())
      if (['betting', 'playing'].includes(r.phase)) {
        this.transaction(r, () => this.cancel(r, 'Возврат после перезапуска сервера'));
      }
  }
  cancel(r: Room, reason: string) {
    if (r.round) {
      if (r.round.blackjack) {
        for (const seat of r.round.blackjack.seats)
          for (const h of seat.hands)
            this.credit(
              r,
              r.players.find((p) => p.id === seat.playerId)!,
              h.stake,
              reason,
            );
      } else
        for (const b of r.round.bets)
          this.credit(
            r,
            r.players.find((p) => p.id === b.playerId)!,
            b.amount,
            reason,
          );
    }
    r.phase = 'lobby';
    r.paused = true;
    r.round = undefined;
  }
  open(r: Room) {
    check(r.phase === 'lobby' || r.phase === 'result', 'Сначала завершите текущий раунд');
    check(!r.paused, 'Снимите стол с паузы');
    r.phase = 'betting';
    r.roundNumber++;
    r.round = {
      id: randomUUID(),
      number: r.roundNumber,
      game: r.game,
      bets: [],
      skips: [],
      startedAt: Date.now(),
      deadline: Date.now() + r.settings.betSeconds * 1000,
    };
  }
  begin(r: Room) {
    check(r.phase === 'betting', 'Приём ставок уже закрыт');
    const rd = r.round!;
    if (!rd.bets.length) {
      r.phase = 'result';
      rd.deadline = Date.now() + 8000;
      rd.payouts = {};
      return;
    }
    r.phase = 'playing';
    rd.startedAt = Date.now();
    rd.deadline = Date.now() + (r.game === 'ducks' ? 18000 : r.game === 'roulette' ? 5500 : 2200);
    if (r.game === 'blackjack') {
      if (r.shoes.blackjack.length < 104) r.shoes.blackjack = shoe(6);
      const deck = r.shoes.blackjack;
      rd.blackjack = {
        seats: rd.bets.map((b) => ({
          playerId: b.playerId,
          hands: [
            {
              cards: [],
              stake: b.amount,
              status: 'playing',
              split: false,
              splitAces: false,
              deadline: Date.now() + r.settings.actionSeconds * 1000,
            },
          ],
        })),
        dealer: [],
      };
      for (let pass = 0; pass < 2; pass++) {
        for (const seat of rd.blackjack.seats) seat.hands[0].cards.push(draw(deck));
        rd.blackjack.dealer.push(draw(deck));
      }
      for (const seat of rd.blackjack.seats)
        if (natural(seat.hands[0])) seat.hands[0].status = 'stood';
      if (handValue(rd.blackjack.dealer as any).total === 21) {
        for (const seat of rd.blackjack.seats) for (const h of seat.hands) h.status = 'stood';
      }
      this.finishBlackjackIfReady(r);
    } else {
      if (r.game === 'baccarat' && r.shoes.baccarat.length < 104) r.shoes.baccarat = shoe(8);
      // Secret result remains server-only until the presentation deadline.
      (rd as SecretRound).secretOutcome = generateOutcome(r.game, r.shoes.baccarat);
    }
  }
  finishBlackjackIfReady(r: Room) {
    const bj = r.round!.blackjack!;
    if (bj.seats.some((s) => s.hands.some((h) => h.status === 'playing'))) return;
    const dealer = bj.dealer as NonNullable<(typeof bj.dealer)[number]>[];
    if (bj.seats.some((s) => s.hands.some((h) => h.status !== 'bust' && !natural(h))))
      while (handValue(dealer).total < 17) dealer.push(draw(r.shoes.blackjack));
    r.round!.outcome = { dealer };
    r.round!.payouts = {};
    for (const seat of bj.seats) {
      let total = 0;
      for (const h of seat.hands) {
        h.payout = blackjackPayout(h, dealer);
        total += h.payout;
      }
      r.round!.payouts[seat.playerId] = total;
      this.credit(
        r,
        r.players.find((p) => p.id === seat.playerId)!,
        total,
        'Выплата · Блэкджек',
      );
    }
    this.result(r, 'Дилер: ' + handValue(dealer).total);
  }
  result(r: Room, text: string) {
    r.phase = 'result';
    r.round!.deadline = Date.now() + 8000;
    r.history.push({ game: r.game, number: r.roundNumber, text });
    if (r.history.length > 100) r.history.shift();
  }
  settle(r: Room) {
    check(r.phase === 'playing', 'Раунд уже рассчитан');
    const rd = r.round as SecretRound;
    const o = rd.secretOutcome!;
    check(!!o, 'Результат отсутствует');
    rd.outcome = o;
    delete rd.secretOutcome;
    rd.payouts = {};
    for (const b of rd.bets)
      rd.payouts[b.playerId] = (rd.payouts[b.playerId] || 0) + payout(r.game, b, o);
    for (const [id, amount] of Object.entries(rd.payouts))
      this.credit(
        r,
        r.players.find((p) => p.id === id)!,
        amount,
        'Выплата · ' + GAMES[r.game].name,
      );
    this.result(
      r,
      r.game === 'roulette'
        ? String(o.number)
        : r.game === 'dice'
          ? o.dice!.join(' + ')
          : r.game === 'ducks'
            ? ['Барон Кряк', 'Леди Кря', 'Дон Плюх', 'Сэр Крякс'][o.winner!]
            : o.side === 'tie'
              ? 'Ничья'
              : o.side === 'player'
                ? 'Игрок'
                : 'Банкир',
    );
  }
  act(r: Room, s: Session, a: Record<string, any>) {
    check(s.role !== 'spectator', 'Экран зрителя не управляет игрой');
    check(
      typeof a.requestId === 'string' && a.requestId.length >= 8 && a.requestId.length <= 100,
      'Нужен идентификатор запроса',
    );
    const key = s.hash + ':' + a.requestId;
    if (r.seen.includes(key)) return;
    return this.transaction(r, () => {
      const p = r.players.find((p) => p.id === s.playerId)!;
      const host = () => check(s.role === 'host', 'Только ведущий может выполнить это действие');
      if (['bet', 'clear', 'skip', 'blackjack'].includes(a.type)) {
        check(
          typeof a.roundId === 'string' && a.roundId === r.round?.id,
          'Этот раунд уже завершён',
        );
      }
      if (['bet', 'clear', 'skip'].includes(a.type))
        check(Date.now() < r.round!.deadline, 'Время ставок истекло');
      switch (a.type) {
        case 'open':
          host();
          this.open(r);
          break;
        case 'close':
          host();
          this.begin(r);
          break;
        case 'game':
          host();
          check(r.phase === 'lobby' || r.phase === 'result', 'Игру можно сменить между раундами');
          check(typeof a.game === 'string' && Object.hasOwn(GAMES, a.game), 'Неизвестная игра');
          r.game = a.game as Game;
          r.phase = 'lobby';
          r.round = undefined;
          break;
        case 'pause':
          host();
          check(typeof a.paused === 'boolean', 'Некорректная пауза');
          r.paused = a.paused;
          break;
        case 'end':
          host();
          check(r.phase === 'lobby' || r.phase === 'result', 'Дождитесь завершения раунда');
          r.phase = 'ended';
          break;
        case 'settings': {
          host();
          check(r.phase === 'lobby' || r.phase === 'result', 'Настройки меняются между раундами');
          const next = validateSettings({ ...r.settings, ...a.settings });
          const difference = next.startingBalance - r.settings.startingBalance;
          if (difference !== 0) {
            check(r.roundNumber === 0, 'Стартовый баланс фиксируется с первым раундом');
            for (const player of r.players)
              this.credit(r, player, difference, 'Изменение стартового баланса');
          }
          r.settings = next;
          break;
        }
        case 'grant': {
          host();
          check(r.phase !== 'ended', 'Вечер завершён');
          const amount = integer(a.amount, 1000, 100000000);
          check(amount % 1000 === 0, 'Сумма должна быть кратна 10 фишкам');
          const recipients =
            a.playerId === 'all' ? r.players : r.players.filter((p) => p.id === a.playerId);
          check(recipients.length > 0, 'Игрок не найден');
          for (const player of recipients) this.credit(r, player, amount, 'Выдача ведущим');
          break;
        }
        case 'rebuy-request':
          check(r.phase !== 'ended', 'Вечер завершён');
          if (a.forfeitRemainder === true) {
            check(
              p.balance > 0 && p.balance < r.settings.minBet,
              'Можно сдать только остаток меньше минимальной ставки',
            );
            check(
              !(
                ['betting', 'playing'].includes(r.phase) &&
                r.round?.bets.some((b) => b.playerId === p.id)
              ),
              'Сначала дождитесь расчёта ваших ставок',
            );
            this.credit(r, p, -p.balance, 'Добровольная сдача остатка');
          }
          this.canRebuy(r, p);
          p.rebuyRequested = true;
          break;
        case 'rebuy': {
          host();
          const player = r.players.find((p) => p.id === a.playerId);
          check(!!player, 'Игрок не найден');
          check(r.phase !== 'ended', 'Вечер завершён');
          this.canRebuy(r, player!);
          check(player!.rebuyRequested, 'Игрок ещё не запросил возвращение');
          player!.rebuys++;
          player!.rebuyRequested = false;
          this.credit(r, player!, r.settings.startingBalance, 'Повторный вход №' + player!.rebuys);
          break;
        }
        case 'recover': {
          host();
          check(!!r.players.find((p) => p.id === a.playerId), 'Игрок не найден');
          check(a.playerId !== s.playerId, 'Свою сессию заменять нельзя');
          const t = token();
          r.sessions = r.sessions.filter((x) => x.playerId !== a.playerId);
          r.sessions.push({ hash: hash(t), role: 'player', playerId: a.playerId });
          r.seen.push(key);
          return { recoveryToken: t };
        }
        case 'bet': {
          check(r.phase === 'betting', 'Ставки уже закрыты');
          const opt = optionsFor(r.game).find((o) => o.id === a.target);
          check(!!opt, 'Недопустимая ставка');
          const amount = integer(a.amount, r.settings.minBet, r.settings.maxBet);
          check(amount % 1000 === 0, 'Ставка должна быть кратна 10 фишкам');
          const rd = r.round!;
          if (r.game === 'ducks' || r.game === 'blackjack')
            check(
              !rd.bets.some((b) => b.playerId === p.id && b.target !== a.target),
              'Выберите только один исход',
            );
          const old = rd.bets.find((b) => b.playerId === p.id && b.target === a.target);
          const delta = amount - (old?.amount || 0);
          const total = rd.bets
            .filter((b) => b.playerId === p.id && b.target !== a.target)
            .reduce((sum, b) => sum + b.amount, amount);
          check(total <= r.settings.maxBet, 'Превышен общий лимит на раунд');
          check(p.balance >= delta, 'Недостаточно фишек');
          this.credit(r, p, -delta, 'Ставка · ' + opt!.label);
          if (old) old.amount = amount;
          else rd.bets.push({ playerId: p.id, target: a.target, amount });
          rd.skips = rd.skips.filter((id) => id !== p.id);
          break;
        }
        case 'clear':
        case 'skip': {
          check(r.phase === 'betting', 'Ставки уже закрыты');
          const rd = r.round!;
          for (const b of rd.bets.filter((b) => b.playerId === p.id))
            this.credit(r, p, b.amount, 'Возврат ставки');
          rd.bets = rd.bets.filter((b) => b.playerId !== p.id);
          rd.skips = rd.skips.filter((id) => id !== p.id);
          if (a.type === 'skip') rd.skips.push(p.id);
          break;
        }
        case 'blackjack': {
          check(r.phase === 'playing' && r.game === 'blackjack', 'Сейчас нет раздачи блэкджека');
          const rd = r.round!,
            seat = rd.blackjack!.seats.find((x) => x.playerId === p.id);
          check(!!seat, 'Вы пропустили раздачу');
          const index = seat!.hands.findIndex((h) => h.status === 'playing');
          check(index >= 0, 'Все руки завершены');
          const h = seat!.hands[index];
          check(a.handIndex === index, 'Эта рука уже завершена');
          check(Date.now() < h.deadline, 'Время решения истекло');
          const deck = r.shoes.blackjack;
          if (a.move === 'stand') h.status = 'stood';
          else if (a.move === 'hit') {
            h.cards.push(draw(deck));
            const total = handValue(h.cards).total;
            if (total >= 21) h.status = total > 21 ? 'bust' : 'stood';
          } else if (a.move === 'double') {
            check(h.cards.length === 2 && !h.splitAces, 'Удвоение недоступно');
            check(p.balance >= h.stake, 'Недостаточно фишек');
            this.credit(r, p, -h.stake, 'Удвоение');
            h.stake *= 2;
            h.cards.push(draw(deck));
            h.status = handValue(h.cards).total > 21 ? 'bust' : 'stood';
          } else if (a.move === 'split') {
            check(
              h.cards.length === 2 &&
                h.cards[0].rank === h.cards[1].rank &&
                seat!.hands.length < 4 &&
                !h.splitAces,
              'Разделение недоступно',
            );
            check(p.balance >= h.stake, 'Недостаточно фишек');
            this.credit(r, p, -h.stake, 'Разделение');
            const c = h.cards.pop()!;
            h.split = true;
            h.splitAces = c.rank === 1;
            h.cards.push(draw(deck));
            const second = { ...h, cards: [c, draw(deck)] };
            seat!.hands.splice(index + 1, 0, second);
            for (const hand of [h, second])
              if (hand.splitAces || handValue(hand.cards).total === 21) hand.status = 'stood';
          } else throw new Error('Неизвестное действие');
          const next = seat!.hands.find((h) => h.status === 'playing');
          if (next) next.deadline = Date.now() + r.settings.actionSeconds * 1000;
          this.finishBlackjackIfReady(r);
          break;
        }
        default:
          throw new Error('Неизвестное действие');
      }
      r.seen.push(key);
      if (r.seen.length > 2000) r.seen.splice(0, r.seen.length - 2000);
    });
  }
  canRebuy(r: Room, p: Player) {
    check(p.balance === 0, 'Возвращение доступно только при нулевом балансе');
    check(p.rebuys < r.settings.maxRebuys, 'Лимит возвращений исчерпан');
    check(
      !(['betting', 'playing'].includes(r.phase) && r.round?.bets.some((b) => b.playerId === p.id)),
      'Сначала дождитесь расчёта ваших ставок',
    );
  }
  tick() {
    const changed: Room[] = [];
    for (const r of this.rooms.values())
      try {
        const now = Date.now();
        if (r.phase === 'betting' && now >= r.round!.deadline) {
          this.transaction(r, () => this.begin(r));
          changed.push(r);
        } else if (r.phase === 'playing' && r.game !== 'blackjack' && now >= r.round!.deadline) {
          this.transaction(r, () => this.settle(r));
          changed.push(r);
        } else if (r.phase === 'playing' && r.game === 'blackjack') {
          const seats = r.round!.blackjack!.seats.filter(
            (s) => (s.hands.find((h) => h.status === 'playing')?.deadline ?? Infinity) <= now,
          );
          if (seats.length) {
            this.transaction(r, () => {
              for (const s of seats) {
                const h = s.hands.find((h) => h.status === 'playing')!;
                h.status = 'stood';
                const next = s.hands.find((h) => h.status === 'playing');
                if (next) next.deadline = now + r.settings.actionSeconds * 1000;
              }
              this.finishBlackjackIfReady(r);
            });
            changed.push(r);
          }
        } else if (
          r.phase === 'result' &&
          r.settings.auto &&
          !r.paused &&
          now >= r.round!.deadline
        ) {
          this.transaction(r, () => this.open(r));
          changed.push(r);
        }
      } catch (error) {
        console.error('Round recovery', r.code, error);
        this.transaction(r, () => this.cancel(r, 'Технический возврат'));
        changed.push(r);
      }
    return changed;
  }
  close() {
    this.db.close();
  }
}
type SecretRound = Round & { secretOutcome?: Outcome };
export function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function integer(value: unknown, min: number, max: number): number {
  check(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    `Допустимый диапазон: ${min / 100}–${max / 100}`,
  );
  return value;
}
export function validateSettings(s: Settings): Settings {
  integer(s.startingBalance, 1000, 100000000);
  integer(s.minBet, 1000, 10000000);
  integer(s.maxBet, s.minBet, 100000000);
  check(
    [s.startingBalance, s.minBet, s.maxBet].every((x) => x % 1000 === 0),
    'Суммы должны быть кратны 10 фишкам',
  );
  check(
    Number.isInteger(s.maxRebuys) && s.maxRebuys >= 0 && s.maxRebuys <= 20,
    'Лимит возвращений: 0–20',
  );
  check(
    Number.isInteger(s.betSeconds) && s.betSeconds >= 5 && s.betSeconds <= 180,
    'Время ставок: 5–180 секунд',
  );
  check(
    Number.isInteger(s.actionSeconds) && s.actionSeconds >= 5 && s.actionSeconds <= 120,
    'Время решения: 5–120 секунд',
  );
  check(typeof s.auto === 'boolean', 'Некорректный автоматический режим');
  return {
    startingBalance: s.startingBalance,
    minBet: s.minBet,
    maxBet: s.maxBet,
    maxRebuys: s.maxRebuys,
    betSeconds: s.betSeconds,
    actionSeconds: s.actionSeconds,
    auto: s.auto,
  };
}
