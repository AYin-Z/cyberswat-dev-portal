/**
 * TaskBoardView.vue 交互测试 — 任务看板
 * 覆盖：
 *  1. 拖拽事件绑定（@end 触发源列 → 期望真实流转，当前代码失败 = 复现 🟡-6 未修复）
 *  2. 目标列触发（修复方向）→ move 状态机 claim/submit/review 分支
 *  3. 非法跳转 → message.warning
 *  4. 新任务弹窗表单 → POST /api/tasks
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

  it('🔴 复现：看板卡片不渲染（vue-draggable-next #item 槽无效，预期失败）', async () => {
    // TaskBoardView.vue:159-186 使用 <template #item="{ element }"> 渲染卡片，
    // 但 vue-draggable-next@2.3.0 官方 dist 的 render() 只输出默认槽内容
    // （dist/vue-draggable-next.esm-bundler.js:3414-3425，README 与产物不一致）
    // → 卡片内容从未渲染，看板四列全空（渲染逻辑与 DOM 无关，生产同样为空）。
    // 已单独验证：#item 槽 → 0 卡片；默认槽 + v-for → 正常渲染。
    const w = mountBoard(vi.fn())
    await flushPromises()
    expect(w.findAll('.card').length).toBeGreaterThan(0) // ← 当前恒为 0 → 本用例失败
  })

  // ============ 拖拽交互 ============

  it('🔴 复现 🟡-6：拖拽 TODO→IN_PROGRESS 后 @end 在源列触发 → claim 从未被调用（预期失败）', async () => {
    // Sortable.js 的 end 事件只派发到“拖拽起始列”的 draggable（源码 onEnd 绑定在源 sortable），
    // 而 handler 里 col.key 就是源列 → `t.status !== col.key` 恒为 false → move() 永不执行。
    // 这是当前实际代码的行为：拖拽后任务状态不落库、刷新即还原。
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    expect(cols.length).toBeGreaterThanOrEqual(4)
    const todoCol = cols[0] // 源列（TODO）
    await todoCol.vm.$emit('end', { item: { dataset: { id: 't1' } }, to: {}, from: {} })
    await flushPromises()

    const claimCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t1/claim'))
    expect(claimCall).toBeTruthy() // ← 期望：拖拽应触发认领流转；当前代码不触发 → 本用例失败
  })

  it('修复方向验证：若 end 在目标列触发，claim 分支可正常工作（TODO→IN_PROGRESS）', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const inProgressCol = cols[1] // 模拟“目标列”触发
    await inProgressCol.vm.$emit('end', { item: { dataset: { id: 't1' } }, to: {}, from: {} })
    await flushPromises()

    const claimCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t1/claim'))
    expect(claimCall).toBeTruthy()
    expect((claimCall![1] as RequestInit).method).toBe('POST')
  })

  it('状态机：IN_PROGRESS→REVIEW 触发 submit 分支（提交说明走 window.prompt）', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const reviewCol = cols[2]
    await reviewCol.vm.$emit('end', { item: { dataset: { id: 't2' } }, to: {}, from: {} })
    await flushPromises()

    const submitCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/tasks/t2/submit'))
    expect(submitCall).toBeTruthy()
    const body = JSON.parse(String((submitCall![1] as RequestInit).body))
    expect(body).toHaveProperty('note')
  })

  it('状态机：REVIEW→DONE 触发 review 分支（approve: true）', async () => {
    const fetchMock = vi.fn()
    const w = mountBoard(fetchMock)
    await flushPromises()

    const cols = w.findAllComponents(draggable)
    const doneCol = cols[3]
    await doneCol.vm.$emit('end', { item: { dataset: { id: 't3' } }, to: {}, from: {} })
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
    await doneCol.vm.$emit('end', { item: { dataset: { id: 't1' } }, to: {}, from: {} })
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
