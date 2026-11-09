// Deterministic browser fixture. This runs before the test server, never in the application.
import { writeFileSync } from 'node:fs';
import { Casino } from '../../server/store.js';
const path = process.env.MIHRYU_TEST_DB;
if (!path?.startsWith('/tmp/mihryu-e2e-')) throw new Error('Expected isolated test database');
const casino = new Casino(path);
const { room, token: hostToken } = casino.create('Ведущий теста', 'Проверка пульта');
const playerToken = casino.join(room, 'Обнулившийся', '🦊');
const player = room.players[1];
casino.transaction(room, () => casino.credit(room, player, -player.balance, 'Тестовый проигрыш'));
writeFileSync(`${path}.json`, JSON.stringify({ hostToken, playerToken, playerId: player.id }));
casino.close();
