/**
 * TaskBoardView.vue 交互测试 — 任务看板
 * 覆盖：
 *  1. 拖拽事件绑定：Sortable.js 的 end 只派发到源列，handler 用 e.from/e.to 的
 *     data-col 判定真实目标列（🔴-3 修复）→ move 状态机 claim/submit/review 分支
 *  2. 非法跳转 → message.warning（不请求 API）
 *  3. 新任务弹窗表单 → POST /api/tasks
 *
 * 事件载荷按真实 Sortable.js 结构构造：evt.item/evt.from/evt.to 都是 DOM 元素，
 * 分别携带 :data-id（卡片）与 :data-col（列容器）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { NMessageProvider } from 'naive-ui'
import TaskBoardView from './TaskBoardView.vue'
import { VueDraggableNext as draggable } from 'vue-draggable-next'

const tasks = [
  {
    id: 't1',
    title: '拖拽测试任务',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueAt: null,
    projectId: null,
    projectName: null,
    assignee: null,
    creator: { id: 'u1', nickname: 'Ayin' },
    submitNote: null,
  },
  {
    id: 't2',
    title: '进行中任务',
    description: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueAt: null,
    projectId: null,
    projectName: null,
    assignee: { id: 'u2', nickname: 'Bob' },
    creator: { id: 'u1', nickname: 'Ayin' },
    submitNote: null,
  },
  {
    id: 't3',
    title: '待验收任务',
    description: null,
    status: 'REVIEW',
    priority: 'LOW',
    dueAt: null,
    projectId: null,
    projectName: null,
    assignee: { id: 'u2', nickname: 'Bob' },
    creator: { id: 'u1', nickname: 'Ayin' },
    submitNote: 'PR #12',
  },
]

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function mockApi({ fetchMock }: { fetchMock: ReturnType<typeof vi.fn> }) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const u = String(url)
    if (u === '/api/tasks' && (!init?.method || init.method === 'GET')) return jsonOk(tasks)
    if (u === '/api/members') return jsonOk([{ id: 'u1', nickname: 'Ayin' }])
    if (u === '/api/projects') return jsonOk([])
    return jsonOk({ ok: true }) // POST 操作
  })
  vi.stubGlobal('fetch', fetchMock)
}

describe('TaskBoardView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = '' // 清理跨用例残留的 naive message/modal
  })

  function mountBoard(fetchMock: ReturnType<typeof vi.fn>) {
    mockApi({ fetchMock })
    return mount({
      components: { TaskBoardView, NMessageProvider },
      template: '<n-message-provider><task-board-view /></n-message-provider>',
    })
  }

  it('加载后按状态分列，列计数正确（数据层就绪）', async () => {
    const w = mountBoard(vi.fn())
    await flushPromises()
    // 计数来自 colTasks(col.key).length（tasks 数据已加载）
    const counts = w.findAll('.col-count')
    expect(counts[0].text()).toBe('1')
    expect(counts[1].text()).toBe('1')
    expect(counts[2].text()).toBe('1')
    expect(counts[3].text()).toBe('0')
  })

  it('回归：看板卡片正常渲染（默认槽 + v-for，修复 #item 槽无效问题）', async () => {
    // 🔴-2 修复：vue-draggable-next@2.3.0 官方 dist 的 render() 只输出默认槽内容
    // （dist/vue-draggable-next.esm-bundler.js:3414-3425，README 与产物不一致）
    // → 改用默认槽 + v-for 渲染卡片。
    const w = mountBoard(vi.fn())
    await flushPromises()
    expect(w.findAll('.card').length).toBeGreaterThan(0)
  })

  // ============ 拖拽交互 ============

  // Sortable.js 的 end 事件只派发到“拖拽起始列”的 draggable（源码 onEnd 绑定在源 sortable），
  // 且 evt.from/evt.to 是列容器 DOM 元素（带 :data-col），evt.item 是卡片 DOM 元素（带 :data-id）。
  // 🔴-3 修复：handler 不再依赖触发组件所在列，改用 e.from/e.to 的 data-col 判定真实目标列。

  it('拖拽 TODO→IN_PROGRESS：end 在源列触发（真实行为）→ claim 被调用', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    expect(cols.length).toBeGreaterThanOrEqual(4)
    const todoCol = cols[0] // 源列（TODO）——真实 Sortable.js 在此派发 end
    await todoCol.vm.$emit('end', {
      item: { dataset: { id: 't1' } },
      from: { dataset: { col: 'TODO' } },
      to: { dataset: { col: 'IN_PROGRESS' } },
    })
    await flushPromises()

    const claimCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t1/claim'))
    expect(claimCall).toBeTruthy()
    expect((claimCall![1] as RequestInit).method).toBe('POST')
  })

  it('拖拽 TODO→IN_PROGRESS：即使 end 在目标列组件上触发，from/to 判定同样生效', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const inProgressCol = cols[1] // 目标列（IN_PROGRESS）
    await inProgressCol.vm.$emit('end', {
      item: { dataset: { id: 't1' } },
      from: { dataset: { col: 'TODO' } },
      to: { dataset: { col: 'IN_PROGRESS' } },
    })
    await flushPromises()

    const claimCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t1/claim'))
    expect(claimCall).toBeTruthy()
    expect((claimCall![1] as RequestInit).method).toBe('POST')
  })

  it('状态机：IN_PROGRESS→REVIEW 打开提交说明弹窗 → 填写后确认触发 submit（🟡-4 替代 prompt）', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const reviewCol = cols[2]
    await reviewCol.vm.$emit('end', {
      item: { dataset: { id: 't2' } },
      from: { dataset: { col: 'IN_PROGRESS' } },
      to: { dataset: { col: 'REVIEW' } },
    })
    await flushPromises()

    // 弹窗打开（teleport 到 body），此时尚未请求 API
    const modalInput = document.querySelector('.n-modal textarea') as HTMLTextAreaElement | null
    expect(modalInput).toBeTruthy()
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/tasks/t2/submit'))).toBe(false)

    modalInput!.value = 'PR #42'
    modalInput!.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    const confirmBtn = Array.from(document.querySelectorAll('.n-modal button')).find((b) => b.textContent === '提交')
    expect(confirmBtn).toBeTruthy()
    confirmBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const submitCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t2/submit'))
    expect(submitCall).toBeTruthy()
    const body = JSON.parse(String((submitCall![1] as RequestInit).body))
    expect(body).toHaveProperty('note')
    expect(body.note).toBe('PR #42')
  })

  it('提交说明弹窗：空内容点提交 → 不请求 API，弹 warning 校验', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const reviewCol = cols[2]
    await reviewCol.vm.$emit('end', {
      item: { dataset: { id: 't2' } },
      from: { dataset: { col: 'IN_PROGRESS' } },
      to: { dataset: { col: 'REVIEW' } },
    })
    await flushPromises()

    const confirmBtn = Array.from(document.querySelectorAll('.n-modal button')).find((b) => b.textContent === '提交')
    confirmBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/tasks/t2/submit'))).toBe(false)
    const msg = document.body.querySelector('.n-message')
    expect(msg?.textContent).toContain('请填写提交说明')
  })

  it('状态机：REVIEW→DONE 触发 review 分支（approve: true）', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const doneCol = cols[3]
    await doneCol.vm.$emit('end', {
      item: { dataset: { id: 't3' } },
      from: { dataset: { col: 'REVIEW' } },
      to: { dataset: { col: 'DONE' } },
    })
    await flushPromises()

    const reviewCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t3/review'))
    expect(reviewCall).toBeTruthy()
    expect(JSON.parse(String((reviewCall![1] as RequestInit).body))).toEqual({ approve: true })
  })

  it('非法跳转 TODO→DONE：不请求 API，弹 warning 提示', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const doneCol = cols[3]
    await doneCol.vm.$emit('end', {
      item: { dataset: { id: 't1' } },
      from: { dataset: { col: 'TODO' } },
      to: { dataset: { col: 'DONE' } },
    })
    await flushPromises()

    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/tasks/t1'))).toBe(false)
    const msg = document.body.querySelector('.n-message')
    expect(msg?.textContent).toContain('该状态跳转需走对应操作')
  })

  // ============ 新任务弹窗 ============

  it('新任务弹窗：空标题不请求 API', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    await w.find('button').trigger('click') // ＋ 新任务（弹窗打开，内容 teleport 到 body）
    await flushPromises()
    // 弹窗内的创建按钮（标题为空直接 return）
    const createBtnEl = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === '创建')
    expect(createBtnEl).toBeTruthy()
    createBtnEl!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const postCall = fetchMock.mock.calls.find((c) => String(c[0]) === '/api/tasks' && (c[1] as RequestInit)?.method === 'POST')
    expect(postCall).toBeUndefined()
  })

  it('新任务弹窗：填写标题后创建 → POST /api/tasks', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    await w.find('button').trigger('click')
    await flushPromises()
    const titleInputEl = document.querySelector('.n-modal input[placeholder="任务标题"]') as HTMLInputElement | null
    expect(titleInputEl).toBeTruthy()
    titleInputEl!.value = '新任务标题'
    titleInputEl!.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    const createBtnEl = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === '创建')
    createBtnEl!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const postCall = fetchMock.mock.calls.find((c) => String(c[0]) === '/api/tasks' && (c[1] as RequestInit)?.method === 'POST')
    expect(postCall).toBeTruthy()
    const body = JSON.parse(String((postCall![1] as RequestInit).body))
    expect(body.title).toBe('新任务标题')
    expect(body.priority).toBe('MEDIUM')
  })
})
