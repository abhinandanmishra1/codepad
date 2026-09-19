import { test } from 'node:test';
import assert from 'node:assert';
import User from '../src/db/models/User.js';
import Snippet from '../src/db/models/Snippet.js';
import Follow from '../src/db/models/Follow.js';

test('User model validates required fields', async () => {
  const invalidUser = new User({});
  let err;
  try {
    await invalidUser.validate();
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  assert.ok(err.errors.email);
  assert.ok(err.errors.name);
  assert.ok(err.errors.username);
});

test('User model enforces lowercase username format', async () => {
  const invalidUser = new User({
    email: 'test@example.com',
    name: 'Test User',
    username: 'Invalid-User!',
  });
  let err;
  try {
    await invalidUser.validate();
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  assert.ok(err.errors.username);

  const validUser = new User({
    email: 'test@example.com',
    name: 'Test User',
    username: 'valid_user123',
  });
  await validUser.validate();
  assert.strictEqual(validUser.username, 'valid_user123');
});

test('Snippet model generates default 10-char snippetId and validates fields', async () => {
  const snippet = new Snippet({
    title: 'Two Sum',
    command: '/two-sum',
    languageId: 63,
    languageName: 'JavaScript (Node.js)',
    code: 'console.log("hello");',
  });
  await snippet.validate();
  assert.ok(snippet.snippetId);
  assert.strictEqual(snippet.snippetId.length, 10);
  assert.strictEqual(snippet.isPublic, true);
  assert.strictEqual(snippet.viewsCount, 0);
  assert.strictEqual(snippet.forksCount, 0);
});

test('Follow model validates follower and following IDs', async () => {
  const invalidFollow = new Follow({});
  let err;
  try {
    await invalidFollow.validate();
  } catch (e) {
    err = e;
  }
  assert.ok(err);
  assert.ok(err.errors.follower);
  assert.ok(err.errors.following);
});
