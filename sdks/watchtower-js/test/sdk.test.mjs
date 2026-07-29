// Runnable check: `node --test test/sdk.test.mjs` after `npm run build`.
// Verifies init parses the DSN, captureException builds a valid envelope,
// and the payload matches the shape the backend ingest endpoint accepts.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { init, captureException, captureMessage, __internal } from '../dist/index.js';

test('init parses DSN and captureException builds envelope', () => {
  __internal.reset();
  const sent = [];
  globalThis.fetch = async (url, opts) => {
    sent.push({ url, opts });
    return { ok: true };
  };
  init({ dsn: 'http://localhost:8000/wt_pub_test', environment: 'test', release: '0.1.0' });

  const id = captureException(new TypeError('boom'));
  assert.ok(id, 'captureException returns event_id');

  // fetch is async; the send is fire-and-forget. Yield once.
  return new Promise((resolve) => setImmediate(() => {
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'http://localhost:8000/api/v1/ingest/events');
    assert.equal(sent[0].opts.headers['X-Watchtower-Key'], 'wt_pub_test');
    const [event] = JSON.parse(sent[0].opts.body);
    assert.equal(event.platform, 'javascript');
    assert.equal(event.environment, 'test');
    assert.equal(event.release, '0.1.0');
    assert.equal(event.exception.type, 'TypeError');
    assert.equal(event.exception.value, 'boom');
    assert.ok(event.exception.stacktrace.frames.length > 0, 'has parsed frames');
    resolve();
  }));
});

test('captureMessage sends level+message envelope', () => {
  __internal.reset();
  const sent = [];
  globalThis.fetch = async (url, opts) => { sent.push({ url, opts }); return { ok: true }; };
  init({ dsn: 'http://localhost:8000/wt_pub_test' });
  captureMessage('hello', 'warning');
  return new Promise((resolve) => setImmediate(() => {
    const [event] = JSON.parse(sent[0].opts.body);
    assert.equal(event.message, 'hello');
    assert.equal(event.level, 'warning');
    resolve();
  }));
});

test('parseStack pulls function+file+line from chrome-style stack', () => {
  const stack = `Error: x
    at foo (http://localhost/app.js:10:5)
    at bar (http://localhost/app.js:20:5)`;
  const frames = __internal.parseStack(stack);
  assert.equal(frames.length, 2);
  // Reversed: outermost (bar) first, innermost (foo) last.
  assert.equal(frames[frames.length - 1].function, 'foo');
  assert.equal(frames[frames.length - 1].lineno, 10);
});
