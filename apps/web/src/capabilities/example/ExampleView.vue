<script setup lang="ts">
// 示例能力包前端 — 验证 UI 贡献点链路：manifest 声明 → 组合器 → 菜单/路由
</script>

<template>
  <section class="card">
    <h1>示例能力包</h1>
    <p>这个页面由 <code>capabilities/example/example.ui.ts</code> 声明，经组合器自动注册进菜单与路由。</p>
    <p>新增能力包时：写 <code>src/capabilities/&lt;name&gt;/</code> 目录 + 在 <code>ui/manifest.ts</code> 追加一行。</p>
  </section>
</template>

<style scoped>
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
.card h1 { margin-bottom: 12px; font-size: 18px; }
.card p { color: var(--muted); line-height: 1.8; font-size: 14px; }
code { background: #21262d; padding: 2px 6px; border-radius: 4px; color: var(--accent); }
</style>
