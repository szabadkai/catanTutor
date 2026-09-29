import { test, expect } from '@playwright/test';
test('opening coach, placement, bots, persistence and replay form a usable game', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Great games begin here.' })).toBeVisible();
  await expect(page.getByTestId('settlement-target')).toHaveCount(54);
  await expect(page.getByRole('button', { name: /candidate A/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Compare three openings/ }).click();
  await page.getByRole('button', { name: /Select settlement.*candidate A/ }).click();
  await page.getByRole('button', { name: /Why this score/ }).click();
  await expect(
    page.getByText('A heuristic estimate, not a solved position.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Place settlement', exact: true }).click();
  await expect(page.getByRole('button', { name: /Build road edge:/ })).toHaveCount(3);
  await page
    .getByRole('button', { name: /Build road edge:/ })
    .first()
    .press('Enter');
  await expect(page.getByRole('button', { name: /Select settlement/ }).first()).toBeVisible({
    timeout: 20000,
  });
  await page
    .getByRole('button', { name: /Select settlement/ })
    .first()
    .press('Enter');
  await page.getByRole('button', { name: 'Place settlement', exact: true }).click();
  await page
    .getByRole('button', { name: /Build road edge:/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Roll dice', exact: true }).press('Space');
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toHaveCount(0);
  await expect(page.locator('.table-dice')).toContainText('Rolled');
  const warden = page.getByRole('button', { name: /Move warden to/ });
  if (await warden.count()) {
    await warden.first().click();
    await page.getByRole('button', { name: 'Move warden', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Your learning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Opening settlement 1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Opening settlement 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Replays', exact: true }).click();
  await page.getByRole('button', { name: 'Watch replay' }).click();
  await expect(page.getByLabel('Replay position')).toHaveValue('0');
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  await expect(page.getByLabel('Replay position')).toHaveValue('1');
  await page.getByRole('button', { name: 'Last move', exact: true }).click();
  await page.getByRole('button', { name: 'Return to live' }).click();
  await expect(page.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('silent mode, new hotseat games and dialogs support keyboard interaction', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Tutor mode').selectOption('silent');
  await expect(page.getByRole('button', { name: /Compare three openings/ })).toHaveCount(0);
  await page.getByRole('button', { name: /New game/ }).click();
  await page.getByLabel('Island seed').fill('browser-hotseat');
  await page.getByLabel('At your table').selectOption('hotseat');
  await page.getByLabel('Players', { exact: true }).selectOption('3');
  await page.getByRole('button', { name: /Begin a new game/ }).click();
  await expect(page.locator('.player-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByRole('button', { name: 'Reset board view' })).toHaveText('115%');
  await page.getByRole('button', { name: 'Reset board view' }).click();
  await expect(page.getByRole('button', { name: 'Reset board view' })).toHaveText('100%');
});
test('mobile board remains usable with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Great games begin here.' })).toBeVisible();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  await page.getByTestId('settlement-target').nth(18).click();
  await page.getByRole('button', { name: 'Place settlement', exact: true }).click();
  await expect(page.getByRole('button', { name: /Build road edge:/ }).first()).toBeVisible();
});

test('revealed suggestions stay hidden when Silent is selected in settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Compare three openings/ }).click();
  await expect(page.getByRole('button', { name: /candidate A/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tutor mode').selectOption('silent');
  await page.getByRole('button', { name: 'Back to the island' }).click();
  await expect(page.getByRole('button', { name: /candidate A/ })).toHaveCount(0);
});

test('city construction works from a naturally reached, replayed position', async ({ page }) => {
  const engine = await import('@hextutor/game-engine');
  const ai = await import('@hextutor/game-ai');
  let state = engine.createGame('browser-city');
  for (let i = 0; i < 2000; i++) {
    const actions = engine.legalActions(state);
    if (state.activePlayerId === 'you' && actions.some((a) => a.type === 'upgradeCity')) break;
    if (state.winner) throw new Error('Fixture ended before a city opportunity');
    state = engine.execute(state, ai.chooseHeuristicAction(state, actions));
  }
  expect(engine.legalActions(state).some((a) => a.type === 'upgradeCity')).toBe(true);
  const replay = engine.exportReplay(state),
    points = engine.victoryPoints(state, 'you');
  await page.addInitScript(
    (data) =>
      localStorage.setItem('hextutor.session.v1', JSON.stringify({ replay: data, records: [] })),
    replay,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'City', exact: true }).click();
  await page
    .getByRole('button', { name: /Upgrade city vertex:/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Upgrade city', exact: true }).click();
  await expect(page.locator('.player-card').first().locator('.player-points strong')).toHaveText(
    `${points + 1}/10`,
  );
  await expect(page.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
});

test('affordable roads build directly on the island and remain read-only in replay', async ({
  page,
}) => {
  const engine = await import('@hextutor/game-engine');
  const ai = await import('@hextutor/game-ai');
  let state = engine.createGame('browser-road');
  for (let i = 0; i < 2000; i++) {
    const actions = engine.legalActions(state);
    if (
      state.activePlayerId === 'you' &&
      state.phase === 'main' &&
      actions.some((a) => a.type === 'buildRoad')
    )
      break;
    if (state.winner) throw new Error('Fixture ended before a road opportunity');
    state = engine.execute(state, ai.chooseHeuristicAction(state, actions));
  }
  const road = engine.legalActions(state).find((action) => action.type === 'buildRoad');
  if (!road || road.type !== 'buildRoad') throw new Error('No road opportunity');
  const replay = engine.exportReplay(state);
  await page.addInitScript(
    (data) =>
      localStorage.setItem('hextutor.session.v1', JSON.stringify({ replay: data, records: [] })),
    replay,
  );
  await page.goto('/');
  await page.getByRole('button', { name: `Build road ${road.edgeId}`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Build road ${road.edgeId}`, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.resource-card.wood strong')).toHaveText(
    String(state.players.you.resources.wood - 1),
  );
  await expect(page.locator('.resource-card.brick strong')).toHaveText(
    String(state.players.you.resources.brick - 1),
  );
  await expect(page.getByRole('button', { name: 'Build road', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Replays', exact: true }).click();
  await page.getByRole('button', { name: 'Watch replay' }).click();
  await page.getByRole('button', { name: 'Last move', exact: true }).click();
  await expect(page.getByRole('button', { name: /Build road edge:/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to live' }).click();
  await expect(page.locator('.resource-card.wood strong')).toHaveText(
    String(state.players.you.resources.wood - 1),
  );
});
