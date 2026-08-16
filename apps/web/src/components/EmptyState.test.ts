/**
 * EmptyState.vue 组件测试 — 空状态
 * 覆盖：文本渲染 / 图标默认值 / CTA 按钮渲染与点击事件 / 无 CTA 不渲染按钮
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from './EmptyState.vue'

describe('EmptyState.vue', () => {
  it('渲染 text 与默认图标', () => {
    const w = mount(EmptyState, { props: { text: '暂无任务' } })
    expect(w.find('.text').text()).toBe('暂无任务')
    expect(w.find('.icon').text()).toBe('⬡') // 🟢-12：与品牌字形统一
  })

  it('自定义 icon 覆盖默认值', () => {
    const w = mount(EmptyState, { props: { text: 'x', icon: '✦' } })
    expect(w.find('.icon').text()).toBe('✦')
  })

  it('有 cta 时渲染按钮，点击触发 action 事件', async () => {
    const w = mount(EmptyState, { props: { text: '暂无点子', cta: '去发第一个点子' } })
    const btn = w.find('button.cta')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('去发第一个点子')
    await btn.trigger('click')
    expect(w.emitted('action')).toHaveLength(1)
  })

  it('无 cta 时不渲染按钮', () => {
    const w = mount(EmptyState, { props: { text: '暂无公告' } })
    expect(w.find('button.cta').exists()).toBe(false)
  })
})
