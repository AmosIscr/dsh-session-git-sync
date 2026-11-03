import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { SCHEMA, VERSION } from '../lib/core.js'
import { __testing } from '../index.js'

function makeSession(id, count = 3) {
  const events = []
  for (let index = 0; index < count; index += 1) {
    events.push({
      type: index === 0 ? 'turn/start' : 'user/message',
      seq: index,
      time: 1_700_000_000_000 + index,
      data: index === 0 ? { turn: 0 } : { role: 'user', content: [{ type: 'text', text: `message ${index}` }], source: { kind: 'user' } },
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
    events,
  }
}

function createMock(sessions, workspacePath = 'C:\\work\\demo') {
  const records = new Map(sessions.map((session) => [session.header.id, {
    header: session.header,
    inheritedEventCount: session.inheritedEventCount,
    events: [...session.events],
  }]))
  const workspace = {
    id: 'ws-1',
    title: 'demo',
    path: workspacePath,
    createdAt: 'x',
    updatedAt: 'x',
    sessionIds: [],
    async attachSession(id) { this.sessionIds.push(id) },
  }
  const ctx = {
    sessions: { get: () => undefined },
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
        return { session: record.header, inheritedEventCount: record.inheritedEventCount, events: record.events }
      },
      async traceSession() {
        return { descendants: [] }
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
        let position = 0
        return {
          header: record.header,
          async read() {
            return { events: record.events.slice(position) }
          },
          async append(events) {
            assert.equal(events[0].seq, record.events.length)
            record.events.push(...events)
            position = record.events.length
          },
          async flush() {},
          async close() {},
        }
      },
      async create(header, options = {}) {
        // Mirrors the JSONL backend: only the installed format can be written.
        if (header.version !== 4) throw new Error('encodeCurrent requires Session format v4')
        assert.equal(records.has(header.id), false)
        const record = { header, inheritedEventCount: options.inheritedEventCount ?? 0, events: [] }
        records.set(header.id, record)
        return {
          header,
          async append(events) {
            assert.equal(events[0].seq, record.events.length)
            record.events.push(...events)
          },
          async flush() {},
          async close() {},
        }
      },
    },
    workspaceRegistry: {
      list: () => [workspace],
      async resolveByPath() { return workspace },
      async create() { return workspace },
    },
    emit() {},
  }
  return { ctx, records, workspace }
}

test('export writes a portable payload and import reconstructs it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-sgs-import-'))
  try {
    const source = makeSession('session-a', 3)
    const cwd = join(root, 'demo')
    await mkdir(cwd, { recursive: true })
    source.header.cwd = cwd
    const sourceMock = createMock([source], cwd)
    const selection = await __testing.collectSelection(sourceMock.ctx, { mode: 'sessions', sessionIds: ['session-a'] })
    const exported = await __testing.exportSessions(sourceMock.ctx, selection)
    assert.equal(exported.entries[0].eventCount, 3)
    assert.equal(exported.entries[0].title, 'Title session-a')
    const written = await __testing.writeExport(root, exported)
    assert.equal(written.written.length, 1)

    const targetMock = createMock([], cwd)
    const payload = {
      schema: SCHEMA,
      version: VERSION,
      session: source,
    }
    const outcome = await __testing.importOne(targetMock.ctx, 'session-a', {
      header: source.header,
      events: source.events,
      inheritedEventCount: 0,
    }, undefined, new AbortController().signal, 4)
    assert.equal(outcome.status, 'imported')
    assert.equal(targetMock.records.get('session-a').events.length, 3)
    assert.deepEqual(targetMock.workspace.sessionIds, ['session-a'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('import appends a remote suffix and reports local-ahead without rewriting', async () => {
  const base = makeSession('session-b', 2)
  const longer = makeSession('session-b', 4)
  const mock = createMock([base])
  const first = await __testing.importOne(mock.ctx, 'session-b', {
    header: longer.header,
    events: longer.events.slice(0, 4),
    inheritedEventCount: 0,
  }, undefined, new AbortController().signal)
  assert.equal(first.status, 'updated')
  assert.equal(mock.records.get('session-b').events.length, 4)

  const shorter = await __testing.importOne(mock.ctx, 'session-b', {
    header: base.header,
    events: base.events,
    inheritedEventCount: 0,
  }, undefined, new AbortController().signal)
  assert.equal(shorter.status, 'local-ahead')
  assert.equal(mock.records.get('session-b').events.length, 4)
})

test('import reports a conflicting prefix instead of overwriting it', async () => {
  const local = makeSession('session-c', 3)
  const remote = makeSession('session-c', 3)
  remote.events[1] = { ...remote.events[1], time: 999 }
  const mock = createMock([local])
  const outcome = await __testing.importOne(mock.ctx, 'session-c', {
    header: remote.header,
    events: remote.events,
    inheritedEventCount: 0,
  }, undefined, new AbortController().signal)
  assert.equal(outcome.status, 'conflict')
  assert.equal(mock.records.get('session-c').events[1].time, local.events[1].time)
})

test('import refuses a Session written by another Session format version', async () => {
  const mock = createMock([])
  const newer = makeSession('session-newer', 2)
  newer.header.version = 5
  await assert.rejects(
    __testing.importOne(mock.ctx, 'session-newer', {
      header: newer.header,
      events: newer.events,
      inheritedEventCount: 0,
    }, undefined, new AbortController().signal, 4),
    (error) => {
      assert.equal(error.name, 'UserError')
      assert.equal(error.code, 'format-version-mismatch')
      assert.equal(error.status, 422)
      assert.match(error.message, /v5/u)
      assert.match(error.message, /v4/u)
      return true
    },
  )
  assert.equal(mock.records.has('session-newer'), false)
})

test('a persistence refusal names the local version when it could not be probed', async () => {
  const mock = createMock([])
  const newer = makeSession('session-mystery', 1)
  newer.header.version = 7
  await assert.rejects(
    __testing.importOne(mock.ctx, 'session-mystery', {
      header: newer.header,
      events: newer.events,
      inheritedEventCount: 0,
    }, undefined, new AbortController().signal, null),
    (error) => {
      assert.equal(error.code, 'format-version-mismatch')
      assert.match(error.message, /v7/u)
      assert.match(error.message, /本机写入格式为 v4/u)
      return true
    },
  )
  assert.equal(mock.records.has('session-mystery'), false)
})

test('the local format version comes from the runtime probe, storage, or not at all', async () => {
  const empty = createMock([])
  assert.equal(await __testing.localSessionFormatVersion(empty.ctx), null)

  const stored = createMock([makeSession('session-stored', 1)])
  assert.equal(await __testing.localSessionFormatVersion(stored.ctx), 4)

  const probed = createMock([])
  let probes = 0
  probed.ctx.sessions.prepare = () => {
    probes += 1
    return { header: { version: 6 } }
  }
  assert.equal(await __testing.localSessionFormatVersion(probed.ctx), 6)
  assert.equal(probes, 1)

  const broken = createMock([makeSession('session-broken', 1)])
  broken.ctx.sessions.prepare = () => {
    throw new Error('prepare is unavailable in this build')
  }
  assert.equal(await __testing.localSessionFormatVersion(broken.ctx), 4)
})