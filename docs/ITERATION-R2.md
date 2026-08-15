# 迭代 R2 — Agent 体系上线（执行计划）

> 对应 docs/VISION.md 路线图 R2 · 目标："第一个 AI 队友进系统" → 扩为"双轨 agent 体系"
> 2026-08-15 二次评审拍板：内置 bot（社区嵌入式）+ 成员 agent 接入（MCP Server OAuth 2.1 + DCR）一并上线

## 0. 迭代目标与范围

**目标**：系统成为"AI 友好"的平台——内部有 bot 队友，外部成员自己的 agent 能一键接入。

**范围**（3 大交付）：
1. R2-A 系统内置 bot：`bot:dev-assistant` 社区嵌入式（@ 触发响应）
2. R2-B **MCP Server 端点**：OAuth 2.1 + PKCE + RFC 7591 DCR（成员 agent 接入）
3. R2-C /agent 接入页：工具清单 + 各平台配置片段 + 授权管理

## 1. R2-B MCP Server 设计（核心交付）

```
架构:
  MCP Server 端点 (/mcp) — 官方 @modelcontextprotocol/sdk (Streamable HTTP)
    ├─ 传输层: streamable HTTP (POST /mcp)
    ├─ 认证:   OAuth 2.1 (Authorization Code + PKCE) — SDK 自带 OAuthServerProvider
    │    ├─ GET /oauth/authorize     成员浏览器登录(复用现有 JWT 会话) + 授权确认页
    │    ├─ POST /oauth/token        code → access token (JWT, 复用签名密钥) + refresh (复用轮换表)
    │    └─ POST /oauth/register     RFC 7591 动态客户端注册 (loopback redirect 接受)
    ├─ 工具面: ToolRegistry 全量自动暴露
    │    ├─ 每个工具 = MCP tool (name/description/inputSchema 已自描述 ✅)
    │    ├─ requiresApproval 工具 → agent 调用进审批队列 (沿用现有机制)
    │    └─ 审计: ToolCallRecord.agentId = oauth client 标识
    └─ 数据面: member 级脱敏 (授权即成员身份 → 权限点继承)

授权模型:
  成员登录 → 授权确认 → code → token → agent 以该成员身份调用工具
  agent 权限 = 成员权限 (权限点继承) ; 危险工具 (publish/assign/invite) 审批兜底 ; 全量审计

参考: hermes mcp-oauth-remote-gateway skill (DCR/loopback 经验) ; 官方 SDK auth 包
```

## 2. R2-A 内置 bot 设计

```
身份: bot:dev-assistant (core_users 特殊行, role=member, 无密码)
触发: 社区帖子/评论 @dev-assistant → 响应 (复用 comment 体系, 落审计)
知识源: 工具调用 (announcement.list/idea.search/task.list/post.search + 新 bot 专属工具)
数据面: member 级脱敏 (与外部 agent 同规则)
能力边界: 只读工具可直接答; 写工具一律草稿态/审批 (与 R2-B 同纪律)
```

## 3. R2-C /agent 接入页

```
- 可用工具清单 (当前角色可见的, 含 requiresApproval 标记)
- "接入我的 agent" 向导: Claude Desktop / Cursor / Codex / hermes 配置片段
- 授权状态管理 (已授权的客户端/撤销)
- 内置 bot 使用说明 (@ 它)
```

## 4. 完成定义（DoD）

- [ ] /mcp 端点上线, 用官方 MCP client 实测工具调用 (list/call)
- [ ] OAuth 2.1 全流程: 授权 → code → token → 工具调用 → 审计带 agentId
- [ ] requiresApproval 工具经 MCP 调用 → 审批队列 → 部长批准后执行
- [ ] 内置 bot 在社区被 @ 能回答问题 (只读)
- [ ] /agent 接入页上线, 至少 Claude Desktop 配置实测通过
- [ ] 双仓推送 + AGENTS.md 里程碑更新

## 5. 风险

| 风险 | 缓解 |
|---|---|
| OAuth 2.1 + DCR 实现复杂度 | 官方 SDK auth 包自带 OAuthServerProvider/DCR; 参考 hermes skill |
| 主流客户端兼容性 (loopback redirect) | 按 RFC 8252 native app 规范接受 loopback; 用 Claude Desktop 实测 |
| bot 答非所问/幻觉 | 只读工具 + 数据面限制 + 审计; 先 @ 触发不自动响应 |
| 授权页被滥用 (他人 agent 冒充) | 授权确认页显示客户端信息 + 成员需登录 |
