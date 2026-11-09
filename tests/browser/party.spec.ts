import { test, expect, type Page, type BrowserContext } from '@playwright/test';
async function session(page: Page) {
  const token = await page.evaluate(
    () => sessionStorage.getItem('mihryu-tab') || localStorage.getItem('mihryu-session'),
  );
  return { token, headers: { Authorization: `Bearer ${token}` } };
}
async function state(page: Page) {
  return (await page.request.get('/api/session', await session(page))).json();
}
async function command(page: Page, type: string, payload: Record<string, unknown> = {}) {
  const s = await state(page);
  const response = await page.request.post('/api/action', {
    ...(await session(page)),
    data: { type, requestId: crypto.randomUUID(), roundId: s.round?.id, ...payload },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function join(page: Page, code: string, name: string) {
  await page.goto(`/?room=${code}`);
  await page.getByLabel('Как вас представить?').fill(name);
  await page.getByRole('button', { name: 'Занять место', exact: true }).click();
  await expect(page.locator('.room-identity')).toContainText(code);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
}

test('mobile landing, host, two players, TV and all five games stay in sync', async ({
  browser,
}) => {
  const contexts: BrowserContext[] = [];
  const create = async (mobile = false) => {
    const c = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    });
    contexts.push(c);
    return c.newPage();
  };
  const host = await create(),
    p1 = await create(true),
    p2 = await create(true),
    tv = await create();
  const errors: string[] = [];
  for (const p of [host, p1, p2, tv]) p.on('pageerror', (e) => errors.push(e.message));
  await host.goto('/');
  await expect(host).toHaveTitle(/Михрюказино/);
  await host.getByLabel('Как вас представить?').fill('Михрю');
  await host.getByLabel('Название вечера').fill('Пятница у своих');
  await host.getByRole('button', { name: 'Открыть своё казино' }).click();
  await expect(host.locator('.lobby-content')).toContainText('Ваш стол готов');
  const initial = await state(host);
  await join(p1, initial.code, 'Алиса');
  await join(p2, initial.code, 'Борис');
  await tv.goto(`/#watch=${initial.spectatorToken}`);
  await expect(tv.locator('.spectator')).toBeVisible();
  await expect(tv.locator('.player-row')).toHaveCount(3);
  await noOverflow(host);
  await noOverflow(p1);
  await host.screenshot({ path: 'test-results/desktop-lobby.png', fullPage: true });
  await p1.screenshot({ path: 'test-results/mobile-lobby.png', fullPage: true });
  for (const game of ['roulette', 'baccarat', 'dice', 'ducks', 'blackjack']) {
    await command(host, 'game', { game });
    await host.getByRole('button', { name: 'Открыть ставки', exact: true }).click();
    await expect(p1.locator('.phase-bar')).toContainText('Ставки открыты');
    if (game === 'roulette') {
      await p1.getByRole('button', { name: '7', exact: true }).click();
      await p2.getByRole('button', { name: 'Красное', exact: true }).click();
    }
    if (game === 'baccarat') {
      await p1.getByRole('button', { name: /Игрок ×/ }).click();
      await p2.getByRole('button', { name: /Банкир ×/ }).click();
    }
    if (game === 'dice') {
      await p1.getByRole('button', { name: /Ровно 7/ }).click();
      await p2.getByRole('button', { name: /Дубль/ }).click();
    }
    if (game === 'ducks') {
      await p1.getByRole('button', { name: /Барон Кряк ×/ }).click();
      await p2.getByRole('button', { name: /Леди Кря ×/ }).click();
    }
    await p1.getByRole('button', { name: /Поставить 100/ }).click();
    await p2.getByRole('button', { name: /Поставить 100/ }).click();
    await expect(p1.locator('.your-stake')).toContainText('100');
    await host
      .getByRole('button', {
        name: game === 'ducks' ? 'Начать заплыв' : 'Закрыть ставки',
        exact: true,
      })
      .click();
    if (game === 'blackjack')
      for (const p of [p1, p2]) {
        const stand = p.getByRole('button', { name: 'Хватит', exact: true });
        if (await stand.isVisible()) await stand.click();
      }
    await expect(p1.locator('.phase-bar')).toContainText('Ставки рассчитаны', { timeout: 25000 });
    await expect(tv.locator('.phase-bar')).toContainText('Ставки рассчитаны');
    const hs = await state(host),
      ps = await state(p1),
      ts = await state(tv);
    expect(ps.round.id).toBe(hs.round.id);
    expect(ts.round.outcome).toEqual(hs.round.outcome);
    expect(ps.players).toEqual(hs.players);
    expect(JSON.stringify(ts)).not.toContain('secretOutcome');
    await noOverflow(p1);
    if (game === 'roulette') {
      await p1.reload();
      await expect(p1.locator('.phase-bar')).toContainText('Ставки рассчитаны');
      expect((await state(p1)).selfId).toBe(ps.selfId);
      await p1.screenshot({ path: 'test-results/mobile-roulette.png', fullPage: true });
    }
    if (game === 'ducks')
      await tv.screenshot({ path: 'test-results/tv-ducks.png', fullPage: true });
  }
  // Disconnecting and reloading a player preserves their seat and account.
  const before = await state(p1);
  await p1.context().setOffline(true);
  await expect(p1.locator('.connection')).toHaveClass(/offline/);
  await p1.context().setOffline(false);
  await p1.reload();
  await expect(p1.locator('.player-row.self')).toContainText('Алиса');
  expect((await state(p1)).players.find((p: any) => p.id === before.selfId).balance).toBe(
    before.players.find((p: any) => p.id === before.selfId).balance,
  );
  const unauthorized = await tv.request.post('/api/action', {
    ...(await session(tv)),
    data: { type: 'open', requestId: crypto.randomUUID() },
  });
  expect(unauthorized.status()).toBe(400);
  await command(host, 'end');
  await expect(p1.locator('.final-board')).toBeVisible();
  await expect(tv.locator('.final-board')).toBeVisible();
  expect(errors).toEqual([]);
  for (const c of contexts) await c.close();
});

test('landing adapts to a narrow phone and room invitations work without registration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ставки/ })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/mobile-landing.png', fullPage: true });
  await page.getByRole('button', { name: 'Присоединиться', exact: true }).click();
  await page.getByLabel('Как вас представить?').fill('Тест');
  await page.getByLabel('Код комнаты').fill('000000');
  await page.getByRole('button', { name: 'Занять место', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Комната не найдена');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/desktop-landing.png', fullPage: true });
});

test('host controls, QR, rebuy approval and private recovery links work on phones', async ({
  browser,
}) => {
  const { readFileSync } = await import('node:fs');
  const fixture = JSON.parse(readFileSync(`${process.env.MIHRYU_TEST_DB}.json`, 'utf8'));
  const hc = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    pc = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hc.newPage(),
    player = await pc.newPage();
  // randomUUID is absent on ordinary HTTP LAN origins. Actions must still work.
  for (const p of [host, player])
    await p.addInitScript(() =>
      Object.defineProperty(Crypto.prototype, 'randomUUID', {
        value: undefined,
        configurable: true,
      }),
    );
  await host.goto(`/#recover=${fixture.hostToken}`);
  await player.goto(`/#recover=${fixture.playerToken}`);
  await expect(player.getByRole('button', { name: 'Вернуться в игру', exact: true })).toBeVisible();
  await player.getByRole('button', { name: 'Вернуться в игру', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Ведущий получил запрос' })).toBeDisabled();
  await host.getByRole('button', { name: 'Пульт ведущего', exact: true }).first().click();
  await host.getByRole('button', { name: 'Выдать 10 000', exact: true }).click();
  await expect(player.locator('.bet-heading strong')).toContainText('10 000');
  await host.getByLabel('Время ставок, сек').fill('30');
  await host.getByRole('button', { name: 'Сохранить настройки' }).click();
  await expect(host.getByRole('alert')).toContainText('Настройки сохранены');
  expect((await state(host)).settings.betSeconds).toBe(30);
  await host.getByRole('button', { name: 'Выдать', exact: true }).click();
  await expect(player.locator('.bet-heading strong')).toContainText('11 000');
  host.once('dialog', (d) => d.accept());
  await host.getByRole('button', { name: 'Новая ссылка', exact: true }).click();
  const recovery = await host.getByLabel('Ссылка восстановления').inputValue();
  await player.goto(recovery);
  await expect(player.locator('.bet-heading strong')).toContainText('11 000');
  expect((await state(player)).selfId).toBe(fixture.playerId);
  await host.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }).click();
  await host.getByRole('button', { name: 'Меню', exact: true }).click();
  await host.getByRole('button', { name: /Пригласить друзей/ }).click();
  await expect(host.getByAltText(/QR-код/)).toBeVisible();
  await expect(host.getByLabel('Личная ссылка ведущего')).toHaveValue(
    new RegExp(fixture.hostToken),
  );
  const watch = await host.getByLabel('Ссылка зрителя').inputValue();
  const tv = await hc.newPage();
  await tv.goto(watch);
  await expect(tv.locator('.spectator')).toBeVisible();
  await host.reload();
  await expect(host.locator('.host-strip')).toBeVisible();
  await noOverflow(host);
  await hc.close();
  await pc.close();
});
