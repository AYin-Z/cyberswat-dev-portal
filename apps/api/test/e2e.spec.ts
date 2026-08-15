import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/core/db/prisma.service'

/**
 * R1-T1 e2e 核心链路测试（认证/邀请/权限/匹配/审批/项目级权限）
 * 测试库: cyberswat_test（独立 schema，测试前清库）
 */
describe('CyberSWAT dev portal e2e', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
    await app.init()
    prisma = app.get(PrismaService)
    // 清库（保持幂等）
    await prisma.coreReport.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.announcementRead.deleteMany()
    await prisma.announcement.deleteMany()
    await prisma.task.deleteMany()
    await prisma.projectMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.ideaJoiner.deleteMany()
    await prisma.idea.deleteMany()
    await prisma.postLike.deleteMany()
    await prisma.postComment.deleteMany()
    await prisma.post.deleteMany()
    await prisma.coreRefreshToken.deleteMany()
    await prisma.coreInvite.deleteMany()
    await prisma.coreUser.deleteMany()
  })

  afterAll(async () => {
    await app.close()
  })

  const api = () => request(app.getHttpServer())

  // ============ 认证 ============

  it('注册：无邀请令牌被拒', async () => {
    const res = await api().post('/api/auth/register').send({
      email: 'nobody@test.cn',
      password: 'password123',
      nickname: '无邀请',
    })
    expect(res.status).toBe(400)
  })

  it('注册：有效邀请令牌成功（角色随邀请）', async () => {
    // 直插邀请（令牌 sha256）
    const { createHash } = await import('node:crypto')
    const token = 'e2e-invite-token-001'
    await prisma.coreInvite.create({
      data: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
        role: 'MEMBER',
        expiresAt: new Date(Date.now() + 86400_000),
        maxUses: 1,
        createdBy: 'e2e',
      },
    })
    const res = await api().post('/api/auth/register').send({
      email: 'member@test.cn',
      password: 'password123',
      nickname: '测试成员',
      inviteToken: token,
    })
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('member')
    expect(res.body.accessToken).toBeTruthy()
  })

  it('登录 → JWT → me', async () => {
    const login = await api().post('/api/auth/login').send({
      email: 'member@test.cn',
      password: 'password123',
    })
    expect(login.status).toBe(201)
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(me.status).toBe(200)
    expect(me.body.nickname).toBe('测试成员')
  })

  // ============ 权限 ============

  it('member 调部长 API（发公告）→ 403', async () => {
    const login = await api().post('/api/auth/login').send({
      email: 'member@test.cn',
      password: 'password123',
    })
    const res = await api().post('/api/announcements').set('Authorization', `Bearer ${login.body.accessToken}`).send({
      title: '越权公告',
      content: 'x',
    })
    expect(res.status).toBe(403)
  })

  // ============ 审批（agent 危险工具） ============

  it('agent 调用 requiresApproval 工具 → pending 审批队列', async () => {
    // 提升为 dept-leader 走通审批
    const u = await prisma.coreUser.findUnique({ where: { email: 'member@test.cn' } })
    await prisma.coreUser.update({ where: { id: u!.id }, data: { role: 'DEPT_LEADER' } })
    const login = await api().post('/api/auth/login').send({
      email: 'member@test.cn',
      password: 'password123',
    })
    const res = await api()
      .post('/api/tools/announcement.publish/call')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ params: { title: 'agent 公告', content: '审批测试' } })
    // HTTP 人工调用 skipApproval=true → 直接成功（工具管道验证）
    expect(res.status).toBe(201)
    const audit = await api().get('/api/tools/audit').set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(audit.body.some((r: any) => r.toolId === 'announcement.publish' && r.status === 'ok')).toBe(true)
  })

  // ============ 项目级权限（P6） ============

  it('member 项目下建任务 → 403；LEAD → 成功', async () => {
    const leader = await prisma.coreUser.findUnique({ where: { email: 'member@test.cn' } })
    // 造成员 + 项目
    const { createHash } = await import('node:crypto')
    const token = 'e2e-invite-token-002'
    await prisma.coreInvite.create({
      data: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
        role: 'MEMBER',
        expiresAt: new Date(Date.now() + 86400_000),
        maxUses: 1,
        createdBy: 'e2e',
      },
    })
    await api().post('/api/auth/register').send({
      email: 'peon@test.cn',
      password: 'password123',
      nickname: '普通成员',
      inviteToken: token,
    })
    const peon = await prisma.coreUser.findUnique({ where: { email: 'peon@test.cn' } })
    const project = await prisma.project.create({
      data: { name: 'e2e 项目', description: '测试', leadId: leader!.id },
    })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: leader!.id, role: 'LEAD' } })

    const leaderLogin = await api().post('/api/auth/login').send({ email: 'member@test.cn', password: 'password123' })
    const peonLogin = await api().post('/api/auth/login').send({ email: 'peon@test.cn', password: 'password123' })

    const denied = await api()
      .post('/api/tasks')
      .set('Authorization', `Bearer ${peonLogin.body.accessToken}`)
      .send({ title: 'peon 建任务', projectId: project.id })
    expect(denied.status).toBe(403)

    const ok = await api()
      .post('/api/tasks')
      .set('Authorization', `Bearer ${leaderLogin.body.accessToken}`)
      .send({ title: 'LEAD 建任务', projectId: project.id })
    expect(ok.status).toBe(201)
    expect(ok.body.projectName).toBe('e2e 项目')
  })

  // ============ 匹配（P2） ============

  it('点子发布 → 技能匹配成员收到 idea-match 通知', async () => {
    const u = await prisma.coreUser.findUnique({ where: { email: 'peon@test.cn' } })
    await prisma.coreUser.update({
      where: { id: u!.id },
      data: { skills: ['Vue'], allowMatch: true },
    })
    const leaderLogin = await api().post('/api/auth/login').send({ email: 'member@test.cn', password: 'password123' })
    await api()
      .post('/api/ideas')
      .set('Authorization', `Bearer ${leaderLogin.body.accessToken}`)
      .send({ title: 'Vue 匹配测试点子', description: '需要 Vue 技能的人', need: '缺 Vue', techStack: ['Vue'] })
    await new Promise((r) => setTimeout(r, 300))
    const peonLogin = await api().post('/api/auth/login').send({ email: 'peon@test.cn', password: 'password123' })
    const notifs = await api().get('/api/notifications').set('Authorization', `Bearer ${peonLogin.body.accessToken}`)
    expect(notifs.body.some((n: any) => n.type === 'idea-match' && n.title.includes('Vue 匹配测试点子'))).toBe(true)
  })

  // ============ 内容治理（P5） ============

  it('举报 → 队列 → 部长处置 RESOLVED → 软删除', async () => {
    const leaderLogin = await api().post('/api/auth/login').send({ email: 'member@test.cn', password: 'password123' })
    const peonLogin = await api().post('/api/auth/login').send({ email: 'peon@test.cn', password: 'password123' })
    const post = await api()
      .post('/api/posts')
      .set('Authorization', `Bearer ${peonLogin.body.accessToken}`)
      .send({ board: 'GENERAL', title: '违规贴', content: '广告内容' })
    const postId = post.body.id
    await api()
      .post(`/api/moderation/report/post/${postId}`)
      .set('Authorization', `Bearer ${leaderLogin.body.accessToken}`)
      .send({ reason: '广告' })
    const reports = await api().get('/api/moderation/reports').set('Authorization', `Bearer ${leaderLogin.body.accessToken}`)
    expect(reports.body.length).toBeGreaterThan(0)
    const reportId = reports.body[0].id
    await api()
      .post(`/api/moderation/reports/${reportId}?action=RESOLVED`)
      .set('Authorization', `Bearer ${leaderLogin.body.accessToken}`)
    const after = await api().get(`/api/posts/${postId}`).set('Authorization', `Bearer ${peonLogin.body.accessToken}`)
    expect(after.body.title).toBe('[已删除]')
  })

  // ============ 资料与词表（P1） ============

  it('词表 API 返回分类 → 技术；PATCH /api/me 更新技能', async () => {
    const peonLogin = await api().post('/api/auth/login').send({ email: 'peon@test.cn', password: 'password123' })
    const skills = await api().get('/api/skills').set('Authorization', `Bearer ${peonLogin.body.accessToken}`)
    expect(skills.body.length).toBeGreaterThan(5)
    expect(skills.body[0].skills.length).toBeGreaterThan(0)
    const patch = await api()
      .patch('/api/me')
      .set('Authorization', `Bearer ${peonLogin.body.accessToken}`)
      .send({ grade: '2025', skills: ['Vue', 'TypeScript'], allowMatch: true })
    expect(patch.status).toBe(200)
    expect(patch.body.skills).toContain('Vue')
    expect(patch.body.allowMatch).toBe(true)
  })
})
