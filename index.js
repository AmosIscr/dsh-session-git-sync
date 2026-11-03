/**
 * Host half of Session Git Sync.
 *
 * The Host owns the plugin-private clone, exports selected Session logs through
 * the persistence/query services, and imports Git payloads back through
 * persistence so every backend keeps its own on-disk encoding. The browser half
 * talks to this file through one authenticated Fetch route.
 */
import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import {
  DEFAULT_AUTHOR_EMAIL,
  DEFAULT_AUTHOR_NAME,
  SCHEMA,
  SESSION_DIR,
  VERSION,
  UserError,
  canonicalJson,
  commitAndPush,
  directoryLabel,
  ensureRepo,
  gitError,
  gitVersion,
  isEventPrefix,
  isNonFastForward,
  mergeManifest,
  messageOf,
  normalizeAuthor,
  normalizeBranch,
  normalizeRemote,
  normalizeWorkspace,
  readConfig,
  readManifest,
  readSessionPayload,
  redactSecrets,
  resetEmptyRepository,
  resolveRootDir,
  runGit,
  sessionFileAbsolute,
  sessionFileRelative,
  syncWorktree,
  validateSessionPayload,
  writeConfig,
  writeManifest,
} from './lib/core.js'

const ROUTE_PATH = '/api/session-git-sync'

/** Host services this plugin needs to read and write durable Session history. */
export const inject = ['connection', 'sessionPersistence', 'sessionQuery', 'sessions', 'workspaceRegistry']

/**
 * Register the authenticated sync route.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 */
export function apply(ctx) {
  const rootDir = resolveRootDir()
  const repoDir = join(rootDir, 'repo')
  let tail = Promise.resolve()

  /**
   * Serialize Git worktree mutations. Reads that do not touch the worktree can
   * still run concurrently with a push; this lock covers everything else.
   * @param {() => Promise<unknown>} task - operation to run alone.
   */
  const serialized = (task) => {
    const next = tail.then(task, task)
    tail = next.catch(() => undefined)
    return next
  }

  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        const body = await request.json().catch(() => null)
        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
          throw new UserError('请求格式无效。')
        }
        const action = typeof body.action === 'string' ? body.action : ''
        switch (action) {
          case 'status':
            return jsonResponse(await statusData(ctx, rootDir, repoDir))
          case 'saveConfig':
            return jsonResponse(await serialized(() => saveConfig(ctx, rootDir, repoDir, body)))
          case 'test':
            return jsonResponse(await serialized(() => testRemote(ctx, rootDir)))
          case 'remote':
            return jsonResponse(await serialized(() => remoteData(ctx, rootDir, repoDir, request.signal)))
          case 'push':
            return jsonResponse(await serialized(() => pushSelection(ctx, rootDir, repoDir, body, request.signal)))
          case 'pull':
            return jsonResponse(await serialized(() => pullSelection(ctx, rootDir, repoDir, body, request.signal)))
          default:
            throw new UserError('未知操作。')
        }
      } catch (error) {
        if (request.signal.aborted) return new Response(null, { status: 499 })
        const status = error instanceof UserError ? error.status : 500
        return jsonResponse({
          ok: false,
          error: redactSecrets(messageOf(error)),
          code: error instanceof UserError ? error.code : 'internal',
        }, status)
      }
    },
  }), 'session-git-sync: route')
}

/**
 * Local inventory plus configuration for the panel's landing state.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} rootDir - plugin data root.
 * @param {string} repoDir - plugin worktree.
 */
async function statusData(ctx, rootDir, repoDir) {
  const { config, configError } = await readConfig(rootDir)
  const [sessions, workspaces, version] = await Promise.all([
    localSessions(ctx),
    Promise.resolve(localWorkspaces(ctx)),
    gitVersion(),
  ])
  return {
    ok: true,
    config,
    configError,
    configured: config.remote !== '',
    repoDir,
    repoInitialized: existsSync(join(repoDir, '.git')),
    git: { available: version !== null, version },
    sessions,
    workspaces,
  }
}

/**
 * One UI row per stored Session, with its workspace association and title.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 */
async function localSessions(ctx) {
  const records = await ctx.sessionQuery.listSessions()
  const ids = records.map((record) => String(record.header.id))
  const titles = await ctx.sessionQuery.readTitleSnapshots(ids).catch(() => [])
  const titleById = new Map()
  for (const result of titles) {
    if (result.status === 'fulfilled' && result.value.title !== undefined) {
      titleById.set(String(result.sessionId), result.value.title.title)
    }
  }
  const snapshots = await ctx.sessionPersistence.list().catch(() => [])
  const snapshotById = new Map(snapshots.map((snapshot) => [String(snapshot.header.id), snapshot]))
  const workspaceBySession = new Map()
  for (const workspace of ctx.workspaceRegistry.list()) {
    for (const sessionId of workspace.sessionIds) {
      if (!workspaceBySession.has(String(sessionId))) workspaceBySession.set(String(sessionId), workspace)
    }
  }
  return records.map((record) => {
    const id = String(record.header.id)
    const snapshot = snapshotById.get(id)
    const workspace = workspaceBySession.get(id)
    return {
      id,
      title: titleById.get(id) ?? null,
      createdAt: record.header.createdAt,
      cwd: record.header.cwd ?? null,
      parentSession: record.header.parentSession ?? null,
      origin: record.header.origin ?? null,
      agentPreset: record.header.agentPreset ?? null,
      live: record.live,
      persisted: record.persisted,
      eventCount: snapshot?.eventCount ?? null,
      sizeBytes: snapshot?.sizeBytes ?? null,
      formatStatus: record.formatStatus ?? null,
      workspace: workspace === undefined ? null : workspaceView(workspace),
    }
  }).sort((left, right) => Number(right.createdAt) - Number(left.createdAt) || left.id.localeCompare(right.id))
}

/** Local workspace rows for selection and mapping. */
function localWorkspaces(ctx) {
  return ctx.workspaceRegistry.list().map((workspace) => ({
    ...workspaceView(workspace),
    sessionCount: workspace.sessionIds.length,
    sessionIds: [...workspace.sessionIds].map(String),
  }))
}

function workspaceView(workspace) {
  return {
    id: String(workspace.id),
    title: workspace.title,
    path: workspace.path,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  }
}

/** Persist the repository address and commit identity. */
async function saveConfig(ctx, rootDir, repoDir, body) {
  const remote = normalizeRemote(body.remote)
  const branch = normalizeBranch(body.branch)
  const authorName = normalizeAuthor(body.authorName, DEFAULT_AUTHOR_NAME)
  const authorEmail = normalizeAuthor(body.authorEmail, DEFAULT_AUTHOR_EMAIL)
  if (!authorEmail.includes('@')) throw new UserError('提交邮箱无效。')
  const config = await writeConfig(rootDir, { remote, branch, authorName, authorEmail })
  return {
    ok: true,
    config,
    configured: config.remote !== '',
    repoDir,
    status: await statusData(ctx, rootDir, repoDir),
  }
}

/** Verify that the configured remote answers and whether the branch exists. */
async function testRemote(ctx, rootDir) {
  const { config } = await readConfig(rootDir)
  requireRemote(config)
  if (await gitVersion() === null) throw new UserError('找不到 Git。请先安装 Git 并确保它在 PATH 中。', 503, 'git-unavailable')
  await mkdir(rootDir, { recursive: true })
  const result = await runGit(['ls-remote', '--heads', config.remote, config.branch], { cwd: rootDir, timeoutMs: 60_000 })
  if (result.code !== 0) throw gitError('无法访问 Git 远程仓库。', result)
  return {
    ok: true,
    remote: config.remote,
    branch: config.branch,
    exists: result.stdout.trim() !== '',
  }
}

/**
 * Fetch the remote snapshot and return its manifest rows without importing.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} rootDir - plugin data root.
 * @param {string} repoDir - plugin worktree.
 * @param {AbortSignal} signal - request lifetime.
 */
async function remoteData(ctx, rootDir, repoDir, signal) {
  const { config } = await readConfig(rootDir)
  requireRemote(config)
  if (await gitVersion() === null) throw new UserError('找不到 Git。请先安装 Git 并确保它在 PATH 中。', 503, 'git-unavailable')
  const sync = await syncWorktree(repoDir, config, signal)
  if (!sync.exists) {
    return {
      ok: true,
      exists: false,
      branch: config.branch,
      remote: config.remote,
      updatedAt: null,
      sessions: [],
      workspaces: [],
    }
  }
  const manifest = await readManifest(repoDir)
  return {
    ok: true,
    exists: true,
    branch: config.branch,
    remote: config.remote,
    updatedAt: manifest.updatedAt,
    sessions: manifest.sessions,
    workspaces: manifest.workspaces,
    head: sync.head,
  }
}

/**
 * Read and validate the selected local Sessions, including subagent descendants.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {Record<string, unknown>} body - selection payload.
 * @param {AbortSignal} signal - request lifetime.
 */
async function collectSelection(ctx, body, signal) {
  const mode = selectionMode(body)
  const records = await ctx.sessionQuery.listSessions(signal)
  const available = new Map(records.map((record) => [String(record.header.id), record]))
  const workspaces = ctx.workspaceRegistry.list()
  const selectedWorkspaces = []
  const roots = []
  if (mode === 'workspaces') {
    const ids = readIdList(body.workspaceIds)
    if (ids.length === 0) throw new UserError('请至少选择一个工作区。')
    for (const id of ids) {
      const workspace = workspaces.find((candidate) => String(candidate.id) === id)
      if (workspace === undefined) throw new UserError(`工作区 ${id} 不存在。`)
      selectedWorkspaces.push(workspace)
      for (const sessionId of workspace.sessionIds) roots.push(String(sessionId))
    }
    if (roots.length === 0) throw new UserError('所选工作区还没有会话。')
  } else if (mode === 'all') {
    roots.push(...available.keys())
    selectedWorkspaces.push(...workspaces)
  } else {
    const ids = readIdList(body.sessionIds)
    if (ids.length === 0) throw new UserError('请至少选择一个会话。')
    for (const id of ids) {
      if (!available.has(id)) throw new UserError(`会话 ${id} 不存在。`)
      roots.push(id)
    }
  }

  const ids = new Set()
  const queue = [...roots]
  while (queue.length > 0) {
    signal?.throwIfAborted()
    const id = queue.shift()
    if (id === undefined || ids.has(id) || !available.has(id)) continue
    ids.add(id)
    try {
      const trace = await ctx.sessionQuery.traceSession(id, signal)
      const visit = (nodes) => {
        for (const node of nodes) {
          queue.push(String(node.session.header.id))
          visit(node.descendants)
        }
      }
      visit(trace.descendants)
    } catch {
      // A lineage that cannot be traced does not prevent exporting the Session itself.
    }
  }
  if (ids.size === 0) throw new UserError('所选范围内没有可同步的会话。')

  const workspaceById = new Map()
  const workspaceBySession = new Map()
  for (const workspace of selectedWorkspaces) workspaceById.set(String(workspace.id), workspace)
  for (const workspace of workspaces) {
    for (const sessionId of workspace.sessionIds) {
      if (!workspaceBySession.has(String(sessionId))) workspaceBySession.set(String(sessionId), workspace)
    }
  }
  for (const id of ids) {
    const record = available.get(id)
    if (record === undefined) continue
    const workspace = workspaceBySession.get(id) ?? workspaceForCwd(workspaces, record.header.cwd)
    if (workspace !== undefined) workspaceById.set(String(workspace.id), workspace)
  }
  return {
    ids: [...ids],
    workspaces: [...workspaceById.values()].map(workspaceView),
    mode,
  }
}

/**
 * Build portable payloads for every selected Session.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {{ ids: string[], workspaces: Array<Record<string, unknown>> }} selection - chosen ids.
 * @param {AbortSignal} signal - request lifetime.
 */
async function exportSessions(ctx, selection, signal) {
  const records = await ctx.sessionQuery.listSessions(signal)
  const recordById = new Map(records.map((record) => [String(record.header.id), record]))
  const titles = await ctx.sessionQuery.readTitleSnapshots(selection.ids, signal).catch(() => [])
  const titleById = new Map()
  for (const result of titles) {
    if (result.status === 'fulfilled' && result.value.title !== undefined) {
      titleById.set(String(result.sessionId), result.value.title.title)
    }
  }
  const workspaces = ctx.workspaceRegistry.list()
  const workspaceBySession = new Map()
  for (const workspace of workspaces) {
    for (const sessionId of workspace.sessionIds) {
      if (!workspaceBySession.has(String(sessionId))) workspaceBySession.set(String(sessionId), workspace)
    }
  }
  const exportedAt = new Date().toISOString()
  const entries = []
  const payloads = []
  for (const id of selection.ids) {
    signal?.throwIfAborted()
    const record = recordById.get(id)
    if (record === undefined) continue
    let snapshot
    try {
      snapshot = await ctx.sessionQuery.readSession(id)
    } catch (error) {
      throw new UserError(`读取会话 ${id} 失败：${messageOf(error)}`, 422, 'session-read-failed')
    }
    if (String(snapshot.session.id) !== id) throw new UserError(`会话 ${id} 的读取结果不一致。`, 500, 'session-read-failed')
    const workspace = workspaceBySession.get(id) ?? workspaceForCwd(workspaces, snapshot.session.cwd)
    const lastEvent = snapshot.events[snapshot.events.length - 1]
    const updatedAt = typeof lastEvent?.time === 'number' ? lastEvent.time : snapshot.session.createdAt
    const entry = {
      id,
      title: titleById.get(id) ?? directoryLabel(snapshot.session.cwd) ?? null,
      createdAt: snapshot.session.createdAt,
      updatedAt,
      eventCount: snapshot.events.length,
      formatVersion: snapshot.session.version,
      cwd: snapshot.session.cwd ?? null,
      workspace: workspace === undefined ? null : normalizeWorkspace(workspaceView(workspace)),
    }
    entries.push(entry)
    payloads.push({
      id,
      entry,
      payload: {
        schema: SCHEMA,
        version: VERSION,
        exportedAt,
        session: {
          header: snapshot.session,
          inheritedEventCount: snapshot.inheritedEventCount,
          events: snapshot.events,
        },
      },
    })
  }
  return {
    entries,
    payloads,
    workspaces: selection.workspaces,
  }
}

/**
 * Write exported payloads and merge their index into the remote manifest.
 * @param {string} repoDir - plugin worktree.
 * @param {{ entries: Array<Record<string, unknown>>, payloads: Array<{ id: string, payload: unknown }>, workspaces: Array<Record<string, unknown>> }} data - export data.
 */
async function writeExport(repoDir, data) {
  await mkdir(join(repoDir, SESSION_DIR), { recursive: true })
  const existing = await readManifest(repoDir)
  const merged = mergeManifest(existing, data.entries, data.workspaces)
  const skippedIds = new Set(merged.skipped.map((item) => item.id))
  const written = []
  for (const item of data.payloads) {
    if (skippedIds.has(item.id)) continue
    const text = JSON.stringify(item.payload)
    await writeFile(sessionFileAbsolute(repoDir, item.id), text, 'utf8')
    written.push(item.entry)
  }
  const manifest = {
    schema: merged.schema,
    version: merged.version,
    updatedAt: merged.updatedAt,
    sessions: merged.sessions,
    workspaces: merged.workspaces,
  }
  await writeManifest(repoDir, manifest)
  return { written, skipped: merged.skipped, manifest }
}

/** Push the selected Sessions, retrying once when the remote advanced meanwhile. */
async function pushSelection(ctx, rootDir, repoDir, body, signal) {
  const { config } = await readConfig(rootDir)
  requireRemote(config)
  if (await gitVersion() === null) throw new UserError('找不到 Git。请先安装 Git 并确保它在 PATH 中。', 503, 'git-unavailable')

  let lastFailure
  for (let attempt = 0; attempt < 2; attempt += 1) {
    signal?.throwIfAborted()
    const selection = await collectSelection(ctx, body, signal)
    const data = await exportSessions(ctx, selection, signal)
    const sync = await syncWorktree(repoDir, config, signal)
    if (!sync.exists) {
      await resetEmptyRepository(repoDir, config, signal)
    }
    const written = await writeExport(repoDir, data)
    const delivery = await commitAndPush(
      repoDir,
      config,
      `Sync ${written.written.length} DSH Session(s)${written.skipped.length > 0 ? ` (${written.skipped.length} remote-newer skipped)` : ''}`,
      signal,
    )
    if (delivery.ok) {
      await writeConfig(rootDir, { lastPushAt: new Date().toISOString() }).catch(() => undefined)
      return {
        ok: true,
        branch: config.branch,
        remote: config.remote,
        commit: delivery.commit,
        changed: delivery.changed,
        sessionCount: written.written.length,
        skipped: written.skipped,
        workspaces: data.workspaces,
      }
    }
    lastFailure = delivery
    if (attempt === 0 && isNonFastForward(delivery)) continue
    break
  }
  throw gitError('推送失败。', lastFailure)
}

/** Select which remote manifest rows a pull should consider. */
function selectRemoteSessions(manifest, body) {
  const mode = selectionMode(body)
  if (mode === 'all') return { entries: manifest.sessions, missing: [] }
  if (mode === 'workspaces') {
    const workspaceIds = new Set(readIdList(body.workspaceIds))
    if (workspaceIds.size === 0) throw new UserError('请至少选择一个工作区。')
    const entries = manifest.sessions.filter((entry) => entry.workspace !== null && workspaceIds.has(entry.workspace.id))
    const present = new Set(manifest.workspaces.map((workspace) => workspace.id))
    const missing = [...workspaceIds].filter((id) => !present.has(id))
    return { entries, missing }
  }
  const ids = readIdList(body.sessionIds)
  if (ids.length === 0) throw new UserError('请至少选择一个会话。')
  const byId = new Map(manifest.sessions.map((entry) => [entry.id, entry]))
  return {
    entries: ids.map((id) => byId.get(id)).filter((entry) => entry !== undefined),
    missing: ids.filter((id) => !byId.has(id)),
  }
}

/** Pull selected remote Sessions into local persistence. */
async function pullSelection(ctx, rootDir, repoDir, body, signal) {
  const { config } = await readConfig(rootDir)
  requireRemote(config)
  if (await gitVersion() === null) throw new UserError('找不到 Git。请先安装 Git 并确保它在 PATH 中。', 503, 'git-unavailable')
  const sync = await syncWorktree(repoDir, config, signal)
  if (!sync.exists) throw new UserError('远端分支还没有可导入的会话。', 404, 'remote-empty')
  const manifest = await readManifest(repoDir)
  const selected = selectRemoteSessions(manifest, body)
  if (selected.entries.length === 0) {
    throw new UserError('所选范围内没有远端会话。', 404, 'remote-selection-empty')
  }
  const targetWorkspace = resolveTargetWorkspace(ctx, body.targetWorkspaceId)
  const results = []
  for (const entry of selected.entries) {
    signal?.throwIfAborted()
    try {
      const payload = await readSessionPayload(repoDir, entry.id)
      const outcome = await importOne(ctx, entry.id, payload, targetWorkspace, signal)
      results.push({ ...outcome, id: entry.id, title: entry.title ?? outcome.title ?? null })
    } catch (error) {
      if (error && error.name === 'AbortError') throw error
      results.push({ id: entry.id, title: entry.title ?? null, status: 'error', error: redactSecrets(messageOf(error)) })
    }
  }
  const counts = countStatuses(results)
  if (counts.imported + counts.updated > 0) {
    await writeConfig(rootDir, { lastPullAt: new Date().toISOString() }).catch(() => undefined)
    announceImportedSessions(ctx, results, manifest)
  }
  return {
    ok: true,
    branch: config.branch,
    remote: config.remote,
    targetWorkspace: targetWorkspace === undefined ? null : workspaceView(targetWorkspace),
    ...counts,
    missing: selected.missing,
    sessions: results,
  }
}

/** Resolve a user-chosen local workspace used as the import destination. */
function resolveTargetWorkspace(ctx, value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new UserError('目标工作区无效。')
  const workspace = ctx.workspaceRegistry.list().find((candidate) => String(candidate.id) === value)
  if (workspace === undefined) throw new UserError('目标工作区不存在。')
  return workspace
}

/**
 * Import one remote Session, extending an existing local prefix when possible.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host context.
 * @param {string} id - Session identity.
 * @param {{ header: Record<string, unknown>, events: Array<Record<string, unknown>>, inheritedEventCount: number }} payload - validated remote payload.
 * @param {object | undefined} targetWorkspace - optional destination workspace.
 * @param {AbortSignal} signal - request lifetime.
 */
async function importOne(ctx, id, payload, targetWorkspace, signal) {
  if (ctx.sessions.get(id) !== undefined) {
    return { status: 'skipped', reason: 'live', title: titleOf(payload.header) }
  }
  const remoteHeader = payload.header
  const remoteEvents = payload.events
  const existing = await ctx.sessionPersistence.stat(id, { signal })
  if (existing !== undefined) {
    const reader = await ctx.sessionPersistence.open(id, 'read', { signal })
    let localEvents
    let localHeader
    try {
      const read = await reader.read(0, undefined, { signal })
      localEvents = read.events
      localHeader = reader.header
    } finally {
      await reader.close()
    }
    if (!isEventPrefix(localEvents, remoteEvents)) {
      if (isEventPrefix(remoteEvents, localEvents)) {
        return { status: 'local-ahead', title: titleOf(localHeader), cwd: localHeader.cwd ?? null }
      }
      return { status: 'conflict', title: titleOf(localHeader), cwd: localHeader.cwd ?? null }
    }
    if (localEvents.length === remoteEvents.length) {
      const targetMatches = targetWorkspace === undefined || localHeader.cwd === targetWorkspace.path
      const attachWarning = await attachToWorkspace(
        ctx,
        id,
        localHeader.cwd,
        targetMatches ? targetWorkspace : undefined,
      )
      return {
        status: 'up-to-date',
        title: titleOf(localHeader),
        cwd: localHeader.cwd ?? null,
        warning: targetMatches ? attachWarning : '目标工作区与已有会话的路径不同；已有会话不会被改写。',
      }
    }
    const writer = await ctx.sessionPersistence.open(id, 'write', { signal })
    try {
      await writer.append(remoteEvents.slice(localEvents.length), { signal })
      await writer.flush({ signal })
    } finally {
      await writer.close()
    }
    const targetMatches = targetWorkspace === undefined || localHeader.cwd === targetWorkspace.path
    const attachWarning = await attachToWorkspace(
      ctx,
      id,
      localHeader.cwd,
      targetMatches ? targetWorkspace : undefined,
    )
    return {
      status: 'updated',
      title: titleOf(localHeader),
      cwd: localHeader.cwd ?? null,
      addedEvents: remoteEvents.length - localEvents.length,
      warning: targetMatches ? attachWarning : '目标工作区与已有会话的路径不同；已有会话不会被改写。',
    }
  }

  const header = targetWorkspace === undefined || remoteHeader.cwd === targetWorkspace.path
    ? remoteHeader
    : { ...remoteHeader, cwd: targetWorkspace.path }
  const writer = await ctx.sessionPersistence.create(header, {
    signal,
    inheritedEventCount: payload.inheritedEventCount,
  })
  try {
    if (remoteEvents.length > 0) await writer.append(remoteEvents, { signal })
    await writer.flush({ signal })
  } finally {
    await writer.close()
  }
  const attachWarning = await attachToWorkspace(ctx, id, header.cwd, targetWorkspace)
  return {
    status: 'imported',
    title: titleOf(header),
    cwd: header.cwd ?? null,
    mapped: targetWorkspace !== undefined && remoteHeader.cwd !== targetWorkspace.path,
    warning: attachWarning,
  }
}

/**
 * Attach an imported Session to its path workspace, or to the chosen target.
 * @returns a warning string when attachment failed, otherwise undefined.
 */
async function attachToWorkspace(ctx, id, cwd, targetWorkspace) {
  let workspace = targetWorkspace
  if (workspace === undefined) {
    workspace = await resolveWorkspaceForCwd(ctx, cwd)
  }
  if (workspace === undefined) return undefined
  try {
    await workspace.attachSession(id)
    return undefined
  } catch (error) {
    return `会话已导入，但未能加入工作区：${redactSecrets(messageOf(error))}`
  }
}

/** Resolve a workspace for an existing directory, creating it when needed. */
async function resolveWorkspaceForCwd(ctx, cwd) {
  if (typeof cwd !== 'string' || cwd.trim() === '') return undefined
  try {
    const info = await stat(cwd)
    if (!info.isDirectory()) return undefined
  } catch {
    return undefined
  }
  try {
    const existing = await ctx.workspaceRegistry.resolveByPath(cwd)
    if (existing !== undefined) return existing
    return await ctx.workspaceRegistry.create(cwd, basename(cwd))
  } catch {
    return undefined
  }
}

/** Tell the connected page that newly persisted Sessions became visible. */
function announceImportedSessions(ctx, results, manifest) {
  for (const result of results) {
    if (result.status !== 'imported' && result.status !== 'updated') continue
    const row = manifest.sessions.find((entry) => entry.id === result.id)
    if (row === undefined) continue
    try {
      ctx.emit('api-session/added', {
        agentAvailable: false,
        sessionId: result.id,
        updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : Date.now(),
        running: false,
        blank: false,
        cwd: result.cwd ?? row.cwd ?? undefined,
      })
    } catch {
      // This is a best-effort UI refresh; the import itself already succeeded.
    }
  }
}

/** Find a workspace whose canonical path matches a Session header cwd. */
function workspaceForCwd(workspaces, cwd) {
  if (typeof cwd !== 'string' || cwd === '') return undefined
  return workspaces.find((workspace) => workspace.path === cwd)
}

function countStatuses(results) {
  const counts = { imported: 0, updated: 0, upToDate: 0, localAhead: 0, skipped: 0, conflicts: 0, errors: 0 }
  for (const result of results) {
    switch (result.status) {
      case 'imported': counts.imported += 1; break
      case 'updated': counts.updated += 1; break
      case 'up-to-date': counts.upToDate += 1; break
      case 'local-ahead': counts.localAhead += 1; break
      case 'conflict': counts.conflicts += 1; break
      case 'error': counts.errors += 1; break
      default: counts.skipped += 1; break
    }
  }
  return counts
}

function titleOf(header) {
  if (typeof header?.cwd === 'string' && header.cwd !== '') return directoryLabel(header.cwd)
  return null
}

function requireRemote(config) {
  if (config.remote === '') throw new UserError('请先填写 Git 仓库地址并保存。')
}

function selectionMode(body) {
  return body.mode === 'workspaces' || body.mode === 'all' ? body.mode : 'sessions'
}

function readIdList(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()))]
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

// Exports for development checks; the Loader ignores named exports beyond apply/inject.
export const __testing = {
  localSessions,
  collectSelection,
  exportSessions,
  writeExport,
  importOne,
  selectRemoteSessions,
  countStatuses,
  sessionFileRelative,
  canonicalJson,
  validateSessionPayload,
  ensureRepo,
}