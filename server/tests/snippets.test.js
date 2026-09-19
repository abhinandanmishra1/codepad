import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { startServer, stopServer } from '../src/api/server.js';

let baseUrl;
let authorToken;
let otherToken;
let createdSnippetId;

const testRunId = Date.now();

before(async () => {
  const app = await startServer(0);
  const port = app.address().port;
  baseUrl = `http://localhost:${port}`;

  // Log in author user
  const authorRes = await fetch(`${baseUrl}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test_author_${testRunId}@codepad.local`, name: 'Author Dev' }),
  });
  const authorData = await authorRes.json();
  authorToken = authorData.token;

  // Log in secondary user
  const otherRes = await fetch(`${baseUrl}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test_other_${testRunId}@codepad.local`, name: 'Other Dev' }),
  });
  const otherData = await otherRes.json();
  otherToken = otherData.token;
});

after(async () => {
  if (createdSnippetId) {
    try {
      const Snippet = (await import('../src/db/models/Snippet.js')).default;
      await Snippet.deleteMany({
        $or: [{ snippetId: createdSnippetId }, { forkedFrom: createdSnippetId }],
      });
    } catch {}
  }
  await stopServer();
});

test('POST /snippets creates a new snippet with unique snippetId', async () => {
  const res = await fetch(`${baseUrl}/snippets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({
      title: 'Binary Exponentiation',
      command: '/binexp',
      description: 'O(log N) modular exponentiation in C++',
      languageId: 54,
      languageName: 'C++ (GCC 9.2.0)',
      code: 'long long power(long long base, long long exp) { long long res = 1; while (exp) { if (exp & 1) res *= base; base *= base; exp >>= 1; } return res; }',
      testCases: [{ id: '1', name: 'Case 1', input: '2 10', expected: '1024' }],
      isPublic: true,
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data.snippetId);
  assert.strictEqual(data.title, 'Binary Exponentiation');
  assert.strictEqual(data.command, '/binexp');
  assert.strictEqual(data.author.name, 'Author Dev');
  assert.strictEqual(data.viewsCount, 0);
  assert.strictEqual(data.forksCount, 0);

  createdSnippetId = data.snippetId;
});

test('GET /snippets/:snippetId retrieves snippet and increments viewsCount', async () => {
  const res = await fetch(`${baseUrl}/snippets/${createdSnippetId}`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.snippetId, createdSnippetId);
  assert.strictEqual(data.viewsCount, 1);
});

test('PUT /snippets/:snippetId updates snippet when user is author', async () => {
  const res = await fetch(`${baseUrl}/snippets/${createdSnippetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({
      title: 'Binary Exponentiation Optimized',
      description: 'Iterative O(log N) solution',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.title, 'Binary Exponentiation Optimized');
  assert.strictEqual(data.description, 'Iterative O(log N) solution');
});

test('PUT /snippets/:snippetId returns 403 Forbidden for non-author', async () => {
  const res = await fetch(`${baseUrl}/snippets/${createdSnippetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${otherToken}`,
    },
    body: JSON.stringify({
      title: 'Hacked Title',
    }),
  });

  assert.strictEqual(res.status, 403);
});

test('POST /snippets/:snippetId/fork creates a clone without copying command', async () => {
  const res = await fetch(`${baseUrl}/snippets/${createdSnippetId}/fork`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${otherToken}`,
    },
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data.snippetId);
  assert.notStrictEqual(data.snippetId, createdSnippetId);
  assert.strictEqual(data.forkedFrom, createdSnippetId);
  assert.strictEqual(data.author.name, 'Other Dev');
  assert.match(data.command, /^\/fork-[a-z0-9]+$/); // generated unique fork command

  // Verify parent's forksCount incremented
  const parentRes = await fetch(`${baseUrl}/snippets/${createdSnippetId}`);
  const parentData = await parentRes.json();
  assert.strictEqual(parentData.forksCount, 1);
});

test('GET /snippets/me returns user snippets and safely handles regex search', async () => {
  const createRes = await fetch(`${baseUrl}/snippets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({
      title: 'Test Snippet [Special]',
      command: '/test',
      description: 'Snippet with regex brackets (test)',
      languageId: 63,
      languageName: 'JavaScript (Node.js)',
      code: 'console.log("test");',
      isPublic: true,
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const secondData = await createRes.json();
  assert.strictEqual(secondData.command, '/test');

  // Query with special regex characters that would crash unescaped regex
  const searchRes = await fetch(`${baseUrl}/snippets/me?search=[Special]`, {
    headers: { Authorization: `Bearer ${authorToken}` },
  });
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.ok(Array.isArray(searchData.snippets));
  assert.ok(searchData.snippets.some((s) => s.command === '/test'));

  // Clean up
  try {
    const Snippet = (await import('../src/db/models/Snippet.js')).default;
    await Snippet.deleteOne({ snippetId: secondData.snippetId });
  } catch {}
});

test('GET /snippets returns paginated public snippets list', async () => {
  const res = await fetch(`${baseUrl}/snippets?page=1&limit=10`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.snippets));
  assert.ok(data.snippets.length >= 1);
  assert.ok(data.pagination);
  assert.strictEqual(data.pagination.page, 1);
  assert.ok(data.pagination.total >= 1);
});

test('PUT /snippets/:snippetId can toggle visibility to private and blocks non-author', async () => {
  // Author sets to private
  const putRes = await fetch(`${baseUrl}/snippets/${createdSnippetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({ visibility: 'private' }),
  });
  assert.strictEqual(putRes.status, 200);
  const putData = await putRes.json();
  assert.strictEqual(putData.visibility, 'private');
  assert.strictEqual(putData.isPublic, false);

  // Other user gets 403 Forbidden
  const forbiddenRes = await fetch(`${baseUrl}/snippets/${createdSnippetId}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert.strictEqual(forbiddenRes.status, 403);

  // Anonymous guest gets 403 Forbidden
  const guestRes = await fetch(`${baseUrl}/snippets/${createdSnippetId}`);
  assert.strictEqual(guestRes.status, 403);

  // Author can still access
  const authorRes = await fetch(`${baseUrl}/snippets/${createdSnippetId}`, {
    headers: { Authorization: `Bearer ${authorToken}` },
  });
  assert.strictEqual(authorRes.status, 200);
});
