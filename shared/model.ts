export type Game = 'roulette' | 'blackjack' | 'baccarat' | 'dice' | 'ducks';
export type Phase = 'lobby' | 'betting' | 'playing' | 'result' | 'ended';
export const GAMES: Record<Game, { name: string; subtitle: string; icon: string }> = {
  roulette: { name: 'Рулетка', subtitle: 'Ваше счастливое число', icon: '◉' },
  blackjack: { name: 'Блэкджек', subtitle: 'Ближе к двадцати одному', icon: '♠' },
  baccarat: { name: 'Бакара', subtitle: 'Доверьтесь картам', icon: '♦' },
  dice: { name: 'Кости', subtitle: 'Два кубика. Один шанс.', icon: '⚄' },
  ducks: { name: 'Утиные бега', subtitle: 'Четыре утки. Один чемпион.', icon: '🦆' },
};
export const DUCKS = [
  { name: 'Барон Кряк', color: '#edc45e' },
  { name: 'Леди Кря', color: '#ef8094' },
  { name: 'Дон Плюх', color: '#69c9b1' },
  { name: 'Сэр Крякс', color: '#99a9ef' },
];
export const AVATARS = ['🐷', '🦊', '🐸', '🐼', '🐯', '🐱', '🐻', '🦁', '🐰', '🦄'];
export const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
export type Card = { rank: number; suit: number };
export type Bet = { playerId: string; target: string; amount: number };
export type Hand = {
  cards: Card[];
  stake: number;
  status: 'playing' | 'stood' | 'bust';
  split: boolean;
  splitAces: boolean;
  deadline: number;
  payout?: number;
};
export type BlackjackSeat = { playerId: string; hands: Hand[] };
export type Settings = {
  startingBalance: number;
  minBet: number;
  maxBet: number;
  maxRebuys: number;
  betSeconds: number;
  actionSeconds: number;
  auto: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  startingBalance: 1000000,
  minBet: 1000,
  maxBet: 100000,
  maxRebuys: 3,
  betSeconds: 25,
  actionSeconds: 25,
  auto: false,
};
export type Player = {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  rebuys: number;
  rebuyRequested: boolean;
};
export type Ledger = {
  id: string;
  at: number;
  playerId: string;
  amount: number;
  reason: string;
  roundId?: string;
};
export type Round = {
  id: string;
  number: number;
  game: Game;
  bets: Bet[];
  skips: string[];
  startedAt: number;
  deadline: number;
  outcome?: Outcome;
  blackjack?: { seats: BlackjackSeat[]; dealer: (Card | null)[] };
  payouts?: Record<string, number>;
};
export type Outcome = {
  number?: number;
  dice?: number[];
  winner?: number;
  player?: Card[];
  banker?: Card[];
  side?: string;
  dealer?: Card[];
};
export type PublicRoom = {
  code: string;
  title: string;
  game: Game;
  phase: Phase;
  paused: boolean;
  settings: Settings;
  players: Player[];
  round?: Round;
  roundNumber: number;
  history: { game: Game; number: number; text: string }[];
  ledger: Ledger[];
  version: number;
  now: number;
  role: 'host' | 'player' | 'spectator';
  selfId?: string;
  spectatorToken?: string;
  recoveryToken?: string;
};
export type Option = { id: string; label: string; multiplier: number; numbers?: number[] };
const range = (n: number, start = 1) => Array.from({ length: n }, (_, i) => i + start);
export function rouletteOptions(): Option[] {
  const options: Option[] = range(37, 0).map((n) => ({
    id: `n:${n}`,
    label: String(n),
    multiplier: 36,
    numbers: [n],
  }));
  const add = (id: string, label: string, numbers: number[]) =>
    options.push({ id, label, numbers, multiplier: 36 / numbers.length });
  add('red', 'Красное', RED);
  add(
    'black',
    'Чёрное',
    range(36).filter((n) => !RED.includes(n)),
  );
  add(
    'even',
    'Чётное',
    range(36).filter((n) => n % 2 === 0),
  );
  add(
    'odd',
    'Нечётное',
    range(36).filter((n) => n % 2 === 1),
  );
  add('low', '1–18', range(18));
  add('high', '19–36', range(18, 19));
  for (let i = 0; i < 3; i++) {
    add(`dozen:${i}`, `${i + 1}-я дюжина`, range(12, i * 12 + 1));
    add(
      `column:${i}`,
      `${i + 1}-я колонка`,
      range(12, 0).map((j) => j * 3 + i + 1),
    );
  }
  for (let n = 1; n <= 36; n++) {
    if (n % 3 !== 0) add(`split:${n},${n + 1}`, `Сплит ${n}/${n + 1}`, [n, n + 1]);
    if (n <= 33) add(`split:${n},${n + 3}`, `Сплит ${n}/${n + 3}`, [n, n + 3]);
    if (n % 3 === 1) {
      add(`street:${n}`, `Стрит ${n}–${n + 2}`, range(3, n));
      if (n <= 31) add(`line:${n}`, `Линия ${n}–${n + 5}`, range(6, n));
    }
    if (n <= 32 && n % 3 !== 0)
      add(`corner:${n}`, `Угол ${n}/${n + 1}/${n + 3}/${n + 4}`, [n, n + 1, n + 3, n + 4]);
  }
  for (let n = 1; n <= 3; n++) add(`split:0,${n}`, `Сплит 0/${n}`, [0, n]);
  add('trio:1', 'Трио 0/1/2', [0, 1, 2]);
  add('trio:2', 'Трио 0/2/3', [0, 2, 3]);
  add('basket', 'Первые четыре', [0, 1, 2, 3]);
  return options;
}
export const ROULETTE_OPTIONS = rouletteOptions();
export function optionsFor(game: Game): Option[] {
  if (game === 'roulette') return ROULETTE_OPTIONS;
  if (game === 'blackjack') return [{ id: 'hand', label: 'Моя рука', multiplier: 2 }];
  if (game === 'baccarat')
    return [
      { id: 'player', label: 'Игрок', multiplier: 2 },
      { id: 'banker', label: 'Банкир', multiplier: 1.95 },
      { id: 'tie', label: 'Ничья', multiplier: 9 },
    ];
  if (game === 'ducks')
    return DUCKS.map((d, i) => ({ id: String(i), label: d.name, multiplier: 4 }));
  return [
    { id: 'low', label: 'Меньше 7', multiplier: 2.4 },
    { id: 'seven', label: 'Ровно 7', multiplier: 6 },
    { id: 'high', label: 'Больше 7', multiplier: 2.4 },
    { id: 'double', label: 'Дубль', multiplier: 6 },
    ...range(11, 2).map((n) => ({
      id: `sum:${n}`,
      label: `Сумма ${n}`,
      multiplier: 36 / (6 - Math.abs(7 - n)),
    })),
  ];
}
export const money = (cents: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(cents / 100);
export const cardLabel = (c: Card) =>
  `${['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.rank]}${['♠', '♥', '♣', '♦'][c.suit]}`;
export function handValue(cards: Card[]) {
  let total = 0,
    aces = 0;
  for (const c of cards) {
    total += Math.min(c.rank, 10);
    if (c.rank === 1) aces++;
  }
  let soft = false;
  if (aces && total + 10 <= 21) {
    total += 10;
    soft = true;
  }
  return { total, soft };
}
