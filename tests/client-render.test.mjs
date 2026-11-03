import assert from 'node:assert/strict'
import test from 'node:test'

test('client section renders its empty state without a runtime', async () => {
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

  let registered
  const t = (key) => key
  const ctx = {
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
        registered = { options, component }
        return () => undefined
      },
    },
  }
  module.apply(ctx)
  assert.equal(registered.options.name, 'settings.section')
  assert.equal(registered.options.id, 'session-git-sync')
  hookIndex = 0
  const tree = registered.component({ t })
  assert.equal(tree.type, 'section')
  assert.equal(tree.props.className, 'dsh-sgs-root')
})