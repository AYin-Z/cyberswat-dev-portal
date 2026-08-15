/**
 * StatusBadge.vue 组件测试 — 状态徽章
 * 覆盖：各类型状态映射文案 / 未知状态回退 / 无 type 不抛错
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge.vue', () => {
  it('task 状态映射：TODO → 待接单', () => {
    const w = mount(StatusBadge, { props: { status: 'TODO', type: 'task' } })
    expect(w.text()).toBe('待接单')
  })

  it('task 状态映射：IN_PROGRESS / REVIEW / DONE', () => {
    const w1 = mount(StatusBadge, { props: { status: 'IN_PROGRESS', type: 'task' } })
    expect(w1.text()).toBe('进行中')
    const w2 = mount(StatusBadge, { props: { status: 'REVIEW', type: 'task' } })
    expect(w2.text()).toBe('待验收')
    const w3 = mount(StatusBadge, { props: { status: 'DONE', type: 'task' } })
    expect(w3.text()).toBe('已完成')
  })

  it('idea 状态映射：RECRUITING → 招募中', () => {
    const w = mount(StatusBadge, { props: { status: 'RECRUITING', type: 'idea' } })
    expect(w.text()).toBe('招募中')
  })

  it('priority 状态映射：URGENT → 紧急', () => {
    const w = mount(StatusBadge, { props: { status: 'URGENT', type: 'priority' } })
    expect(w.text()).toBe('紧急')
  })

  it('未知状态回退：原样展示 status 文本', () => {
    const w = mount(StatusBadge, { props: { status: 'FOO_BAR', type: 'task' } })
    expect(w.text()).toBe('FOO_BAR')
  })

  it('无 type（undefined）不抛错，回退展示 status', () => {
    const w = mount(StatusBadge, { props: { status: 'SOME_STATE' } })
    expect(w.text()).toBe('SOME_STATE')
  })

  it('type=generic（映射表无此键）不抛错', () => {
    const w = mount(StatusBadge, { props: { status: 'X', type: 'generic' } })
    expect(w.text()).toBe('X')
  })
})
