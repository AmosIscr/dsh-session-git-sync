import assert from 'node:assert/strict'
import test from 'node:test'

test('client registers a sidebar entry with a panel page and a settings section', async () => {
  let factory
  globalThis.window = {
    __ModuleLoader__: {
      load(registration) {
        factory = registration.factory
      },
    },
  }
  const style = { dataset: {}, textContent: '', remove() {} }
  globalThis.document = {
    querySelector: () => null,
    createElement: () => style,
    head: { appendChild() {} },
  }

  let hookIndex = 0
  const states = []
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children }
    },
    useState(initial) {
      const index = hookIndex++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], (value) => {
        states[index] = typeof value === 'function' ? value(states[index]) : value
      }]
    },
    useRef(initial) {
      hookIndex++
      return { current: initial }
    },
    useEffect() {
      hookIndex++
    },
    useCallback(fn) {
      hookIndex++
      return fn
    },
    useMemo(fn) {
      hookIndex++
      return fn()
    },
  }

  await import('../client.js')
  assert.equal(typeof factory, 'function')
  const module = factory((name) => {
    assert.equal(name, 'react')
    return React
  })

  const registrations = []
  const t = (key) => key
  const ctx = {
    get: () => undefined,
    locale: {
      bind: () => t,
      register: () => () => undefined,
      subscribe: () => () => undefined,
      getSnapshot: () => ({ active: 'en' }),
    },
    effect(fn) {
      fn()
    },
    slots: {
      inject(_key, callback) {
        callback()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => undefined
      },
    },
  }
  module.apply(ctx)
  const section = registrations.find((entry) => entry.options.name === 'settings.section')
  const main = registrations.find((entry) => entry.options.name === 'main')
  const entry = registrations.find((entry) => entry.options.name === 'sidebar.panellist')
  assert.equal(section.options.id, 'session-git-sync')
  assert.equal(main.options.key, 'session-git-sync')
  assert.equal(entry.options.id, 'session-git-sync')

  hookIndex = 0
  const tree = section.component({ t })
  assert.equal(tree.type, 'section')
  assert.equal(tree.props.className, 'dsh-sgs-root')

  hookIndex = 0
  const panel = main.component({ t })
  assert.equal(panel.type, 'div')
  assert.equal(panel.props.className, 'dsh-sgs-page')
  assert.equal(entry.component({ size: 16 }).type, 'svg')
})