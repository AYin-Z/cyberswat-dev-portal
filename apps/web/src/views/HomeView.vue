<script setup lang="ts">
const cards = [
  { title: '公告', desc: '发布与已读追踪', status: '规划中' },
  { title: '点子墙', desc: '点子发布与人力招募', status: '规划中' },
  { title: '社区', desc: '帖子/评论/点赞/@', status: '规划中' },
  { title: '任务', desc: '指派/接单/验收', status: '规划中' },
]
</script>

<template>
  <section>
    <h1 class="title">CyberSWAT 开发部</h1>
    <p class="sub">dev.cyberswat.cn — 插件化架构子站骨架已就绪</p>
    <div class="grid">
      <div v-for="c in cards" :key="c.title" class="card">
        <h3>{{ c.title }}</h3>
        <p>{{ c.desc }}</p>
        <span class="badge">{{ c.status }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.title { font-size: 28px; letter-spacing: 1px; }
.sub { color: var(--muted); margin: 8px 0 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
.card h3 { margin-bottom: 8px; font-size: 16px; }
.card p { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
.badge { font-size: 12px; color: var(--accent); border: 1px solid var(--accent); padding: 2px 8px; border-radius: 999px; }
</style>
