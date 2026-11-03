import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  SCHEMA,
  VERSION,
  canonicalJson,
  commitAndPush,
  isEventPrefix,
  mergeManifest,
  normalizeBranch,
  normalizeConfig,
  prepareEmptyBranch,
  readManifest,
  readSessionPayload,
  runGit,
  safeSessionIdSegment,
  sessionFileAbsolute,
  syncWorktree,
  validateSessionPayload,
  writeManifest,
} from '../lib/core.js'

function fakeSession(id, events = 2) {
  const rows = []
  for (let index = 0; index < events; index += 1) {
    rows.push({
      type: index === 0 ? 'session/start' : 'user/message',
      seq: index,
      time: 1_700_000_000_000 + index,
      data: index === 0 ? { cwd: 'C:\\work\\demo' } : { role: 'user', content: [{ type: 'text', text: `hello ${index}` }], source: { kind: 'user' } },
    })
  }
  return {
    header: {
      version: 4,
      id,
      createdAt: 1_700_000_000_000,
      cwd: 'C:\\work\\demo',
      isSeeded: false,
    },
    inheritedEventCount: 0,
    events: rows,
  }
}

function payloadOf(session) {
  return { schema: SCHEMA, version: VERSION, exportedAt: new Date().toISOString(), session }
}

test('branch and config validation', () => {
  assert.equal(normalizeBranch(' feature/sync '), 'feature/sync')
  assert.throws(() => normalizeBranch('bad branch'))
  assert.throws(() => normalizeBranch('-bad'))
  assert.equal(normalizeConfig({ remote: '  https://example.com/repo.git ', branch: 'dev' }).remote, 'https://example.com/repo.git')
  assert.equal(normalizeConfig({}).branch, 'main')
})

test('session ids are safe path segments', () => {
  assert.equal(safeSessionIdSegment('session-123'), 'session-123')
  assert.match(safeSessionIdSegment('../x'), /^\.\._x-/u)
  assert.match(safeSessionIdSegment('a/b'), /^a_b-/u)
})

test('session payload validation and prefix comparison', () => {
  const session = fakeSession('session-test', 3)
  const parsed = validateSessionPayload(payloadOf(session), 'session-test')
  assert.equal(parsed.events.length, 3)
  assert.equal(isEventPrefix(parsed.events.slice(0, 2), parsed.events), true)
  assert.equal(isEventPrefix(parsed.events, parsed.events.slice(0, 2)), false)
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }))
  assert.throws(() => validateSessionPayload(payloadOf({ ...session, events: [{ ...session.events[0], seq: 2 }] }), 'session-test'))
  assert.throws(() => validateSessionPayload(payloadOf(session), 'session-other'))
})

test('manifest merge keeps unrelated rows and rejects remote-newer overwrite', () => {
  const existing = {
    schema: SCHEMA,
    version: VERSION,
    updatedAt: null,
    sessions: [{ id: 'a', eventCount: 5, createdAt: 1 }],
    workspaces: [],
  }
  const merged = mergeManifest(existing, [
    { id: 'a', eventCount: 4, createdAt: 1 },
    { id: 'b', eventCount: 2, createdAt: 2 },
  ], [{ id: 'w', title: 'W', path: 'C:\\w' }])
  assert.deepEqual(merged.sessions.map((row) => row.id), ['b', 'a'])
  assert.equal(merged.sessions.find((row) => row.id === 'a').eventCount, 5)
  assert.equal(merged.skipped.length, 1)
  assert.equal(merged.workspaces[0].id, 'w')
})

test('a second computer reads a pushed session through a bare remote', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-sgs-test-'))
  try {
    const bare = join(root, 'remote.git')
    const first = join(root, 'first')
    const second = join(root, 'second')
    const init = await runGit(['init', '--bare', '-b', 'main', bare], { cwd: root })
    assert.equal(init.code, 0, init.stderr)
    const config = {
      remote: bare,
      branch: 'main',
      authorName: 'Test',
      authorEmail: 'test@example.com',
    }
    const firstSync = await syncWorktree(first, config)
    assert.equal(firstSync.exists, false)
    await prepareEmptyBranch(first, config.branch)
    const session = fakeSession('session-push', 3)
    await mkdir(join(first, 'dsh-sessions', 'sessions'), { recursive: true })
    await writeFile(sessionFileAbsolute(first, session.header.id), JSON.stringify(payloadOf(session)), 'utf8')
    await writeManifest(first, {
      schema: SCHEMA,
      version: VERSION,
      updatedAt: new Date().toISOString(),
      sessions: [{ id: session.header.id, title: 'Demo', createdAt: session.header.createdAt, eventCount: 3, formatVersion: 4, cwd: session.header.cwd }],
      workspaces: [{ id: 'ws-1', title: 'Demo', path: 'C:\\work\\demo' }],
    })
    const delivery = await commitAndPush(first, config, 'test push')
    assert.equal(delivery.ok, true, delivery.stderr)

    const secondSync = await syncWorktree(second, config)
    assert.equal(secondSync.exists, true)
    const manifest = await readManifest(second)
    assert.equal(manifest.sessions.length, 1)
    assert.equal(manifest.sessions[0].eventCount, 3)
    const parsed = await readSessionPayload(second, 'session-push')
    assert.equal(parsed.events.length, 3)
    assert.equal(parsed.header.id, 'session-push')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('manifest round trip preserves optional fields', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-sgs-manifest-'))
  try {
    await writeManifest(root, {
      schema: SCHEMA,
      version: VERSION,
      updatedAt: '2026-01-01T00:00:00.000Z',
      sessions: [{ id: 's', title: null, createdAt: null, eventCount: null, formatVersion: 4, cwd: null, workspace: null }],
      workspaces: [],
    })
    const text = await readFile(join(root, 'dsh-sessions', 'manifest.json'), 'utf8')
    assert.match(text, /"schema": "dsh-session-git-sync"/)
    const manifest = await readManifest(root)
    assert.equal(manifest.sessions[0].id, 's')
    assert.equal(manifest.sessions[0].eventCount, null)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})