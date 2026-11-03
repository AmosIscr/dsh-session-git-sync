/**
 * Repository, manifest, and Git primitives for Session Git Sync.
 *
 * This module is deliberately independent of Cordis and the Session services so
 * its on-disk and Git behavior can be tested with a temporary remote.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

export const SCHEMA = 'dsh-session-git-sync'
export const VERSION = 1
export const MANIFEST_PATH = 'dsh-sessions/manifest.json'
export const SESSION_DIR = 'dsh-sessions/sessions'
export const DEFAULT_BRANCH = 'main'
export const DEFAULT_AUTHOR_NAME = 'DSH Session Sync'
export const DEFAULT_AUTHOR_EMAIL = 'dsh-session-sync@localhost'
export const MAX_MANIFEST_BYTES = 16 * 1024 * 1024
export const MAX_SESSION_BYTES = 256 * 1024 * 1024
export const GIT_TIMEOUT_MS = 180_000

/** A failure that is safe and useful to show to the person using the panel. */
export class UserError extends Error {
  /**
   * @param {string} message - localized, actionable text.
   * @param {number} [status] - HTTP status for the Host route.
   * @param {string} [code] - stable machine-readable failure category.
   */
  constructor(message, status = 400, code = 'bad-request') {
    super(message)
    this.name = 'UserError'
    this.status = status
    this.code = code
  }
}

/** Resolve the plugin-owned directory below DSH_HOME. */
export function resolveRootDir(env = process.env, home = homedir()) {
  const dshHome = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== ''
    ? env.DSH_HOME.trim()
    : join(home, '.dsh')
  return resolve(dshHome, 'session-git-sync')
}

/** Defaults used when no config exists yet. */
export function defaultConfig() {
  return {
    remote: '',
    branch: DEFAULT_BRANCH,
    authorName: DEFAULT_AUTHOR_NAME,
    authorEmail: DEFAULT_AUTHOR_EMAIL,
    lastPushAt: null,
    lastPullAt: null,
  }
}

/** Validate and normalize one persisted config object. */
export function normalizeConfig(raw) {
  const base = defaultConfig()
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base
  return {
    remote: typeof raw.remote === 'string' ? raw.remote.trim() : base.remote,
    branch: normalizeBranch(raw.branch),
    authorName: normalizeAuthor(raw.authorName, base.authorName),
    authorEmail: normalizeAuthor(raw.authorEmail, base.authorEmail),
    lastPushAt: typeof raw.lastPushAt === 'string' ? raw.lastPushAt : null,
    lastPullAt: typeof raw.lastPullAt === 'string' ? raw.lastPullAt : null,
  }
}

/** Validate a branch name before it reaches Git argv or a refspec. */
export function normalizeBranch(value) {
  const branch = typeof value === 'string' ? value.trim() : ''
  if (branch === '') return DEFAULT_BRANCH
  if (branch.length > 200) throw new UserError('分支名过长（最多 200 个字符）。')
  if (
    branch.startsWith('-')
    || branch.includes('..')
    || branch.includes('//')
    || branch.includes('@{')
    || /[\s~^:?*[\\\u0000-\u001f\u007f]/u.test(branch)
    || branch.endsWith('/')
    || branch.endsWith('.')
    || branch.endsWith('.lock')
    || branch.startsWith('/')
  ) {
    throw new UserError('分支名无效。请使用类似 main 或 feature/sync 的名称。')
  }
  return branch
}

/** Keep author text single-line and bounded; Git accepts the rest. */
export function normalizeAuthor(value, fallback) {
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  if (text === '') return fallback
  if (text.length > 200 || /[\r\n\u0000]/u.test(text)) {
    throw new UserError('提交作者信息无效（最多 200 个字符，且不能包含换行）。')
  }
  return text
}

/** Validate the remote spelling that is about to be passed to Git. */
export function normalizeRemote(value) {
  const remote = typeof value === 'string' ? value.trim() : ''
  if (remote === '') return ''
  if (remote.length > 4096 || remote.startsWith('-') || /[\r\n\u0000]/u.test(remote)) {
    throw new UserError('Git 仓库地址无效。')
  }
  return remote
}

/** Read config, treating a missing file as first use and a bad file as an error. */
export async function readConfig(rootDir) {
  const path = join(rootDir, 'config.json')
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return { config: defaultConfig(), configError: null }
    throw error
  }
  try {
    return { config: normalizeConfig(JSON.parse(text)), configError: null }
  } catch (error) {
    return {
      config: defaultConfig(),
      configError: `配置文件无法解析，已使用默认值：${messageOf(error)}`,
    }
  }
}

/** Persist config atomically enough for a small single-user file. */
export async function writeConfig(rootDir, patch) {
  const current = (await readConfig(rootDir)).config
  const next = normalizeConfig({ ...current, ...patch })
  await mkdir(rootDir, { recursive: true })
  await writeFile(join(rootDir, 'config.json'), `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}

/** Neutralize a Session id into one path segment; append a hash when changed. */
export function safeSessionIdSegment(id) {
  const text = String(id)
  const safe = text.replace(/[^A-Za-z0-9._-]/gu, '_')
  if (safe === text) return safe === '' || safe === '.' || safe === '..' ? `session_${shortHash(text)}` : safe
  return `${safe || 'session'}-${shortHash(text)}`
}

/** Relative path of one session payload below the sync root. */
export function sessionFileRelative(id) {
  return `${SESSION_DIR}/${safeSessionIdSegment(id)}.json`
}

/** Absolute path of one session payload, guarded against segments escaping the root. */
export function sessionFileAbsolute(repoDir, id) {
  const root = resolve(repoDir, SESSION_DIR)
  const path = resolve(repoDir, sessionFileRelative(id))
  if (path !== root && !path.startsWith(`${root}\\`) && !path.startsWith(`${root}/`)) {
    throw new UserError('会话文件名越过了同步目录。', 400, 'invalid-session-id')
  }
  return path
}

/** Empty manifest used before the first push. */
export function emptyManifest() {
  return { schema: SCHEMA, version: VERSION, updatedAt: null, sessions: [], workspaces: [] }
}

/** Parse and validate one manifest read from the sync worktree. */
export async function readManifest(repoDir) {
  const path = join(repoDir, MANIFEST_PATH)
  let text
  try {
    const info = await stat(path)
    if (info.size > MAX_MANIFEST_BYTES) throw new UserError('远端清单过大，已拒绝读取。', 422, 'manifest-too-large')
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return emptyManifest()
    throw error
  }
  let raw
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new UserError(`远端清单不是有效 JSON：${messageOf(error)}`, 422, 'invalid-manifest')
  }
  if (typeof raw !== 'object' || raw === null || raw.schema !== SCHEMA) {
    throw new UserError('远端清单不是本插件生成的格式。', 422, 'invalid-manifest')
  }
  if (raw.version !== VERSION) {
    throw new UserError(`远端清单版本 ${String(raw.version)} 不受支持（本机支持 ${VERSION}）。`, 422, 'manifest-version')
  }
  if (!Array.isArray(raw.sessions) || !Array.isArray(raw.workspaces)) {
    throw new UserError('远端清单缺少 sessions 或 workspaces 数组。', 422, 'invalid-manifest')
  }
  return {
    schema: SCHEMA,
    version: VERSION,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    sessions: raw.sessions.map(normalizeManifestEntry).filter(Boolean),
    workspaces: raw.workspaces.map(normalizeWorkspace).filter(Boolean),
  }
}

/** Persist a manifest with stable formatting for reviewable Git diffs. */
export async function writeManifest(repoDir, manifest) {
  const path = join(repoDir, MANIFEST_PATH)
  await mkdir(dirname(path), { recursive: true })
  const body = {
    schema: SCHEMA,
    version: VERSION,
    updatedAt: manifest.updatedAt ?? new Date().toISOString(),
    sessions: manifest.sessions,
    workspaces: manifest.workspaces,
  }
  await writeFile(path, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
}

/** One manifest session row, dropping anything unreadable. */
export function normalizeManifestEntry(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const id = cleanSessionId(raw.id)
  if (id === null) return null
  return {
    id,
    title: typeof raw.title === 'string' && raw.title.trim() !== '' ? raw.title.slice(0, 300) : null,
    createdAt: finiteNumber(raw.createdAt),
    updatedAt: finiteNumber(raw.updatedAt),
    eventCount: nonNegativeInteger(raw.eventCount),
    formatVersion: nonNegativeInteger(raw.formatVersion),
    cwd: typeof raw.cwd === 'string' ? raw.cwd.slice(0, 4096) : null,
    workspace: normalizeWorkspace(raw.workspace),
  }
}

/** One workspace row from the manifest or a workspace projection. */
export function normalizeWorkspace(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const id = cleanSessionId(raw.id)
  if (id === null) return null
  return {
    id,
    title: typeof raw.title === 'string' && raw.title.trim() !== '' ? raw.title.slice(0, 300) : null,
    path: typeof raw.path === 'string' ? raw.path.slice(0, 4096) : null,
  }
}

/** Session ids are opaque strings, but never path fragments or control text. */
export function cleanSessionId(value) {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (id === '' || id.length > 300 || /[\u0000-\u001f\u007f]/u.test(id)) return null
  return id
}

/** Merge a pushed selection into the remote manifest without deleting other rows. */
export function mergeManifest(existing, incomingSessions, incomingWorkspaces) {
  const sessions = new Map(existing.sessions.map((row) => [row.id, row]))
  const skipped = []
  for (const incoming of incomingSessions) {
    const previous = sessions.get(incoming.id)
    if (previous !== undefined && Number(previous.eventCount ?? 0) > Number(incoming.eventCount ?? 0)) {
      skipped.push({ id: incoming.id, reason: 'remote-newer', remoteEventCount: previous.eventCount, localEventCount: incoming.eventCount })
      continue
    }
    sessions.set(incoming.id, incoming)
  }
  const workspaces = new Map(existing.workspaces.map((row) => [row.id, row]))
  for (const incoming of incomingWorkspaces) workspaces.set(incoming.id, incoming)
  return {
    schema: SCHEMA,
    version: VERSION,
    updatedAt: new Date().toISOString(),
    sessions: [...sessions.values()].sort(compareSessionRows),
    workspaces: [...workspaces.values()].sort((a, b) => a.id.localeCompare(b.id)),
    skipped,
  }
}

function compareSessionRows(a, b) {
  const time = Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)
  return time !== 0 ? time : a.id.localeCompare(b.id)
}

/** Read one exported session payload and validate its shape. */
export async function readSessionPayload(repoDir, id) {
  const path = sessionFileAbsolute(repoDir, id)
  const info = await stat(path)
  if (info.size > MAX_SESSION_BYTES) {
    throw new UserError(`会话 ${id} 的同步文件过大，已拒绝读取。`, 422, 'session-too-large')
  }
  let raw
  try {
    raw = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new UserError(`会话 ${id} 的同步文件不是有效 JSON：${messageOf(error)}`, 422, 'invalid-session-file')
  }
  return validateSessionPayload(raw, id)
}

/** Validate an export payload before it can reach persistence. */
export function validateSessionPayload(raw, expectedId) {
  if (typeof raw !== 'object' || raw === null || raw.schema !== SCHEMA || raw.version !== VERSION) {
    throw new UserError('会话同步文件格式不受支持。', 422, 'invalid-session-file')
  }
  const session = raw.session
  if (typeof session !== 'object' || session === null) throw new UserError('会话同步文件缺少 session。', 422, 'invalid-session-file')
  const header = session.header
  if (typeof header !== 'object' || header === null) throw new UserError('会话同步文件缺少 header。', 422, 'invalid-session-file')
  const id = cleanSessionId(header.id)
  if (id === null || id !== expectedId) throw new UserError('会话同步文件的 id 与清单不一致。', 422, 'session-id-mismatch')
  if (!Number.isInteger(header.version) || header.version < 1) throw new UserError('会话格式版本无效。', 422, 'invalid-session-file')
  if (typeof header.createdAt !== 'number' || !Number.isFinite(header.createdAt)) throw new UserError('会话 createdAt 无效。', 422, 'invalid-session-file')
  if (typeof header.isSeeded !== 'boolean') throw new UserError('会话 isSeeded 无效。', 422, 'invalid-session-file')
  if (!Array.isArray(session.events)) throw new UserError('会话同步文件缺少事件数组。', 422, 'invalid-session-file')
  for (let index = 0; index < session.events.length; index += 1) {
    const event = session.events[index]
    if (typeof event !== 'object' || event === null || Array.isArray(event)) {
      throw new UserError(`会话事件 ${index} 不是对象。`, 422, 'invalid-session-file')
    }
    if (event.seq !== index) throw new UserError(`会话事件序列不连续（期望 ${index}，收到 ${String(event.seq)}）。`, 422, 'invalid-session-seq')
    if (typeof event.type !== 'string' || event.type === '') throw new UserError(`会话事件 ${index} 缺少类型。`, 422, 'invalid-session-file')
    if (typeof event.time !== 'number' || !Number.isFinite(event.time)) throw new UserError(`会话事件 ${index} 的时间无效。`, 422, 'invalid-session-file')
    if (typeof event.data !== 'object' || event.data === null) throw new UserError(`会话事件 ${index} 的数据无效。`, 422, 'invalid-session-file')
  }
  const inheritedEventCount = nonNegativeInteger(session.inheritedEventCount) ?? 0
  return { header, events: session.events, inheritedEventCount, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null }
}

/** Stable JSON useful for prefix comparisons across reads. */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
}

/** Whether `left` is an exact prefix of `right`, compared structurally. */
export function isEventPrefix(left, right) {
  if (left.length > right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (canonicalJson(left[index]) !== canonicalJson(right[index])) return false
  }
  return true
}

/** Run Git without a shell, with a bounded output and process lifetime. */
export function runGit(args, options = {}) {
  const cwd = options.cwd
  const signal = options.signal
  const timeoutMs = options.timeoutMs ?? GIT_TIMEOUT_MS
  return new Promise((resolvePromise) => {
    let settled = false
    let stdout = ''
    let stderr = ''
    let timer
    let child
    const finish = (result) => {
      if (settled) return
      settled = true
      if (timer !== undefined) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolvePromise(result)
    }
    const append = (current, chunk) => {
      if (current.length >= 1_000_000) return current
      return (current + chunk.toString('utf8')).slice(0, 1_000_000)
    }
    const onAbort = () => {
      try {
        child?.kill()
      } catch {
        // The process may already have exited.
      }
      finish({ code: -3, stdout, stderr: `${stderr}\nAborted`.trim() })
    }
    if (signal?.aborted) {
      finish({ code: -3, stdout: '', stderr: 'Aborted' })
      return
    }
    try {
      child = spawn('git', args, {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_PAGER: 'cat',
          GIT_OPTIONAL_LOCKS: '0',
        },
      })
    } catch (error) {
      finish({ code: -1, stdout: '', stderr: messageOf(error) })
      return
    }
    child.stdout?.on('data', (chunk) => {
      stdout = append(stdout, chunk)
    })
    child.stderr?.on('data', (chunk) => {
      stderr = append(stderr, chunk)
    })
    child.on('error', (error) => {
      finish({
        code: -1,
        stdout,
        stderr: error && error.code === 'ENOENT'
          ? '找不到 git 可执行文件。请先安装 Git，并确保它在 PATH 中。'
          : messageOf(error),
      })
    })
    child.on('close', (code) => {
      finish({ code: code ?? -1, stdout, stderr })
    })
    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // The process may already have exited.
      }
      finish({ code: -2, stdout, stderr: `${stderr}\nGit 操作超时。`.trim() })
    }, timeoutMs)
  })
}

let gitVersionPromise

/** Probe the installed Git once per Host process. */
export function gitVersion() {
  if (gitVersionPromise === undefined) {
    gitVersionPromise = runGit(['--version'], { timeoutMs: 10_000 }).then((result) => (
      result.code === 0 ? result.stdout.trim() : null
    ))
  }
  return gitVersionPromise
}

/** Ensure the plugin-owned repository exists and is on the configured branch. */
export async function ensureRepo(repoDir, branch, signal) {
  await mkdir(repoDir, { recursive: true })
  if (!existsSync(join(repoDir, '.git'))) {
    const init = await runGit(['init', '-b', branch], { cwd: repoDir, signal })
    if (init.code !== 0) throw gitError('无法初始化 Git 仓库。', init)
    await runGit(['config', 'core.autocrlf', 'false'], { cwd: repoDir, signal })
  }
  return repoDir
}

/** Point origin at the configured remote. */
export async function setRemote(repoDir, remote, signal) {
  const current = await runGit(['remote', 'get-url', 'origin'], { cwd: repoDir, signal })
  if (current.code === 0) {
    if (current.stdout.trim() === remote) return
    const update = await runGit(['remote', 'set-url', 'origin', remote], { cwd: repoDir, signal })
    if (update.code !== 0) throw gitError('无法更新 Git 远程地址。', update)
    return
  }
  const add = await runGit(['remote', 'add', 'origin', remote], { cwd: repoDir, signal })
  if (add.code !== 0) throw gitError('无法添加 Git 远程地址。', add)
}

/**
 * Fetch the configured branch and make the plugin worktree match it exactly.
 * An accessible remote with no such branch returns `{ exists: false }` so the
 * first push can start a new branch.
 */
export async function syncWorktree(repoDir, config, signal) {
  await ensureRepo(repoDir, config.branch, signal)
  await setRemote(repoDir, config.remote, signal)
  const remoteRef = `refs/remotes/origin/${config.branch}`
  const fetch = await runGit(
    ['fetch', '--prune', 'origin', `+refs/heads/${config.branch}:${remoteRef}`],
    { cwd: repoDir, signal },
  )
  if (fetch.code !== 0) {
    const probe = await runGit(['ls-remote', '--heads', config.remote, config.branch], { cwd: repoDir, signal, timeoutMs: 60_000 })
    if (probe.code !== 0) throw gitError('无法访问 Git 远程仓库。', fetch, probe.stderr)
    return { exists: false, branch: config.branch }
  }
  const verify = await runGit(['rev-parse', '--verify', remoteRef], { cwd: repoDir, signal })
  if (verify.code !== 0) return { exists: false, branch: config.branch }
  const checkout = await runGit(['checkout', '-B', config.branch, remoteRef], { cwd: repoDir, signal })
  if (checkout.code !== 0) throw gitError('无法切换到远端分支。', checkout)
  const reset = await runGit(['reset', '--hard', remoteRef], { cwd: repoDir, signal })
  if (reset.code !== 0) throw gitError('无法同步 Git 工作区。', reset)
  const clean = await runGit(['clean', '-fd'], { cwd: repoDir, signal })
  if (clean.code !== 0) throw gitError('无法清理 Git 工作区。', clean)
  const head = await runGit(['rev-parse', 'HEAD'], { cwd: repoDir, signal })
  return { exists: true, branch: config.branch, head: head.stdout.trim() }
}

/** Switch an empty remote branch to the configured local branch. */
export async function prepareEmptyBranch(repoDir, branch, signal) {
  const head = await runGit(['rev-parse', '--verify', 'HEAD'], { cwd: repoDir, signal })
  if (head.code !== 0) {
    const symbolic = await runGit(['symbolic-ref', 'HEAD', `refs/heads/${branch}`], { cwd: repoDir, signal })
    if (symbolic.code !== 0) throw gitError('无法创建 Git 分支。', symbolic)
    return
  }
  const checkout = await runGit(['checkout', '-B', branch], { cwd: repoDir, signal })
  if (checkout.code !== 0) throw gitError('无法切换到 Git 分支。', checkout)
}

/**
 * Forget a plugin-private clone whose remote branch does not exist. Starting
 * from a fresh repository prevents old local commits or Session files from a
 * previous remote from leaking into a newly selected repository.
 */
export async function resetEmptyRepository(repoDir, config, signal) {
  await rm(join(repoDir, '.git'), { recursive: true, force: true })
  await ensureRepo(repoDir, config.branch, signal)
  await setRemote(repoDir, config.remote, signal)
  await clearSyncTree(repoDir)
}

/** Commit the worktree and push HEAD to the configured remote branch. */
export async function commitAndPush(repoDir, config, message, signal) {
  const add = await runGit(['add', '-A'], { cwd: repoDir, signal })
  if (add.code !== 0) throw gitError('无法暂存同步文件。', add)
  const diff = await runGit(['diff', '--cached', '--quiet'], { cwd: repoDir, signal })
  if (diff.code !== 0 && diff.code !== 1) throw gitError('无法检查暂存区。', diff)
  const changed = diff.code === 1
  if (changed) {
    const commit = await runGit([
      '-c', `user.name=${config.authorName}`,
      '-c', `user.email=${config.authorEmail}`,
      'commit', '--no-gpg-sign', '-m', message,
    ], { cwd: repoDir, signal })
    if (commit.code !== 0) throw gitError('无法创建 Git 提交。', commit)
  }
  const head = await runGit(['rev-parse', '--verify', 'HEAD'], { cwd: repoDir, signal })
  if (head.code !== 0) return { ok: false, changed, stderr: '没有可推送的提交。' }
  const push = await runGit(
    ['push', '--porcelain', 'origin', `HEAD:refs/heads/${config.branch}`],
    { cwd: repoDir, signal },
  )
  if (push.code !== 0) {
    return { ok: false, changed, commit: head.stdout.trim(), stderr: push.stderr, stdout: push.stdout }
  }
  return { ok: true, changed, commit: head.stdout.trim() }
}

/** Whether a failed push can be retried after re-reading the remote. */
export function isNonFastForward(result) {
  const text = `${result?.stderr ?? ''}\n${result?.stdout ?? ''}`.toLowerCase()
  return text.includes('non-fast-forward') || text.includes('fetch first') || text.includes('rejected')
}

/** Build a safe diagnostic from one or more Git results. */
export function gitError(title, primary, extra) {
  const detail = redactSecrets([primary?.stderr, extra].filter(Boolean).join('\n').trim())
  return new UserError(detail === '' ? title : `${title}\n${detail.slice(0, 4000)}`, 502, 'git-failed')
}

/** Remove credentials that Git may echo back from a URL. */
export function redactSecrets(text) {
  return String(text)
    .replace(/(https?:\/\/)([^/@\s]+)@/giu, '$1***@')
    .replace(/(Authorization:\s*)(\S+)/giu, '$1***')
}

/** Localized one-line message for any thrown value. */
export function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function shortHash(text) {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null
}

/** Delete any stale sync tree before creating a brand-new remote branch. */
export async function clearSyncTree(repoDir) {
  await rm(join(repoDir, 'dsh-sessions'), { recursive: true, force: true })
}

/** Name of the directory a Session is grouped under, for display fallbacks. */
export function directoryLabel(cwd) {
  if (typeof cwd !== 'string' || cwd.trim() === '') return null
  return basename(cwd)
}