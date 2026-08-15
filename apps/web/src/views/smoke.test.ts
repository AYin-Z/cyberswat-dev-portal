/**
 * 视图冒烟测试 — 「挂载不抛错」（验证 n-message-provider 修复不复发）
 * AnnouncementNewView / ProfileView / IdeaListView：全部依赖 useMessage()，
 * 必须用 NMessageProvider 包裹后 mount，确保没有 provider 时代码不会崩溃。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { NMessageProvider, NSelect } from 'naive-ui'
import AnnouncementNewView from '../capabilities/announcement/AnnouncementNewView.vue'
import ProfileView from '../capabilities/profile/ProfileView.vue'
import IdeaListView from '../capabilities/idea-wall/IdeaListView.vue'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/announcements', component: { template: '<div />' } },
      { path: '/ideas', component: { template: '<div />' } },
      { path: '/ideas/new', component: { template: '<div />' } },
    ],
  })
}

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('视图冒烟（挂载不抛错）', () => {
  let router: Router

  beforeEach(() => {
    setActivePinia(createPinia())
    router = makeRouter()
    vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) => jsonOk([])))
    document.body.innerHTML = ''
  })

  it('AnnouncementNewView：NMessageProvider 包裹下挂载不抛错', async () => {
    const w = mount({
      components: { AnnouncementNewView, NMessageProvider },
      template: '<n-message-provider><announcement-new-view /></n-message-provider>',
    }, {
      global: { plugins: [router] },
    })
    await flushPromises()
    expect(w.exists()).toBe(true)
    expect(w.text()).toContain('发布公告')
  })

  it('AnnouncementNewView：无 NMessageProvider 时 useMessage 抛错（守卫旧 🔴-1 不复发）', () => {
    // naive-ui useMessage() 在无 provider 时 throwError —— 冒烟测试确实在守卫该回归
    expect(() =>
      mount(AnnouncementNewView, { global: { plugins: [router], stubs: { PageHeader } } }),
    ).toThrow()
  })

  it('AnnouncementNewView：空表单提交 → message.warning 校验提示', async () => {
    const w = mount({
      components: { AnnouncementNewView, NMessageProvider },
      template: '<n-message-provider><announcement-new-view /></n-message-provider>',
    }, {})
    await flushPromises()
    await w.find('form').trigger('submit')
    await flushPromises()
    // naive-ui message 渲染在 document.body（provider 挂载点外层）
    const msg = document.body.querySelector('.n-message')
    expect(msg).not.toBeNull()
    expect(msg?.textContent).toContain('标题和正文不能为空')
  })

  it('AnnouncementNewView：填写后提交 → POST /api/announcements 并跳转 /announcements', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonOk({ id: 'a1' }))
    vi.stubGlobal('fetch', fetchMock)
    const w = mount({
      components: { AnnouncementNewView, NMessageProvider },
      template: '<n-message-provider><announcement-new-view /></n-message-provider>',
    }, {
      global: { plugins: [router] },
    })
    await flushPromises()
    await w.find('form input').setValue('测试公告')
    await w.find('form textarea').setValue('公告正文内容')
    await w.find('form').trigger('submit')
    await flushPromises()

    const postCall = fetchMock.mock.calls.find((c) => String(c[0]) === '/api/announcements')
    expect(postCall).toBeTruthy()
    const init = postCall![1] as RequestInit | undefined
    expect(JSON.parse(String(init!.body))).toMatchObject({
      title: '测试公告',
      content: '公告正文内容',
      important: false,
    })
    expect(router.currentRoute.value.path).toBe('/announcements')
  })

  it('ProfileView：NMessageProvider 包裹下挂载不抛错并渲染表单数据（技能词表为空时）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/api/me')) {
          return jsonOk({ nickname: 'Ayin', grade: '2024', bio: 'hi', skills: ['Vue'], allowMatch: true, links: [] })
        }
        return jsonOk([]) // /api/skills 无分类 → 无分组选项
      }),
    )
    const w = mount({
      components: { ProfileView, NMessageProvider },
      template: '<n-message-provider><profile-view /></n-message-provider>',
    }, {})
    await flushPromises()
    expect(w.exists()).toBe(true)
    expect(w.text()).toContain('个人资料')
    const firstInput = w.find('input')
    expect(firstInput.element.value).toBe('Ayin')
  })

  it('🔴 复现真实崩溃：/api/skills 返回分组时 ProfileView 渲染 NSelect 抛错（预期失败）', async () => {
    // ProfileView.vue:112 NSelect 用分组选项（children 键为 options，ProfileView.vue:40-45），
    // 但未传 children-field → naive-ui 默认 childrenField='children' →
    // createValOptMap 读 option['children']=undefined → forEach 崩溃（value 为数组即触发；
    // 这里 skills 恒为 [] 也会触发）→ 无 errorHandler 时整个表单更新失败（白屏）。
    // 线上 naive-ui 2.44.1（lockfile 同版本）同样存在。
    // 用 errorHandler 计数渲染错误：期望 0 次 —— 当前触发 1 次 → 本用例失败（文档化缺陷）。
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/api/me')) {
          return jsonOk({ nickname: 'Ayin', grade: '2024', bio: 'hi', skills: ['Vue'], allowMatch: true, links: [] })
        }
        return jsonOk([{ name: '前端', skills: ['Vue', 'React'] }]) // 有分类 → 分组选项
      }),
    )
    let handled = 0
    const w = mount({
      components: { ProfileView, NMessageProvider },
      template: '<n-message-provider><profile-view /></n-message-provider>',
    }, {
      global: {
        config: { errorHandler: () => { handled += 1 } },
      },
    })
    await flushPromises()
    expect(w.exists()).toBe(true)
    expect(handled).toBe(0) // ← 期望资料页零渲染错误；当前 NSelect 崩溃 1 次 → 本用例失败
  })

  it('IdeaListView：挂载并渲染点子卡片 + 加入人数', async () => {
    const idea = {
      id: 'i1',
      title: '做一个内部题库',
      description: 'xxx',
      need: '缺前端',
      techStack: ['Vue'],
      status: 'RECRUITING',
      author: { id: 'u1', nickname: 'Ayin' },
      joinerCount: 2,
      joined: false,
      createdAt: '2026-08-15T10:00:00.000Z',
    }
    vi.stubGlobal('fetch', vi.fn(async () => jsonOk([idea])))
    const w = mount(IdeaListView, {
      global: {
        plugins: [router],
        stubs: { PageHeader, StatusBadge, EmptyState, RouterLink: { template: '<a><slot /></a>' } },
      },
    })
    await flushPromises()
    expect(w.text()).toContain('做一个内部题库')
    expect(w.text()).toContain('2 人加入')
    expect(w.findAll('.card')).toHaveLength(1)
  })

  it('IdeaListView：筛选状态变化触发 ?status= 重新拉取', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonOk([]))
    vi.stubGlobal('fetch', fetchMock)
    const w = mount(IdeaListView, {
      global: {
        plugins: [router],
        stubs: { PageHeader, StatusBadge, EmptyState, RouterLink: { template: '<a><slot /></a>' } },
      },
    })
    await flushPromises()
    const select = w.findComponent(NSelect)
    expect(select.exists()).toBe(true)
    select.vm.$emit('update:value', 'RECRUITING')
    await flushPromises()
    const lastCall = fetchMock.mock.calls.at(-1)![0]
    expect(String(lastCall)).toBe('/api/ideas?status=RECRUITING')
  })
})
