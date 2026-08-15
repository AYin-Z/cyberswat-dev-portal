import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../core/db/prisma.service'

/**
 * 技能词表 — 两级（分类→技术），P1。
 * 匹配规则：点子的 techStack ∩ 成员 skills（技术级名称交集）。
 * 自定义标签不进词表，但仍可匹配（同名即匹配）。
 */
@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** 启动时播种默认词表（幂等） */
  async onModuleInit() {
    const count = await this.prisma.coreSkill.count()
    if (count > 0) return
    const categories: [string, string[]][] = [
      ['Web前端', ['Vue', 'React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Tailwind', 'Vite', 'Nuxt']],
      ['后端', ['Node.js', 'NestJS', 'Express', 'Go', 'Python', 'Java', 'Spring', 'FastAPI', 'GraphQL']],
      ['数据库', ['PostgreSQL', 'MySQL', 'Redis', 'MongoDB', 'SQLite', 'Prisma', 'TypeORM']],
      ['安全', ['Web安全', '二进制安全', '逆向工程', '密码学', '渗透测试', 'CTF']],
      ['算法', ['数据结构', '竞赛算法', '机器学习', '深度学习', '数学建模']],
      ['AI', ['LLM', 'Prompt工程', 'RAG', 'Agent开发', 'AI绘画', '语音识别']],
      ['运维', ['Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Nginx', 'Cloudflare', '监控']],
      ['测试', ['单元测试', 'e2e测试', '自动化测试']],
      ['产品', ['产品设计', '需求分析', '项目管理']],
      ['设计', ['UI设计', 'UX设计', 'Figma']],
      ['其他', ['Git', 'C语言', 'C++', 'Rust', 'PHP', 'Unity']],
    ]
    for (const [catName, skills] of categories) {
      const cat = await this.prisma.coreSkillCategory.create({ data: { name: catName } })
      await this.prisma.coreSkill.createMany({
        data: skills.map((name) => ({ name, categoryId: cat.id })),
      })
    }
    this.logger.log(`[skills] 词表播种完成: ${categories.length} 分类, ${categories.reduce((a, c) => a + c[1].length, 0)} 技能`)
  }

  /** 词表（分类→技能） */
  async list() {
    const cats = await this.prisma.coreSkillCategory.findMany({
      include: { skills: { select: { name: true }, orderBy: { name: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })
    return cats.map((c) => ({ name: c.name, skills: c.skills.map((s) => s.name) }))
  }

  /** 按名称查技能（用于校验/规范化） */
  async resolve(names: string[]): Promise<Set<string>> {
    if (!names.length) return new Set()
    const rows = await this.prisma.coreSkill.findMany({
      where: { name: { in: names } },
      select: { name: true },
    })
    return new Set(rows.map((r) => r.name))
  }
}
