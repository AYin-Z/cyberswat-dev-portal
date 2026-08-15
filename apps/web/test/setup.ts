/**
 * vitest 全局 setup：
 * - jsdom 缺失的浏览器 API polyfill（naive-ui 需要 ResizeObserver/matchMedia）
 * - 每个用例前重置 localStorage（auth store 依赖）
 */
import { afterEach, beforeEach, vi } from 'vitest'

// —— naive-ui 依赖的浏览器 API polyfill ——
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error polyfill
  globalThis.ResizeObserver = ResizeObserverStub
}

if (!('matchMedia' in globalThis)) {
  // @ts-expect-error polyfill
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (!('scrollTo' in globalThis)) {
  // @ts-expect-error polyfill
  globalThis.scrollTo = () => {}
}

// naive-ui 某些组件会读取 Element.getBoundingClientRect / offsetHeight，jsdom 返回 0 即可
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 0 })
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 0 })

beforeEach(() => {
  localStorage.clear()
  // 恢复 fetch 为 jsdom 原始实现（各用例自行 mock）
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
