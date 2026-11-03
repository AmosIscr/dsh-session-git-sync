import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { SCHEMA, VERSION, runGit } from '../lib/core.js'
import { apply } from '../index.js'

function fakeSession(id, cwd) {
  return {
    header: {
      version: 4,
      id,
      createdAt: 1_700_000_000_000,
      cwd,
      isSeeded: false,
    },
    inheritedEventCount: 0,
    events: [
      {
        type: 'turn/start',
        seq: 0,
        time: 1_700_000_000_000,
        data: { turn: 0 },
      },
      {
        type: 'user/message',
        seq: 1,
        time: 1_700_000_000_001,
        data: {
          role: 'user',
          content: [{ type: 'text', text: 'hello from the test' }],
          source: { kind: 'user' },
        },
      },
    ],
  }
}

function mockContext(initialSessions, cwd) {
  const records = new Map(initialSessions.map((session) => [session.header.id, {
    header: session.header,
    inheritedEventCount: session.inheritedEventCount,
    events: [...session.events],
  }]))
  const workspace = {
    id: 'ws-test',
    title: 'Test workspace',
    path: cwd,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sessionIds: initialSessions.map((session) => session.header.id),
    async attachSession(id) {
      if (!this.sessionIds.includes(id)) this.sessionIds.push(id)
    },
  }
  const events = []
  let route
  const ctx = {
    effect(callback) {
      callback()
    },
    connection: {
      fetch: {
        register(value) {
          route = value
          return async () => undefined
        },
      },
    },
    sessions: {
      get: () => undefined,
      // Mirrors SessionStore.prepare(meta): the header carries the installed format version.
      prepare(id) {
        return { header: { version: 4, id, createdAt: Date.now(), isSeeded: false } }
      },
    },
    sessionPersistence: {
      async list() {
        return [...records.values()].map((record) => ({ header: record.header, eventCount: record.events.length }))
      },
      async stat(id) {
        return records.has(id) ? { header: records.get(id).header, eventCount: records.get(id).events.length } : undefined
      },
      async open(id) {
        const record = records.get(id)
        return {
          header: record.header,
          async read() {
            return { events: [...record.events] }
          },
          async append(eventsToAppend) {
            assert.equal(eventsToAppend[0]?.seq, record.events.length)
            record.events.push(...eventsToAppend)
          },
          async flush() {},
          async close() {},
        }
      },
      async create(header, options = {}) {
        assert.equal(records.has(header.id), false)
        const record = { header, inheritedEventCount: options.inheritedEventCount ?? 0, events: [] }
        records.set(header.id, record)
        return {
          header,
          async append(eventsToAppend) {
            assert.equal(eventsToAppend[0]?.seq, record.events.length)
            record.events.push(...eventsToAppend)
          },
          async flush() {},
          async close() {},
        }
      },
    },
    sessionQuery: {
      async listSessions() {
        return [...records.values()].map((record) => ({ header: record.header, live: false, persisted: true }))
      },
      async readTitleSnapshots(ids) {
        return ids.map((sessionId) => ({
          sessionId,
          status: 'fulfilled',
          value: { session: records.get(sessionId).header, title: { title: `Title ${sessionId}` } },
        }))
      },
      async readSession(id) {
        const record = records.get(id)
        return { session: record.header, inheritedEventCount: record.inheritedEventCount, events: [...record.events] }
      },
      async traceSession() {
        return { descendants: [] }
      },
    },
    workspaceRegistry: {
      list: () => [workspace],
      async resolveByPath(path) { return path === cwd ? workspace : undefined },
      async create() { return workspace },
    },
    emit(name, payload) {
      events.push({ name, payload })
    },
  }
  return {
    ctx,
    records,
    workspace,
    events,
    request(action, body = {}) {
      assert.ok(route, 'route was registered')
      return route.fetch(new Request('http://127.0.0.1/api/session-git-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      }))
    },
  }
}

async function json(response) {
  return response.json()
}

test('host route pushes from one context and pulls into another', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-sgs-route-'))
  const oldHome = process.env.DSH_HOME
  try {
    process.env.DSH_HOME = join(root, 'home')
    const bare = join(root, 'remote.git')
    const cwd = join(root, 'workspace')
    await mkdir(cwd, { recursive: true })
    const init = await runGit(['init', '--bare', '-b', 'main', bare], { cwd: root })
    assert.equal(init.code, 0, init.stderr)

    const source = mockContext([fakeSession('session-route', cwd)], cwd)
    apply(source.ctx)
    const initial = await json(await source.request('status'))
    assert.equal(initial.ok, true)
    assert.equal(initial.configured, false)
    assert.equal(initial.sessions.length, 1)
    assert.equal(initial.sessions[0].workspace.id, 'ws-test')

    const saved = await json(await source.request('saveConfig', {
      remote: bare,
      branch: 'main',
      authorName: 'Route Test',
      authorEmail: 'route@example.com',
    }))
    assert.equal(saved.ok, true)
    assert.equal(saved.configured, true)

    const tested = await json(await source.request('test'))
    assert.equal(tested.ok, true)
    assert.equal(tested.exists, false)

    const pushed = await json(await source.request('push', { mode: 'sessions', sessionIds: ['session-route'] }))
    assert.equal(pushed.ok, true)
    assert.equal(pushed.sessionCount, 1)
    assert.match(String(pushed.commit), /^[0-9a-f]{40}$/u)

    const remote = await json(await source.request('remote'))
    assert.equal(remote.ok, true)
    assert.equal(remote.exists, true)
    assert.equal(remote.sessions.length, 1)
    assert.equal(remote.sessions[0].id, 'session-route')

    const target = mockContext([], cwd)
    apply(target.ctx)
    const targetRemote = await json(await target.request('remote'))
    assert.equal(targetRemote.ok, true)
    assert.equal(targetRemote.sessions.length, 1)
    const pulled = await json(await target.request('pull', { mode: 'sessions', sessionIds: ['session-route'] }))
    assert.equal(pulled.ok, true)
    assert.equal(pulled.imported, 1)
    assert.equal(pulled.localFormatVersion, 4)
    assert.equal(pulled.formatMismatches, 0)
    assert.equal(target.records.get('session-route').events.length, 2)
    assert.deepEqual(target.workspace.sessionIds, ['session-route'])
    assert.equal(target.events.some((event) => event.name === 'api-session/added'), true)

    const secondStatus = await json(await target.request('status'))
    assert.equal(secondStatus.sessions.length, 1)
    assert.equal(secondStatus.config.lastPullAt !== null, true)
  } finally {
    if (oldHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = oldHome
    await rm(root, { recursive: true, force: true })
  }
})

test('pulling a Session written by another format version is refused before it is stored', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-sgs-format-'))
  const oldHome = process.env.DSH_HOME
  try {
    process.env.DSH_HOME = join(root, 'home')
    const bare = join(root, 'remote.git')
    const cwd = join(root, 'workspace')
    await mkdir(cwd, { recursive: true })
    const init = await runGit(['init', '--bare', '-b', 'main', bare], { cwd: root })
    assert.equal(init.code, 0, init.stderr)

    // The publishing computer already runs a newer DSH: its Session log format is v5.
    const newer = fakeSession('session-future', cwd)
    newer.header.version = 5
    const publisher = mockContext([newer], cwd)
    apply(publisher.ctx)
    const saved = await json(await publisher.request('saveConfig', {
      remote: bare,
      branch: 'main',
      authorName: 'Format Test',
      authorEmail: 'format@example.com',
    }))
    assert.equal(saved.ok, true)
    const pushed = await json(await publisher.request('push', { mode: 'sessions', sessionIds: ['session-future'] }))
    assert.equal(pushed.ok, true)
    assert.equal(pushed.sessionCount, 1)

    // This computer writes v4 and starts from an empty store: a probe answers for it.
    const target = mockContext([], cwd)
    apply(target.ctx)
    const status = await json(await target.request('status'))
    assert.equal(status.localFormatVersion, 4)

    const pulled = await json(await target.request('pull', { mode: 'sessions', sessionIds: ['session-future'] }))
    assert.equal(pulled.ok, true)
    assert.equal(pulled.imported, 0)
    assert.equal(pulled.updated, 0)
    assert.equal(pulled.errors, 1)
    assert.equal(pulled.formatMismatches, 1)
    assert.equal(pulled.sessions[0].code, 'format-version-mismatch')
    assert.match(pulled.sessions[0].error, /v5/u)
    assert.match(pulled.sessions[0].error, /v4/u)
    assert.equal(target.records.has('session-future'), false)
    assert.deepEqual(target.workspace.sessionIds, [])
  } finally {
    if (oldHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = oldHome
    await rm(root, { recursive: true, force: true })
  }
})