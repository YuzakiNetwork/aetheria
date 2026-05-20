import test from 'node:test';
import assert from 'node:assert/strict';

import PluginManager from '../src/lib/plugins.js';

function createManager() {
  const manager = new PluginManager({});
  manager.processQueue = () => {};
  return manager;
}

function createMessage(args) {
  return {
    senderPn: '12345@s.whatsapp.net',
    command: 'ping',
    args,
    prefix: '!',
  };
}

test('enqueueCommand dedupes same command + same args', async () => {
  const manager = createManager();

  await manager.enqueueCommand({}, createMessage(['Hello', 'World']));
  await manager.enqueueCommand({}, createMessage(['Hello', 'World']));

  const queue = manager.commandQueues.get('12345@s.whatsapp.net');
  assert.equal(queue.length, 1);
});

test('enqueueCommand keeps same command + different args', async () => {
  const manager = createManager();

  await manager.enqueueCommand({}, createMessage(['first']));
  await manager.enqueueCommand({}, createMessage(['second']));

  const queue = manager.commandQueues.get('12345@s.whatsapp.net');
  assert.equal(queue.length, 2);
});

test('enqueueCommand dedupes whitespace/case variants after normalization', async () => {
  const manager = createManager();

  await manager.enqueueCommand({}, createMessage(['  HeLLo  ', '   WORLD']));
  await manager.enqueueCommand({}, createMessage(['hello', 'world   ']));

  const queue = manager.commandQueues.get('12345@s.whatsapp.net');
  assert.equal(queue.length, 1);
});
