import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { startServer, stopServer } from '../src/api/server.js';

let baseUrl;
let authorToken;
let otherToken;
let createdCodeId;

const testRunId = Date.now();

before(async () => {
  const app = await startServer(0);
  const port = app.address().port;
  baseUrl = `http://localhost:${port}`;

  // Log in author user
  const authorRes = await fetch(`${baseUrl}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `codes_author_${testRunId}@codepad.local`, name: 'Codes Author' }),
  });
  const authorData = await authorRes.json();
  authorToken = authorData.token;

  // Log in secondary user
  const otherRes = await fetch(`${baseUrl}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `codes_other_${testRunId}@codepad.local`, name: 'Codes Other' }),
  });
  const otherData = await otherRes.json();
  otherToken = otherData.token;
});

after(async () => {
  if (createdCodeId) {
    try {
      const Code = (await import('../src/db/models/Code.js')).default;
      await Code.deleteOne({ codeId: createdCodeId });
    } catch {}
  }
  await stopServer();
});

test('POST /codes creates a new saved code with unique codeId', async () => {
  const res = await fetch(`${baseUrl}/codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({
      title: 'Merge Sort Implementation',
      description: 'Standard O(N log N) divide and conquer sorting in C++',
      languageId: 54,
      languageName: 'C++ (GCC 9.2.0)',
      code: 'void mergeSort(vector<int>& arr) { /* sort */ }',
      testCases: [{ id: '1', name: 'Case 1', input: '5\n4 2 1 5 3', expected: '1 2 3 4 5' }],
      visibility: 'private',
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data.codeId);
  assert.strictEqual(data.title, 'Merge Sort Implementation');
  assert.strictEqual(data.description, 'Standard O(N log N) divide and conquer sorting in C++');
  assert.strictEqual(data.languageId, 54);
  assert.strictEqual(data.visibility, 'private');
  assert.ok(Array.isArray(data.testCases));
  assert.strictEqual(data.testCases.length, 1);

  createdCodeId = data.codeId;
});

test('POST /codes returns 400 Validation Error if required fields are missing', async () => {
  const res = await fetch(`${baseUrl}/codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({
      title: 'Incomplete Code',
      // missing languageId, languageName, code
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Validation Error');
});

test('GET /codes/me retrieves paginated list of user saved codes', async () => {
  const res = await fetch(`${baseUrl}/codes/me?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${authorToken}` },
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.codes));
  assert.ok(data.codes.length >= 1);
  assert.ok(data.pagination);
  assert.strictEqual(data.pagination.page, 1);
  assert.ok(data.pagination.total >= 1);

  const found = data.codes.find((c) => c.codeId === createdCodeId);
  assert.ok(found);
  assert.strictEqual(found.title, 'Merge Sort Implementation');
});

test('GET /codes/me supports substring search and handles special regex characters', async () => {
  // Substring match
  const searchRes = await fetch(`${baseUrl}/codes/me?search=Sort`, {
    headers: { Authorization: `Bearer ${authorToken}` },
  });
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.ok(searchData.codes.some((c) => c.codeId === createdCodeId));

  // Special regex characters should not crash the endpoint
  const regexRes = await fetch(`${baseUrl}/codes/me?search=Sort [Special]`, {
    headers: { Authorization: `Bearer ${authorToken}` },
  });
  assert.strictEqual(regexRes.status, 200);
});

test('PUT /codes/:codeId updates code when user is author', async () => {
  const res = await fetch(`${baseUrl}/codes/${createdCodeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({
      title: 'Merge Sort Optimized',
      description: 'In-place merge sort implementation',
      code: 'void mergeSortOpt(vector<int>& arr) {}',
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.codeId, createdCodeId);
  assert.strictEqual(data.title, 'Merge Sort Optimized');
  assert.strictEqual(data.description, 'In-place merge sort implementation');
  assert.strictEqual(data.code, 'void mergeSortOpt(vector<int>& arr) {}');
});

test('PUT /codes/:codeId returns 403 Forbidden for non-author', async () => {
  const res = await fetch(`${baseUrl}/codes/${createdCodeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${otherToken}`,
    },
    body: JSON.stringify({
      title: 'Unauthorized Modification',
    }),
  });

  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.error, 'Forbidden');
});

test('DELETE /codes/:codeId returns 403 Forbidden for non-author', async () => {
  const res = await fetch(`${baseUrl}/codes/${createdCodeId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${otherToken}`,
    },
  });

  assert.strictEqual(res.status, 403);
});

test('DELETE /codes/:codeId deletes code when user is author', async () => {
  const res = await fetch(`${baseUrl}/codes/${createdCodeId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authorToken}`,
    },
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.codeId, createdCodeId);

  // Subsequent PUT returns 404
  const putRes = await fetch(`${baseUrl}/codes/${createdCodeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`,
    },
    body: JSON.stringify({ title: 'Already Deleted' }),
  });
  assert.strictEqual(putRes.status, 404);

  createdCodeId = null;
});
