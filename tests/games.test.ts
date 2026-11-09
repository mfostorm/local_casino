import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shoe,
  baccarat,
  baccaratValue,
  bankerDraws,
  blackjackPayout,
  payout,
  generateOutcome,
} from '../server/games.js';
import { ROULETTE_OPTIONS, optionsFor, handValue, type Card, type Hand } from '../shared/model.js';
const c = (rank: number): Card => ({ rank, suit: 0 });
const hand = (ranks: number[], stake = 10000, split = false): Hand => ({
  cards: ranks.map(c),
  stake,
  split,
  splitAces: false,
  status: 'stood',
  deadline: 0,
});
test('shoe contains the exact card inventory and shuffles with supplied RNG', () => {
  const cards = shoe(6, () => 0);
  assert.equal(cards.length, 312);
  for (let suit = 0; suit < 4; suit++)
    for (let rank = 1; rank <= 13; rank++)
      assert.equal(cards.filter((c) => c.rank === rank && c.suit === suit).length, 6);
  assert.notDeepEqual(
    cards,
    shoe(6, (n) => n - 1),
  );
});
test('all roulette bets have standard 36/k total payout, including zero groups', () => {
  for (const opt of ROULETTE_OPTIONS) {
    const total = Array.from({ length: 37 }, (_, number) =>
      payout('roulette', { target: opt.id, amount: 10000 }, { number }),
    ).reduce((a, b) => a + b, 0);
    assert.equal(total, 360000, opt.id);
  }
  assert.equal(payout('roulette', { target: 'red', amount: 10000 }, { number: 0 }), 0);
  assert.equal(payout('roulette', { target: 'n:0', amount: 10000 }, { number: 0 }), 360000);
});
test('all dice bets are exactly fair over all 36 combinations', () => {
  for (const opt of optionsFor('dice')) {
    let total = 0;
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        total += payout('dice', { target: opt.id, amount: 10000 }, { dice: [a, b] });
    assert.equal(total, 360000, opt.id);
  }
  assert.equal(payout('dice', { target: 'low', amount: 10000 }, { dice: [3, 4] }), 0);
  assert.equal(payout('dice', { target: 'high', amount: 10000 }, { dice: [3, 4] }), 0);
});
test('duck races pay 4x only for the winning lane and sample all four lanes', () => {
  for (let winner = 0; winner < 4; winner++) {
    assert.deepEqual(
      generateOutcome('ducks', [], () => winner),
      { winner },
    );
    for (let lane = 0; lane < 4; lane++)
      assert.equal(
        payout('ducks', { target: String(lane), amount: 10000 }, { winner }),
        winner === lane ? 40000 : 0,
      );
  }
});
test('baccarat payouts: commission, tie payout and pushes', () => {
  for (const side of ['player', 'banker', 'tie']) {
    const expected =
      side === 'player' ? [20000, 0, 0] : side === 'banker' ? [0, 19500, 0] : [10000, 10000, 90000];
    ['player', 'banker', 'tie'].forEach((target, i) =>
      assert.equal(payout('baccarat', { target, amount: 10000 }, { side }), expected[i]),
    );
  }
  assert.equal(payout('baccarat', { target: 'banker', amount: 1000 }, { side: 'banker' }), 1950);
});
test('baccarat banker third-card table including the player standing', () => {
  const drawTable: Record<number, number[]> = {
    0: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    2: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    3: [0, 1, 2, 3, 4, 5, 6, 7, 9],
    4: [2, 3, 4, 5, 6, 7],
    5: [4, 5, 6, 7],
    6: [6, 7],
    7: [],
  };
  for (let total = 0; total < 8; total++) {
    assert.equal(bankerDraws(total, undefined), total <= 5);
    for (let third = 0; third < 10; third++)
      assert.equal(
        bankerDraws(total, third),
        drawTable[total].includes(third),
        `${total}/${third}`,
      );
  }
});
test('baccarat natural prevents all draws and honors face-card values', () => {
  const deck = [3, 13, 5, 2, 3, 7].map(c).reverse();
  const o = baccarat(deck);
  assert.equal(o.player!.length, 2);
  assert.equal(o.banker!.length, 2);
  assert.equal(o.side, 'player');
  assert.equal(baccaratValue(o.player!), 8);
  assert.equal(deck.length, 2);
  assert.equal(baccaratValue([c(11), c(12), c(13), c(1)]), 1);
});
test('baccarat player draws third and banker follows the third-card rule', () => {
  const o = baccarat([2, 3, 2, 3, 7, 1].map(c).reverse());
  assert.equal(o.player!.length, 3);
  assert.equal(o.banker!.length, 3);
  assert.equal(baccaratValue(o.player!), 1);
  assert.equal(baccaratValue(o.banker!), 7);
  assert.equal(o.side, 'banker');
});
test('aces become soft or hard without busting prematurely', () => {
  assert.deepEqual(handValue([c(1), c(6)]), { total: 17, soft: true });
  assert.deepEqual(handValue([c(1), c(6), c(10)]), { total: 17, soft: false });
  assert.deepEqual(handValue([c(1), c(1), c(9)]), { total: 21, soft: true });
});
test('blackjack pays 3:2, pushes against natural, split 21 is ordinary', () => {
  assert.equal(blackjackPayout(hand([1, 13]), [c(10), c(9)]), 25000);
  assert.equal(blackjackPayout(hand([1, 13]), [c(10), c(1)]), 10000);
  assert.equal(blackjackPayout(hand([1, 13], 10000, true), [c(10), c(9)]), 20000);
  assert.equal(blackjackPayout(hand([1, 13], 10000, true), [c(10), c(1)]), 0);
});
test('blackjack bust, dealer bust, equal hands, and dealer natural', () => {
  assert.equal(blackjackPayout(hand([10, 10, 2]), [c(10), c(10), c(5)]), 0);
  assert.equal(blackjackPayout(hand([10, 8]), [c(10), c(10), c(5)]), 20000);
  assert.equal(blackjackPayout(hand([10, 8]), [c(10), c(8)]), 10000);
  assert.equal(blackjackPayout(hand([7, 7, 7]), [c(1), c(10)]), 0);
});
