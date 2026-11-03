window.__ModuleLoader__.load({
  id: '@local/dsh-session-git-sync',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'session-git-sync'

    const en = {
      'nav.title': 'Session Git Sync',
      'page.title': 'Session Git Sync',
      'page.intro': 'Move Session history between computers through a Git repository. Select individual Sessions or every Session in a workspace.',
      'page.safety': 'Session transcripts are written to the repository as readable JSON. Use a private repository; attachments and workspace source files are not included.',
      'config.title': 'Repository',
      'config.intro': 'Each computer keeps its own clone below the DSH data directory. Only Session history travels through Git.',
      'config.remote': 'Repository URL or path',
      'config.remotePlaceholder': 'https://github.com/you/dsh-sessions.git',
      'config.branch': 'Branch',
      'config.authorName': 'Commit author name',
      'config.authorEmail': 'Commit author email',
      'config.save': 'Save',
      'config.saving': 'Saving…',
      'config.saved': 'Repository settings saved.',
      'config.test': 'Test connection',
      'config.testing': 'Testing…',
      'config.testFound': 'Remote reachable; the selected branch exists.',
      'config.testMissing': 'Remote reachable; the selected branch does not exist yet and will be created on the first upload.',
      'config.repo': 'Local clone',
      'config.gitReady': 'Git available',
      'config.gitMissing': 'Git not found in PATH',
      'config.notConfigured': 'Add a repository address to enable upload and download.',
      'config.configError': 'The saved config could not be read; defaults are shown.',
      'config.privateHint': 'Use a private repository. Do not commit credentials into the URL.',
      'tabs.upload': 'Upload',
      'tabs.download': 'Download',
      'mode.sessions': 'Sessions',
      'mode.workspaces': 'Workspaces',
      'search.sessions': 'Filter Sessions',
      'search.workspaces': 'Filter workspaces',
      'select.all': 'Select all',
      'select.clear': 'Clear',
      'upload.title': 'Upload local history',
      'upload.intro': 'The selected Sessions are appended to the repository manifest. Existing remote Sessions that are ahead of this computer are left untouched.',
      'upload.selectedSessions': '{count} Session(s) selected',
      'upload.selectedWorkspaces': '{count} workspace(s) selected',
      'upload.button': 'Upload to Git',
      'upload.uploading': 'Uploading…',
      'upload.emptySessions': 'No local Sessions match this filter.',
      'upload.emptyWorkspaces': 'No workspaces match this filter.',
      'upload.noSelection': 'Select at least one Session or workspace first.',
      'upload.result': 'Uploaded {count} Session(s) to {branch}.',
      'upload.noCommit': 'The remote already contained this selection; nothing new was committed.',
      'upload.skipped': '{count} Session(s) were skipped because the remote copy is newer.',
      'download.title': 'Download remote history',
      'download.intro': 'Read the repository branch, then import the Sessions you need. Imported Sessions become normal local Sessions.',
      'download.read': 'Read remote',
      'download.reading': 'Reading…',
      'download.updated': 'Remote updated {time}',
      'download.remoteEmpty': 'The remote branch has no Session data yet. Upload from a computer first.',
      'download.emptySessions': 'No remote Sessions match this filter.',
      'download.emptyWorkspaces': 'No remote workspaces match this filter.',
      'download.target': 'Import into',
      'download.auto': 'Match by original path',
      'download.targetHint': 'Automatic keeps each Session in the workspace with the same path, creating it when the directory exists. Choosing a workspace rewrites imported Session paths to that workspace.',
      'download.button': 'Import selected',
      'download.importing': 'Importing…',
      'download.noSelection': 'Select at least one remote Session or workspace first.',
      'download.result': 'Import finished.',
      'download.reloadHint': 'If the sidebar does not show an imported Session yet, refresh the page.',
      'download.missing': '{count} selected item(s) were not present in the remote manifest.',
      'result.title': 'Last operation',
      'result.close': 'Dismiss',
      'result.commit': 'Commit',
      'result.branch': 'Branch',
      'result.imported': 'Imported',
      'result.updated': 'Updated',
      'result.upToDate': 'Up to date',
      'result.localAhead': 'Local ahead',
      'result.skipped': 'Skipped',
      'result.conflicts': 'Conflicts',
      'result.errors': 'Errors',
      'result.mapped': 'Mapped into',
      'result.warning': 'Warning',
      'result.noRemote': 'Remote branch not found.',
      'session.untitled': 'Untitled Session',
      'session.events': '{count} events',
      'session.live': 'Open',
      'session.subagent': 'Subagent',
      'session.unknownWorkspace': 'No workspace',
      'status.loading': 'Reading local Sessions…',
      'status.loadFailed': 'Could not read local state.',
      'error.generic': 'The operation failed.',
      'common.retry': 'Retry',
      'common.none': 'None',
    }

    const zh = {
      'nav.title': '会话 Git 同步',
      'page.title': '会话 Git 同步',
      'page.intro': '通过 Git 仓库在不同电脑之间迁移会话历史。可以按单个会话选择，也可以一次选择整个工作区。',
      'page.safety': '会话记录会以可读 JSON 写入仓库。请使用私有仓库；附件与工作区源码不会上传。',
      'config.title': '仓库设置',
      'config.intro': '每台电脑在 DSH 数据目录下保留自己的克隆，只有会话历史通过 Git 传输。',
      'config.remote': '仓库地址或路径',
      'config.remotePlaceholder': 'https://github.com/you/dsh-sessions.git',
      'config.branch': '分支',
      'config.authorName': '提交作者名',
      'config.authorEmail': '提交作者邮箱',
      'config.save': '保存',
      'config.saving': '保存中…',
      'config.saved': '仓库设置已保存。',
      'config.test': '测试连接',
      'config.testing': '测试中…',
      'config.testFound': '远程仓库可访问，所选分支已存在。',
      'config.testMissing': '远程仓库可访问，所选分支尚不存在，首次上传时会自动创建。',
      'config.repo': '本地克隆',
      'config.gitReady': 'Git 可用',
      'config.gitMissing': 'PATH 中找不到 Git',
      'config.notConfigured': '填写仓库地址后即可上传和下载。',
      'config.configError': '读取已保存的配置失败，当前显示默认值。',
      'config.privateHint': '请使用私有仓库，不要把访问令牌直接写进仓库地址。',
      'tabs.upload': '上传',
      'tabs.download': '下载',
      'mode.sessions': '按会话',
      'mode.workspaces': '按工作区',
      'search.sessions': '筛选会话',
      'search.workspaces': '筛选工作区',
      'select.all': '全选',
      'select.clear': '清空',
      'upload.title': '上传本地历史',
      'upload.intro': '所选会话会合并进仓库清单。远端已经领先于本机的同一会话不会被覆盖。',
      'upload.selectedSessions': '已选择 {count} 个会话',
      'upload.selectedWorkspaces': '已选择 {count} 个工作区',
      'upload.button': '上传到 Git',
      'upload.uploading': '上传中…',
      'upload.emptySessions': '没有符合筛选条件的本地会话。',
      'upload.emptyWorkspaces': '没有符合筛选条件的工作区。',
      'upload.noSelection': '请先选择至少一个会话或工作区。',
      'upload.result': '已上传 {count} 个会话到 {branch}。',
      'upload.noCommit': '远端已经包含这些内容，没有产生新的提交。',
      'upload.skipped': '{count} 个会话因远端版本更新而跳过。',
      'download.title': '下载远端历史',
      'download.intro': '先读取仓库分支，再导入需要的会话。导入后会成为普通的本地会话。',
      'download.read': '读取远端',
      'download.reading': '读取中…',
      'download.updated': '远端更新时间：{time}',
      'download.remoteEmpty': '远端分支还没有会话数据。请先在另一台电脑上传。',
      'download.emptySessions': '没有符合筛选条件的远端会话。',
      'download.emptyWorkspaces': '没有符合筛选条件的远端工作区。',
      'download.target': '导入到',
      'download.auto': '按原始路径自动匹配',
      'download.targetHint': '自动模式会放入路径相同的工作区；目录存在但尚未注册时会自动创建工作区。选择某个工作区则会把导入会话的路径改写为该工作区。',
      'download.button': '导入所选',
      'download.importing': '导入中…',
      'download.noSelection': '请先选择至少一个远端会话或工作区。',
      'download.result': '导入完成。',
      'download.reloadHint': '如果侧边栏还没有显示导入的会话，请刷新页面。',
      'download.missing': '有 {count} 个所选项目不在远端清单中。',
      'result.title': '最近一次操作',
      'result.close': '关闭',
      'result.commit': '提交',
      'result.branch': '分支',
      'result.imported': '新导入',
      'result.updated': '已追加',
      'result.upToDate': '已是最新',
      'result.localAhead': '本地领先',
      'result.skipped': '已跳过',
      'result.conflicts': '冲突',
      'result.errors': '失败',
      'result.mapped': '映射到',
      'result.warning': '警告',
      'result.noRemote': '未找到远端分支。',
      'session.untitled': '未命名会话',
      'session.events': '{count} 个事件',
      'session.live': '打开中',
      'session.subagent': '子会话',
      'session.unknownWorkspace': '未关联工作区',
      'status.loading': '正在读取本地会话…',
      'status.loadFailed': '读取本地状态失败。',
      'error.generic': '操作失败。',
      'common.retry': '重试',
      'common.none': '无',
    }

    const CSS = `
      .dsh-sgs-root {
        box-sizing: border-box;
        width: 100%;
        max-width: 820px;
        color: var(--dsw-alias-label-primary);
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding-bottom: 28px;
        font-size: 14px;
        line-height: 22px;
      }
      .dsh-sgs-hero h2 { margin: 0 0 4px; font-size: 18px; line-height: 26px; font-weight: 600; }
      .dsh-sgs-hero p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
      .dsh-sgs-card {
        box-sizing: border-box;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        background: var(--dsw-alias-bg-layer-1);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .dsh-sgs-cardHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .dsh-sgs-cardHead h3 { margin: 0 0 3px; font-size: 15px; line-height: 22px; font-weight: 600; }
      .dsh-sgs-cardHead p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
      .dsh-sgs-badge {
        flex: none;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 999px;
        padding: 2px 9px;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        line-height: 18px;
        white-space: nowrap;
      }
      .dsh-sgs-badge[data-tone="ok"] { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 35%, transparent); }
      .dsh-sgs-badge[data-tone="warn"] { color: var(--dsw-alias-state-warn-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 35%, transparent); }
      .dsh-sgs-badge[data-tone="error"] { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent); }
      .dsh-sgs-grid { display: grid; grid-template-columns: minmax(0, 1fr) 170px; gap: 10px; }
      .dsh-sgs-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .dsh-sgs-field > label { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
      .dsh-sgs-input, .dsh-sgs-select {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        height: 34px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 13px;
        padding: 0 10px;
        outline: none;
      }
      .dsh-sgs-input:focus, .dsh-sgs-select:focus { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }
      .dsh-sgs-input::placeholder { color: var(--dsw-alias-label-secondary); opacity: .65; }
      .dsh-sgs-details { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-sgs-details summary { cursor: pointer; width: max-content; }
      .dsh-sgs-details .dsh-sgs-grid { margin-top: 8px; }
      .dsh-sgs-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .dsh-sgs-btn {
        box-sizing: border-box;
        height: 32px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 13px;
        line-height: 20px;
        padding: 0 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }
      .dsh-sgs-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-overlay); }
      .dsh-sgs-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
      .dsh-sgs-btn[data-variant="primary"] { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }
      .dsh-sgs-btn[data-variant="primary"]:hover:not(:disabled) { filter: brightness(1.05); background: var(--dsw-alias-brand-primary); }
      .dsh-sgs-btn[data-variant="ghost"] { background: transparent; border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .dsh-sgs-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .dsh-sgs-btn:disabled { cursor: not-allowed; opacity: .5; }
      .dsh-sgs-spinner {
        width: 12px; height: 12px; border-radius: 50%;
        border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
        border-top-color: currentColor;
        animation: dsh-sgs-spin .8s linear infinite;
      }
      @keyframes dsh-sgs-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .dsh-sgs-spinner { animation: none; } }
      .dsh-sgs-hint { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
      .dsh-sgs-warning { margin: 0; color: var(--dsw-alias-state-warn-primary); font-size: 12px; line-height: 18px; }
      .dsh-sgs-error { margin: 0; color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; white-space: pre-wrap; }
      .dsh-sgs-success { margin: 0; color: var(--dsw-alias-state-success-primary); font-size: 12px; line-height: 18px; }
      .dsh-sgs-tabs {
        display: flex;
        gap: 22px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
        margin-top: 2px;
      }
      .dsh-sgs-tab {
        position: relative;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 13px;
        line-height: 20px;
        padding: 7px 1px 9px;
        cursor: pointer;
      }
      .dsh-sgs-tab[data-active="true"] { color: var(--dsw-alias-label-primary); }
      .dsh-sgs-tab[data-active="true"]::after {
        content: "";
        position: absolute;
        left: 0; right: 0; bottom: -1px;
        height: 2px;
        border-radius: 2px 2px 0 0;
        background: var(--dsw-alias-label-primary);
      }
      .dsh-sgs-tab:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: 3px; }
      .dsh-sgs-panel { display: flex; flex-direction: column; gap: 12px; }
      .dsh-sgs-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .dsh-sgs-segment { display: inline-flex; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; overflow: hidden; }
      .dsh-sgs-segment button {
        border: 0; border-right: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px;
        padding: 5px 10px; cursor: pointer;
      }
      .dsh-sgs-segment button:last-child { border-right: 0; }
      .dsh-sgs-segment button[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .dsh-sgs-search { flex: 1 1 150px; min-width: 90px; height: 30px; }
      .dsh-sgs-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 320px;
        overflow: auto;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 9px;
        background: var(--dsw-alias-bg-base);
        padding: 4px;
      }
      .dsh-sgs-row {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        border-radius: 7px;
        padding: 8px;
        cursor: pointer;
        min-width: 0;
      }
      .dsh-sgs-row:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-sgs-row input[type="checkbox"] { margin: 4px 0 0; accent-color: var(--dsw-alias-brand-primary); flex: none; }
      .dsh-sgs-rowMain { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .dsh-sgs-rowTitle { font-size: 13px; line-height: 19px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsh-sgs-rowMeta { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsh-sgs-tag {
        display: inline-block;
        margin-left: 6px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 999px;
        padding: 0 6px;
        font-size: 10px;
        line-height: 15px;
        color: var(--dsw-alias-label-secondary);
        vertical-align: 1px;
      }
      .dsh-sgs-empty { padding: 22px 10px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-sgs-emptyBox { border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; padding: 24px 16px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 13px; }
      .dsh-sgs-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
      .dsh-sgs-count { color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .dsh-sgs-result { border-left: 3px solid var(--dsw-alias-state-success-primary); }
      .dsh-sgs-result[data-tone="error"] { border-left-color: var(--dsw-alias-state-error-primary); }
      .dsh-sgs-resultHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .dsh-sgs-resultHead h3 { margin: 0; font-size: 14px; line-height: 21px; font-weight: 600; }
      .dsh-sgs-kv { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 19px; }
      .dsh-sgs-kv b { color: var(--dsw-alias-label-primary); font-weight: 500; }
      .dsh-sgs-subList { display: flex; flex-direction: column; gap: 2px; max-height: 180px; overflow: auto; }
      .dsh-sgs-subRow { display: flex; gap: 8px; align-items: baseline; font-size: 12px; line-height: 18px; }
      .dsh-sgs-subRow span:first-child { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsh-sgs-subRow span:last-child { color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      @media (max-width: 620px) {
        .dsh-sgs-grid { grid-template-columns: minmax(0, 1fr); }
      }
    `

    function call(action, payload) {
      const body = { action, ...(payload || {}) }
      return fetch('api/session-git-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (response) => {
        let data
        try {
          data = await response.json()
        } catch {
          throw new Error(`HTTP ${response.status}`)
        }
        if (!response.ok || data.ok === false) {
          throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${response.status}`)
        }
        return data
      })
    }

    function formatTime(value) {
      if (typeof value !== 'number' && typeof value !== 'string') return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      try {
        const locale = typeof navigator !== 'undefined' && typeof navigator.language === 'string' && navigator.language !== ''
          ? navigator.language
          : 'en'
        return new Intl.DateTimeFormat(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      } catch {
        return date.toLocaleString()
      }
    }

    function toggle(setter, id) {
      setter((previous) => {
        const next = new Set(previous)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function sessionLabel(t, session) {
      if (session && typeof session.title === 'string' && session.title.trim() !== '') return session.title
      if (session && typeof session.cwd === 'string' && session.cwd.trim() !== '') {
        const parts = session.cwd.replace(/\\/gu, '/').split('/')
        const last = parts[parts.length - 1]
        if (last) return last
      }
      return t('session.untitled')
    }

    function workspaceLabel(workspace, t) {
      if (workspace && typeof workspace.title === 'string' && workspace.title.trim() !== '') return workspace.title
      if (workspace && typeof workspace.path === 'string' && workspace.path.trim() !== '') return workspace.path
      return t('session.unknownWorkspace')
    }

    function Button(props) {
      const { variant, busy, children, ...rest } = props
      return h('button', {
        ...rest,
        type: rest.type || 'button',
        className: `dsh-sgs-btn${rest.className ? ` ${rest.className}` : ''}`,
        'data-variant': variant || 'secondary',
        disabled: rest.disabled === true || busy === true,
        'aria-busy': busy === true ? 'true' : undefined,
      }, busy ? h('span', { className: 'dsh-sgs-spinner', 'aria-hidden': true }) : null, children)
    }

    function Badge({ tone, children }) {
      return h('span', { className: 'dsh-sgs-badge', 'data-tone': tone || 'neutral' }, children)
    }

    function SessionRow({ session, checked, onToggle, t }) {
      const meta = []
      if (session.workspace) meta.push(workspaceLabel(session.workspace, t))
      else meta.push(t('session.unknownWorkspace'))
      if (typeof session.eventCount === 'number') meta.push(t('session.events', { count: session.eventCount }))
      if (session.createdAt) meta.push(formatTime(session.createdAt))
      meta.push(session.id)
      return h('label', { className: 'dsh-sgs-row' }, [
        h('input', {
          key: 'box',
          type: 'checkbox',
          checked: checked,
          onChange: () => onToggle(session.id),
        }),
        h('span', { key: 'main', className: 'dsh-sgs-rowMain' }, [
          h('span', { key: 'title', className: 'dsh-sgs-rowTitle' }, [
            sessionLabel(t, session),
            session.live ? h('span', { key: 'live', className: 'dsh-sgs-tag' }, t('session.live')) : null,
            session.origin === 'subagent' ? h('span', { key: 'sub', className: 'dsh-sgs-tag' }, t('session.subagent')) : null,
          ]),
          h('span', { key: 'meta', className: 'dsh-sgs-rowMeta' }, meta.join(' · ')),
        ]),
      ])
    }

    function WorkspaceRow({ workspace, checked, onToggle, t }) {
      return h('label', { className: 'dsh-sgs-row' }, [
        h('input', {
          key: 'box',
          type: 'checkbox',
          checked: checked,
          onChange: () => onToggle(workspace.id),
        }),
        h('span', { key: 'main', className: 'dsh-sgs-rowMain' }, [
          h('span', { key: 'title', className: 'dsh-sgs-rowTitle' }, workspaceLabel(workspace, t)),
          h('span', { key: 'meta', className: 'dsh-sgs-rowMeta' }, `${workspace.path || ''} · ${typeof workspace.sessionCount === 'number' ? workspace.sessionCount : 0}`),
        ]),
      ])
    }

    function ResultCard({ result, t, onClose }) {
      if (!result) return null
      const data = result.data
      const isPush = result.kind === 'push'
      const tone = data.errors > 0 || data.conflicts > 0 ? 'error' : 'ok'
      const rows = []
      if (isPush) {
        rows.push(h('span', { key: 'count' }, [t('result.imported'), ' ', h('b', null, String(data.sessionCount ?? 0))]))
        rows.push(h('span', { key: 'branch' }, [t('result.branch'), ' ', h('b', null, String(data.branch || ''))]))
        if (data.commit) rows.push(h('span', { key: 'commit' }, [t('result.commit'), ' ', h('b', null, String(data.commit).slice(0, 8))]))
      } else {
        for (const key of ['imported', 'updated', 'upToDate', 'localAhead', 'skipped', 'conflicts', 'errors']) {
          const label = t(`result.${key}`)
          rows.push(h('span', { key }, [label, ' ', h('b', null, String(data[key] ?? 0))]))
        }
      }
      return h('div', { className: 'dsh-sgs-card dsh-sgs-result', 'data-tone': tone }, [
        h('div', { key: 'head', className: 'dsh-sgs-resultHead' }, [
          h('div', { key: 'text' }, [
            h('h3', null, t('result.title')),
            isPush
              ? h('p', { className: 'dsh-sgs-hint' }, data.changed === false ? t('upload.noCommit') : t('upload.result', { count: data.sessionCount ?? 0, branch: data.branch || '' }))
              : h('p', { className: 'dsh-sgs-hint' }, data.imported + data.updated > 0 ? t('download.result') : t('download.reloadHint')),
          ]),
          h(Button, { key: 'close', variant: 'ghost', onClick: onClose }, t('result.close')),
        ]),
        h('div', { key: 'kv', className: 'dsh-sgs-kv' }, rows),
        Array.isArray(data.skipped) && data.skipped.length > 0
          ? h('p', { key: 'skipped', className: 'dsh-sgs-warning' }, t('upload.skipped', { count: data.skipped.length }))
          : null,
        !isPush && Array.isArray(data.missing) && data.missing.length > 0
          ? h('p', { key: 'missing', className: 'dsh-sgs-warning' }, t('download.missing', { count: data.missing.length }))
          : null,
        !isPush && Array.isArray(data.sessions)
          ? h('div', { key: 'list', className: 'dsh-sgs-subList' }, data.sessions.map((row) => h('div', { key: row.id, className: 'dsh-sgs-subRow' }, [
            h('span', null, `${row.title || row.id}`),
            h('span', null, row.status === 'error' ? `${row.status}: ${row.error || ''}` : row.status),
          ])))
          : null,
        !isPush && data.targetWorkspace
          ? h('p', { key: 'mapped', className: 'dsh-sgs-hint' }, `${t('result.mapped')}: ${workspaceLabel(data.targetWorkspace, t)}`)
          : null,
        !isPush && data.imported + data.updated > 0
          ? h('p', { key: 'reload', className: 'dsh-sgs-hint' }, t('download.reloadHint'))
          : null,
      ])
    }

    function SessionGitSyncSection(props) {
      const t = props.t
      const [status, setStatus] = React.useState(null)
      const [statusError, setStatusError] = React.useState(null)
      const [loading, setLoading] = React.useState(true)
      const [tab, setTab] = React.useState('upload')
      const [form, setForm] = React.useState({
        remote: '',
        branch: 'main',
        authorName: '',
        authorEmail: '',
      })
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [result, setResult] = React.useState(null)
      const [uploadMode, setUploadMode] = React.useState('sessions')
      const [uploadSearch, setUploadSearch] = React.useState('')
      const [selectedSessions, setSelectedSessions] = React.useState(() => new Set())
      const [selectedWorkspaces, setSelectedWorkspaces] = React.useState(() => new Set())
      const [downloadMode, setDownloadMode] = React.useState('sessions')
      const [downloadSearch, setDownloadSearch] = React.useState('')
      const [remoteSessions, setRemoteSessions] = React.useState(() => new Set())
      const [remoteWorkspaces, setRemoteWorkspaces] = React.useState(() => new Set())
      const [targetWorkspaceId, setTargetWorkspaceId] = React.useState('')
      const [remote, setRemote] = React.useState(null)
      const [remoteLoading, setRemoteLoading] = React.useState(false)
      const [remoteError, setRemoteError] = React.useState(null)
      const formLoaded = React.useRef(false)
      const remoteAttempted = React.useRef(false)

      const applyStatus = React.useCallback((data) => {
        setStatus(data)
        setStatusError(null)
        if (!formLoaded.current) {
          formLoaded.current = true
          setForm({
            remote: data.config?.remote || '',
            branch: data.config?.branch || 'main',
            authorName: data.config?.authorName || '',
            authorEmail: data.config?.authorEmail || '',
          })
        }
        const known = new Set((data.sessions || []).map((session) => session.id))
        setSelectedSessions((previous) => new Set([...previous].filter((id) => known.has(id))))
        const knownWorkspaces = new Set((data.workspaces || []).map((workspace) => workspace.id))
        setSelectedWorkspaces((previous) => new Set([...previous].filter((id) => knownWorkspaces.has(id))))
      }, [])

      const loadStatus = React.useCallback(async () => {
        setLoading(true)
        try {
          applyStatus(await call('status'))
        } catch (failure) {
          setStatusError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setLoading(false)
        }
      }, [applyStatus])

      React.useEffect(() => {
        loadStatus()
      }, [loadStatus])

      const loadRemote = React.useCallback(async () => {
        remoteAttempted.current = true
        setRemoteLoading(true)
        setRemoteError(null)
        try {
          const data = await call('remote')
          setRemote(data)
        } catch (failure) {
          setRemoteError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setRemoteLoading(false)
        }
      }, [])

      React.useEffect(() => {
        if (tab === 'download' && remote === null && remoteLoading === false && remoteAttempted.current === false) loadRemote()
      }, [tab, remote, remoteLoading, loadRemote])

      const config = status?.config || { remote: '', branch: 'main' }
      const configured = typeof config.remote === 'string' && config.remote.trim() !== ''
      const gitAvailable = status?.git?.available === true
      const sessions = status?.sessions || []
      const workspaces = status?.workspaces || []
      const rootSessions = sessions.filter((session) => session.origin !== 'subagent')
      const filteredSessions = React.useMemo(() => {
        const needle = uploadSearch.trim().toLowerCase()
        if (needle === '') return rootSessions
        return rootSessions.filter((session) => `${session.title || ''} ${session.cwd || ''} ${session.id} ${session.workspace?.title || ''}`.toLowerCase().includes(needle))
      }, [rootSessions, uploadSearch])
      const filteredWorkspaces = React.useMemo(() => {
        const needle = uploadSearch.trim().toLowerCase()
        if (needle === '') return workspaces
        return workspaces.filter((workspace) => `${workspace.title || ''} ${workspace.path || ''}`.toLowerCase().includes(needle))
      }, [workspaces, uploadSearch])

      const remoteManifest = remote || { sessions: [], workspaces: [] }
      const remoteRootSessions = remoteManifest.sessions || []
      const remoteWorkspaceRows = React.useMemo(() => {
        const all = remoteManifest.sessions || []
        return (remoteManifest.workspaces || []).map((workspace) => ({
          ...workspace,
          sessionCount: all.filter((session) => session.workspace && session.workspace.id === workspace.id).length,
        }))
      }, [remoteManifest.sessions, remoteManifest.workspaces])
      const filteredRemoteSessions = React.useMemo(() => {
        const needle = downloadSearch.trim().toLowerCase()
        if (needle === '') return remoteRootSessions
        return remoteRootSessions.filter((session) => `${session.title || ''} ${session.cwd || ''} ${session.id} ${session.workspace?.title || ''}`.toLowerCase().includes(needle))
      }, [remoteRootSessions, downloadSearch])
      const filteredRemoteWorkspaces = React.useMemo(() => {
        const needle = downloadSearch.trim().toLowerCase()
        if (needle === '') return remoteWorkspaceRows
        return remoteWorkspaceRows.filter((workspace) => `${workspace.title || ''} ${workspace.path || ''}`.toLowerCase().includes(needle))
      }, [remoteWorkspaceRows, downloadSearch])

      const updateForm = (key) => (event) => {
        setForm((previous) => ({ ...previous, [key]: event.target.value }))
      }

      const saveConfig = async (event) => {
        event.preventDefault()
        setBusy('save')
        setError(null)
        setNotice(null)
        try {
          const data = await call('saveConfig', form)
          applyStatus(data.status)
          setRemote(null)
          remoteAttempted.current = false
          setForm({
            remote: data.config?.remote || '',
            branch: data.config?.branch || 'main',
            authorName: data.config?.authorName || '',
            authorEmail: data.config?.authorEmail || '',
          })
          setNotice(t('config.saved'))
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(null)
        }
      }

      const testConnection = async () => {
        setBusy('test')
        setError(null)
        setNotice(null)
        try {
          const data = await call('test')
          setNotice(data.exists ? t('config.testFound') : t('config.testMissing'))
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(null)
        }
      }

      const upload = async () => {
        setError(null)
        setNotice(null)
        const payload = uploadMode === 'workspaces'
          ? { mode: 'workspaces', workspaceIds: [...selectedWorkspaces] }
          : { mode: 'sessions', sessionIds: [...selectedSessions] }
        if ((payload.workspaceIds && payload.workspaceIds.length === 0) || (payload.sessionIds && payload.sessionIds.length === 0)) {
          setError(t('upload.noSelection'))
          return
        }
        setBusy('push')
        try {
          const data = await call('push', payload)
          setResult({ kind: 'push', data })
          setRemote(null)
          remoteAttempted.current = false
          await loadStatus()
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(null)
        }
      }

      const download = async () => {
        setError(null)
        setNotice(null)
        const payload = downloadMode === 'workspaces'
          ? { mode: 'workspaces', workspaceIds: [...remoteWorkspaces] }
          : { mode: 'sessions', sessionIds: [...remoteSessions] }
        if ((payload.workspaceIds && payload.workspaceIds.length === 0) || (payload.sessionIds && payload.sessionIds.length === 0)) {
          setError(t('download.noSelection'))
          return
        }
        if (targetWorkspaceId !== '') payload.targetWorkspaceId = targetWorkspaceId
        setBusy('pull')
        try {
          const data = await call('pull', payload)
          setResult({ kind: 'pull', data })
          await loadStatus()
          await loadRemote()
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        } finally {
          setBusy(null)
        }
      }

      const selectAllSessions = () => {
        setSelectedSessions(new Set(filteredSessions.map((session) => session.id)))
      }
      const selectAllWorkspaces = () => {
        setSelectedWorkspaces(new Set(filteredWorkspaces.map((workspace) => workspace.id)))
      }
      const selectAllRemoteSessions = () => {
        setRemoteSessions(new Set(filteredRemoteSessions.map((session) => session.id)))
      }
      const selectAllRemoteWorkspaces = () => {
        setRemoteWorkspaces(new Set(filteredRemoteWorkspaces.map((workspace) => workspace.id)))
      }

      const renderConfig = () => h('form', { className: 'dsh-sgs-card', onSubmit: saveConfig }, [
        h('div', { key: 'head', className: 'dsh-sgs-cardHead' }, [
          h('div', { key: 'copy' }, [
            h('h3', null, t('config.title')),
            h('p', null, t('config.intro')),
          ]),
          h(Badge, {
            key: 'git',
            tone: gitAvailable ? 'ok' : 'error',
          }, gitAvailable ? t('config.gitReady') : t('config.gitMissing')),
        ]),
        h('div', { key: 'remote', className: 'dsh-sgs-field' }, [
          h('label', { htmlFor: 'dsh-sgs-remote' }, t('config.remote')),
          h('input', {
            id: 'dsh-sgs-remote',
            className: 'dsh-sgs-input',
            value: form.remote,
            placeholder: t('config.remotePlaceholder'),
            spellCheck: false,
            autoComplete: 'off',
            onChange: updateForm('remote'),
          }),
        ]),
        h('div', { key: 'grid', className: 'dsh-sgs-grid' }, [
          h('div', { key: 'branch', className: 'dsh-sgs-field' }, [
            h('label', { htmlFor: 'dsh-sgs-branch' }, t('config.branch')),
            h('input', {
              id: 'dsh-sgs-branch',
              className: 'dsh-sgs-input',
              value: form.branch,
              spellCheck: false,
              autoComplete: 'off',
              onChange: updateForm('branch'),
            }),
          ]),
          h('div', { key: 'author', className: 'dsh-sgs-field' }, [
            h('label', { htmlFor: 'dsh-sgs-author' }, t('config.authorName')),
            h('input', {
              id: 'dsh-sgs-author',
              className: 'dsh-sgs-input',
              value: form.authorName,
              spellCheck: false,
              onChange: updateForm('authorName'),
            }),
          ]),
        ]),
        h('details', { key: 'advanced', className: 'dsh-sgs-details' }, [
          h('summary', { key: 'summary' }, t('config.authorEmail')),
          h('div', { key: 'email', className: 'dsh-sgs-field' }, [
            h('label', { htmlFor: 'dsh-sgs-email' }, t('config.authorEmail')),
            h('input', {
              id: 'dsh-sgs-email',
              className: 'dsh-sgs-input',
              value: form.authorEmail,
              spellCheck: false,
              onChange: updateForm('authorEmail'),
            }),
          ]),
        ]),
        h('div', { key: 'actions', className: 'dsh-sgs-actions' }, [
          h(Button, { key: 'save', type: 'submit', variant: 'primary', busy: busy === 'save' }, busy === 'save' ? t('config.saving') : t('config.save')),
          h(Button, { key: 'test', busy: busy === 'test', disabled: !configured, onClick: testConnection }, busy === 'test' ? t('config.testing') : t('config.test')),
        ]),
        configured
          ? h('p', { key: 'hint', className: 'dsh-sgs-hint' }, `${t('config.repo')}: ${status?.repoDir || ''}`)
          : h('p', { key: 'not', className: 'dsh-sgs-hint' }, t('config.notConfigured')),
        h('p', { key: 'private', className: 'dsh-sgs-warning' }, t('page.safety')),
        status?.configError ? h('p', { key: 'cfgerr', className: 'dsh-sgs-warning' }, t('config.configError')) : null,
      ])

      const renderUpload = () => h('div', { className: 'dsh-sgs-panel' }, [
        h('div', { key: 'head', className: 'dsh-sgs-cardHead' }, [
          h('div', { key: 'copy' }, [
            h('h3', null, t('upload.title')),
            h('p', null, t('upload.intro')),
          ]),
        ]),
        h('div', { key: 'toolbar', className: 'dsh-sgs-toolbar' }, [
          h('div', { key: 'mode', className: 'dsh-sgs-segment', role: 'group' }, [
            h('button', { key: 'sessions', type: 'button', 'data-active': String(uploadMode === 'sessions'), onClick: () => setUploadMode('sessions') }, t('mode.sessions')),
            h('button', { key: 'workspaces', type: 'button', 'data-active': String(uploadMode === 'workspaces'), onClick: () => setUploadMode('workspaces') }, t('mode.workspaces')),
          ]),
          h('input', {
            key: 'search',
            className: 'dsh-sgs-input dsh-sgs-search',
            value: uploadSearch,
            placeholder: t(uploadMode === 'workspaces' ? 'search.workspaces' : 'search.sessions'),
            onChange: (event) => setUploadSearch(event.target.value),
          }),
          uploadMode === 'sessions'
            ? h(Button, { key: 'all', variant: 'ghost', onClick: selectAllSessions }, t('select.all'))
            : h(Button, { key: 'all', variant: 'ghost', onClick: selectAllWorkspaces }, t('select.all')),
          h(Button, {
            key: 'clear',
            variant: 'ghost',
            onClick: () => {
              if (uploadMode === 'sessions') setSelectedSessions(new Set())
              else setSelectedWorkspaces(new Set())
            },
          }, t('select.clear')),
        ]),
        uploadMode === 'sessions'
          ? h('div', { key: 'list', className: 'dsh-sgs-list' }, filteredSessions.length === 0
            ? h('div', { className: 'dsh-sgs-empty' }, t('upload.emptySessions'))
            : filteredSessions.map((session) => h(SessionRow, {
              key: session.id,
              session,
              checked: selectedSessions.has(session.id),
              onToggle: (id) => toggle(setSelectedSessions, id),
              t,
            })))
          : h('div', { key: 'list', className: 'dsh-sgs-list' }, filteredWorkspaces.length === 0
            ? h('div', { className: 'dsh-sgs-empty' }, t('upload.emptyWorkspaces'))
            : filteredWorkspaces.map((workspace) => h(WorkspaceRow, {
              key: workspace.id,
              workspace,
              checked: selectedWorkspaces.has(workspace.id),
              onToggle: (id) => toggle(setSelectedWorkspaces, id),
              t,
            }))),
        h('div', { key: 'footer', className: 'dsh-sgs-footer' }, [
          h('span', { key: 'count', className: 'dsh-sgs-count' }, uploadMode === 'sessions'
            ? t('upload.selectedSessions', { count: selectedSessions.size })
            : t('upload.selectedWorkspaces', { count: selectedWorkspaces.size })),
          h(Button, {
            key: 'upload',
            variant: 'primary',
            busy: busy === 'push',
            disabled: !configured || !gitAvailable,
            onClick: upload,
          }, busy === 'push' ? t('upload.uploading') : t('upload.button')),
        ]),
      ])

      const renderDownload = () => {
        if (remoteLoading) return h('div', { className: 'dsh-sgs-emptyBox' }, t('download.reading'))
        if (remoteError) {
          return h('div', { className: 'dsh-sgs-emptyBox' }, [
            h('p', { key: 'error', className: 'dsh-sgs-error' }, remoteError),
            h(Button, { key: 'retry', onClick: loadRemote }, t('common.retry')),
          ])
        }
        if (remote === null) return h('div', { className: 'dsh-sgs-emptyBox' }, t('download.intro'))
        if (remote.exists === false) {
          return h('div', { className: 'dsh-sgs-emptyBox' }, [
            h('p', { key: 'copy' }, t('download.remoteEmpty')),
            h(Button, { key: 'retry', onClick: loadRemote }, t('download.read')),
          ])
        }
        return h('div', { className: 'dsh-sgs-panel' }, [
          h('div', { key: 'head', className: 'dsh-sgs-cardHead' }, [
            h('div', { key: 'copy' }, [
              h('h3', null, t('download.title')),
              h('p', null, t('download.intro')),
            ]),
            h(Button, { key: 'read', variant: 'ghost', busy: remoteLoading, onClick: loadRemote }, t('download.read')),
          ]),
          h('p', { key: 'updated', className: 'dsh-sgs-hint' }, remote.updatedAt ? t('download.updated', { time: formatTime(remote.updatedAt) }) : t('download.remoteEmpty')),
          h('div', { key: 'toolbar', className: 'dsh-sgs-toolbar' }, [
            h('div', { key: 'mode', className: 'dsh-sgs-segment', role: 'group' }, [
              h('button', { key: 'sessions', type: 'button', 'data-active': String(downloadMode === 'sessions'), onClick: () => setDownloadMode('sessions') }, t('mode.sessions')),
              h('button', { key: 'workspaces', type: 'button', 'data-active': String(downloadMode === 'workspaces'), onClick: () => setDownloadMode('workspaces') }, t('mode.workspaces')),
            ]),
            h('input', {
              key: 'search',
              className: 'dsh-sgs-input dsh-sgs-search',
              value: downloadSearch,
              placeholder: t(downloadMode === 'workspaces' ? 'search.workspaces' : 'search.sessions'),
              onChange: (event) => setDownloadSearch(event.target.value),
            }),
            downloadMode === 'sessions'
              ? h(Button, { key: 'all', variant: 'ghost', onClick: selectAllRemoteSessions }, t('select.all'))
              : h(Button, { key: 'all', variant: 'ghost', onClick: selectAllRemoteWorkspaces }, t('select.all')),
            h(Button, {
              key: 'clear',
              variant: 'ghost',
              onClick: () => {
                if (downloadMode === 'sessions') setRemoteSessions(new Set())
                else setRemoteWorkspaces(new Set())
              },
            }, t('select.clear')),
          ]),
          downloadMode === 'sessions'
            ? h('div', { key: 'list', className: 'dsh-sgs-list' }, filteredRemoteSessions.length === 0
              ? h('div', { className: 'dsh-sgs-empty' }, t('download.emptySessions'))
              : filteredRemoteSessions.map((session) => h(SessionRow, {
                key: session.id,
                session,
                checked: remoteSessions.has(session.id),
                onToggle: (id) => toggle(setRemoteSessions, id),
                t,
              })))
            : h('div', { key: 'list', className: 'dsh-sgs-list' }, filteredRemoteWorkspaces.length === 0
              ? h('div', { className: 'dsh-sgs-empty' }, t('download.emptyWorkspaces'))
              : filteredRemoteWorkspaces.map((workspace) => h(WorkspaceRow, {
                key: workspace.id,
                workspace,
                checked: remoteWorkspaces.has(workspace.id),
                onToggle: (id) => toggle(setRemoteWorkspaces, id),
                t,
              }))),
          h('div', { key: 'target', className: 'dsh-sgs-field' }, [
            h('label', { htmlFor: 'dsh-sgs-target' }, t('download.target')),
            h('select', {
              id: 'dsh-sgs-target',
              className: 'dsh-sgs-select',
              value: targetWorkspaceId,
              onChange: (event) => setTargetWorkspaceId(event.target.value),
            }, [
              h('option', { key: 'auto', value: '' }, t('download.auto')),
              ...workspaces.map((workspace) => h('option', { key: workspace.id, value: workspace.id }, workspaceLabel(workspace, t))),
            ]),
            h('p', { className: 'dsh-sgs-hint' }, t('download.targetHint')),
          ]),
          h('div', { key: 'footer', className: 'dsh-sgs-footer' }, [
            h('span', { key: 'count', className: 'dsh-sgs-count' }, downloadMode === 'sessions'
              ? t('upload.selectedSessions', { count: remoteSessions.size })
              : t('upload.selectedWorkspaces', { count: remoteWorkspaces.size })),
            h(Button, {
              key: 'pull',
              variant: 'primary',
              busy: busy === 'pull',
              disabled: !configured || !gitAvailable,
              onClick: download,
            }, busy === 'pull' ? t('download.importing') : t('download.button')),
          ]),
        ])
      }

      return h('section', { className: 'dsh-sgs-root' }, [
        h('div', { key: 'hero', className: 'dsh-sgs-hero' }, [
          h('h2', null, t('page.title')),
          h('p', null, t('page.intro')),
        ]),
        statusError
          ? h('div', { key: 'statusError', className: 'dsh-sgs-emptyBox' }, [
            h('p', { className: 'dsh-sgs-error' }, `${t('status.loadFailed')} ${statusError}`),
            h(Button, { onClick: loadStatus }, t('common.retry')),
          ])
          : null,
        loading && status === null ? h('div', { key: 'loading', className: 'dsh-sgs-emptyBox' }, t('status.loading')) : null,
        notice ? h('p', { key: 'notice', className: 'dsh-sgs-success' }, notice) : null,
        error ? h('p', { key: 'error', className: 'dsh-sgs-error' }, error) : null,
        status === null ? null : renderConfig(),
        result ? h(ResultCard, { key: 'result', result, t, onClose: () => setResult(null) }) : null,
        h('div', { key: 'tabs', className: 'dsh-sgs-tabs', role: 'tablist' }, [
          h('button', {
            key: 'upload',
            type: 'button',
            className: 'dsh-sgs-tab',
            role: 'tab',
            'aria-selected': String(tab === 'upload'),
            'data-active': String(tab === 'upload'),
            onClick: () => setTab('upload'),
          }, t('tabs.upload')),
          h('button', {
            key: 'download',
            type: 'button',
            className: 'dsh-sgs-tab',
            role: 'tab',
            'aria-selected': String(tab === 'download'),
            'data-active': String(tab === 'download'),
            onClick: () => setTab('download'),
          }, t('tabs.download')),
        ]),
        tab === 'upload' ? renderUpload() : renderDownload(),
      ])
    }

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-git-sync: dictionaries')
      ctx.effect(() => {
        const existing = document.querySelector('style[data-session-git-sync-style]')
        if (existing !== null) existing.remove()
        const style = document.createElement('style')
        style.dataset.sessionGitSyncStyle = 'true'
        style.dataset.plugin = '@local/dsh-session-git-sync'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'session-git-sync: styles')
      ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'session-git-sync',
        order: 18,
        label: () => t('nav.title'),
        locale: NS,
      }, SessionGitSyncSection)), 'session-git-sync: settings page')
    }

    return { inject: ['slots', 'locale'], apply }
  },
})