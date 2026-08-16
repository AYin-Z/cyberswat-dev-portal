<script setup lang="ts">
/**
 * EmptyState — 空状态（dark-saas：克制图标 + 弱化文字 + CTA）
 */
defineProps<{
  icon?: string
  text: string
  cta?: string
}>()
const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <div class="empty">
    <span class="icon">{{ icon ?? '⬡' }}</span>
    <p class="text">{{ text }}</p>
    <button v-if="cta" class="cta" @click="emit('action')">{{ cta }}</button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 16px;
  text-align: center;
}
.icon {
  font-size: 32px;
  color: var(--cs-ink-tertiary);
  line-height: 1;
}
.text {
  color: var(--cs-ink-subtle);
  font-size: 13px;
}
.cta {
  margin-top: 4px;
  background: transparent;
  border: 1px solid var(--cs-hairline);
  color: var(--cs-ink-muted);
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.cta:hover {
  background: var(--cs-surface-2);
}
</style>
