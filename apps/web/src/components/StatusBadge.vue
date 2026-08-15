<script setup lang="ts">
import { computed } from 'vue'

/**
 * StatusBadge — 状态徽章（dark-saas：语义色 8% 透明底 + 语义色文字，不用实心色块）
 * 用法：<StatusBadge :status="'IN_PROGRESS'" type="task" />
 */
const props = defineProps<{
  status: string
  type?: 'task' | 'idea' | 'project' | 'priority' | 'generic'
}>()

const maps: Record<string, Record<string, { label: string; color: string }>> = {
  task: {
    TODO: { label: '待接单', color: 'var(--cs-ink-subtle)' },
    IN_PROGRESS: { label: '进行中', color: 'var(--cs-accent)' },
    REVIEW: { label: '待验收', color: 'var(--cs-warning)' },
    DONE: { label: '已完成', color: 'var(--cs-success)' },
  },
  idea: {
    RECRUITING: { label: '招募中', color: 'var(--cs-success)' },
    INCUBATING: { label: '孵化中', color: 'var(--cs-accent)' },
    PROMOTED: { label: '已转正', color: 'var(--cs-warning)' },
    ARCHIVED: { label: '已废弃', color: 'var(--cs-ink-subtle)' },
  },
  project: {
    ACTIVE: { label: '进行中', color: 'var(--cs-success)' },
    PAUSED: { label: '暂停', color: 'var(--cs-warning)' },
    DONE: { label: '已完成', color: 'var(--cs-accent)' },
    ARCHIVED: { label: '已归档', color: 'var(--cs-ink-subtle)' },
  },
  priority: {
    LOW: { label: '低', color: 'var(--cs-ink-subtle)' },
    MEDIUM: { label: '中', color: 'var(--cs-warning)' },
    HIGH: { label: '高', color: 'var(--cs-danger)' },
    URGENT: { label: '紧急', color: 'var(--cs-danger)' },
  },
}

const meta = computed(() => {
  const map = maps[props.type ?? 'generic'] ?? maps.generic
  return map[props.status] ?? { label: props.status, color: 'var(--cs-ink-subtle)' }
})
</script>

<template>
  <span class="badge" :style="{ color: meta.color, borderColor: `${meta.color}55` }">
    {{ meta.label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  white-space: nowrap;
}
</style>
