<script setup lang="ts">
/**
 * PageHeader — 全站统一页头（dark-saas：标题 24px 600 负字距 + 元信息 + 右侧操作区）
 */
defineProps<{
  title: string
  sub?: string
}>()
</script>

<template>
  <div class="page-header">
    <div class="left">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="sub" class="page-sub">{{ sub }}</p>
    </div>
    <div class="actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
