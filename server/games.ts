import { randomInt } from 'node:crypto';
import {
  type Card,
  type Game,
  type Outcome,
  type Bet,
  type Hand,
  handValue,
  ROULETTE_OPTIONS,
} from '../shared/model.js';
export type Random = (max: number) => number;
export const secureRandom: Random = (max) => randomInt(max);
export function shoe(decks: number, rng: Random = secureRandom): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++)
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) cards.push({ rank: r, suit: s });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function draw(cards: Card[]): Card {
  const card = cards.pop();
  if (!card) throw new Error('Башмак исчерпан. Раунд отменён с возвратом ставок.');
  return card;
}
export const baccaratValue = (cards: Card[]) =>
  cards.reduce((s, c) => s + (c.rank >= 10 ? 0 : c.rank), 0) % 10;
export function bankerDraws(total: number, third: number | undefined): boolean {
  if (third === undefined) return total <= 5;
  if (total <= 2) return true;
  if (total === 3) return third !== 8;
  if (total === 4) return third >= 2 && third <= 7;
  if (total === 5) return third >= 4 && third <= 7;
  return total === 6 && (third === 6 || third === 7);
}
export function baccarat(cards: Card[]): Outcome {
  const player = [draw(cards)],
    banker = [draw(cards)];
  player.push(draw(cards));
  banker.push(draw(cards));
  const p = baccaratValue(player),
    b = baccaratValue(banker);
  if (p < 8 && b < 8) {
    let third: number | undefined;
    if (p <= 5) {
      const c = draw(cards);
      player.push(c);
      third = baccaratValue([c]);
    }
    if (bankerDraws(b, third)) banker.push(draw(cards));
  }
  const pv = baccaratValue(player),
    bv = baccaratValue(banker);
  return { player, banker, side: pv === bv ? 'tie' : pv > bv ? 'player' : 'banker' };
}
export function generateOutcome(game: Game, cards: Card[], rng: Random = secureRandom): Outcome {
  if (game === 'roulette') return { number: rng(37) };
  if (game === 'dice') return { dice: [rng(6) + 1, rng(6) + 1] };
  if (game === 'ducks') return { winner: rng(4) };
  if (game === 'baccarat') return baccarat(cards);
  throw new Error('Для блэкджека нужна раздача');
}
export function payout(game: Game, bet: Pick<Bet, 'target' | 'amount'>, o: Outcome): number {
  let numerator = 0,
    denominator = 1;
  if (game === 'roulette') {
    const opt = ROULETTE_OPTIONS.find((x) => x.id === bet.target);
    if (opt?.numbers?.includes(o.number!)) {
      numerator = 36;
      denominator = opt.numbers.length;
    }
  }
  if (game === 'ducks' && Number(bet.target) === o.winner) numerator = 4;
  if (game === 'dice') {
    const [a, b] = o.dice!,
      sum = a + b;
    const hit =
      bet.target === 'low'
        ? sum < 7
        : bet.target === 'high'
          ? sum > 7
          : bet.target === 'seven'
            ? sum === 7
            : bet.target === 'double'
              ? a === b
              : bet.target === `sum:${sum}`;
    if (hit) {
      numerator = 36;
      denominator =
        bet.target === 'low' || bet.target === 'high'
          ? 15
          : bet.target === 'seven' || bet.target === 'double'
            ? 6
            : 6 - Math.abs(7 - sum);
    }
  }
  if (game === 'baccarat') {
    if (o.side === 'tie') numerator = bet.target === 'tie' ? 9 : 1;
    else if (bet.target === o.side) {
      numerator = bet.target === 'banker' ? 195 : 2;
      denominator = bet.target === 'banker' ? 100 : 1;
    }
  }
  const result = (bet.amount * numerator) / denominator;
  if (!Number.isSafeInteger(result)) throw new Error('Недопустимая точность выплаты');
  return result;
}
export const natural = (h: Hand) =>
  !h.split && h.cards.length === 2 && handValue(h.cards).total === 21;
export function blackjackPayout(h: Hand, dealer: Card[]): number {
  const v = handValue(h.cards).total,
    d = handValue(dealer).total,
    dbj = dealer.length === 2 && d === 21;
  if (v > 21) return 0;
  if (natural(h)) return dbj ? h.stake : (h.stake * 5) / 2;
  if (dbj) return 0;
  if (d > 21 || v > d) return h.stake * 2;
  if (v === d) return h.stake;
  return 0;
}
