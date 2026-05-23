# 项目任务清单

> ⚠️ Internal — 个人任务追踪与实现规划，非项目公开文档
>
> 日期: 2026-05-16 | 状态: 已完成 Phase 1
>
> 本文档记录开发过程中的规划、任务分解和内部工具（Hermes）配置。
> 对外部贡献者无参考价值，仅供 AI 助手了解项目历史决策。

---

## 已知问题 (Bug Triage)

- [ ] 浅色模式下部分元素对比度较低（行内代码、PrevNextNav 卡片）
- [ ] Blog Galaxy 页面缩放范围改善后需验证全屏模式下的操作流畅度
- [ ] 导航栏高亮逻辑需验证所有页面路由的匹配准确性
- [ ] sync-template GitHub Action 需在添加新目录时同步更新 mkdir 列表
- [ ] 聚类脚本 UMAP 参数在文章量小于特定阈值时（约 <20 篇）可能出现 n_components 异常

---

## 规划一: Astro 前端框架

### 现状分析

```
Misaka-Net-Blog (Astro 6.x, TypeScript, Tailwind, Cloudflare Pages)
├── src/content.config.ts     ← 现有只有 blog collection
├── src/content/blog/         ← 现有博客文章 (*.md)
├── src/pages/blog/[...slug].astro   ← 博客详情页
├── src/pages/blog/[...page].astro   ← 博客列表页
└── src/layouts/              ← 现有布局组件
```

### 需要新增的文件

```
src/
├── content.config.ts         ← [修改] 新增 daily collection 定义
├── content/
│   └── daily/                ← [新建] 日报 markdown 目录
│       └── .gitkeep
├── pages/
│   └── daily/
│       ├── index.astro       ← [新建] 日报首页 (按日期倒序列表)
│       └── [...slug].astro   ← [新建] 单日日报详情页
└── layouts/
    └── (复用 BaseLayout)     ← 不需要改
```

### 详细规划

#### 1.1 content.config.ts 修改

- 新增 `daily` collection
- Schema: `date` (日期), `summary` (摘要, 可选), `tags` (标签数组)
- Loader: `glob({ base: './src/content/daily', pattern: '**/*.md' })`
- 不需要 heroImage / draft, 日报默认全部发布

#### 1.2 日报 Markdown 格式规范

Hermes 生成的 `.md` 文件需遵循此格式:

```markdown
---
date: 2026-05-16
summary: "DeepSeek V4 Pro 论文、Exa AI 搜索 API、priority_queue 技巧"
tags: [AI, C++, web]
---

# 日报 2026-05-16

1. DeepSeek V4 Pro 论文总结
   https://example.com/deepseek-v4
   2-3句中文摘要...

2. Exa AI 搜索 API
   https://exa.ai
   面向 AI Agent 的搜索引擎...

3. std::priority_queue 没有 reserve 接口
   C++ 小技巧: 继承访问 protected 成员 c...
```

**frontmatter 字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | Date | ✅ | 日报日期, Hermes 自动填入当天 |
| `summary` | string | ✅ | 一句话概括今日内容, 用于列表页卡片 |
| `tags` | string[] | ✅ | 标签, 用于筛选和关联 |

#### 1.3 路由设计

| 路由 | 页面 | 功能 |
|------|------|------|
| `/daily/` | `index.astro` | 全部日报列表, 按日期倒序, 分页 |
| `/daily/2026-05-16` | `[...slug].astro` | 单日日报详情, 渲染 Markdown 正文 |

#### 1.4 列表页设计要点

- 复用博客的卡片布局组件
- 每条显示: 日期、标题(链接到详情)、summary、tags
- 按 `date` 倒序排列
- 分页: 每页 30 条 (一个月)
- RSS 自动包含 (复用 `@astrojs/rss`)

#### 1.5 可选的增强 (Phase 2)

- 导航栏加 "日报" 入口
- `/daily/tags/[tag]` 标签筛选页
- 首页 "最近日报" 小部件
- 统计: 连续更新天数、总篇数

#### 1.6 不需要改的东西

- 主题/Tailwind 配置 — 复用
- BaseLayout — 复用
- 搜索 (Fuse.js) — 日报自动纳入搜索索引
- Cloudflare Pages 部署 — 管线不变

---

## 规划二: Hermes 自动化配置

### 架构

```
WSL (Hermes cron, 每日 22:00)
    │
    ├─ 触发: 定时 / 手动
    │
    ├─ 1. 搜索信息源
    │     ├─ arXiv API (cs.AI / cs.CL / cs.CV, 过去 24h)
    │     ├─ GitHub Trending (可选)
    │     └─ Hacker News API (可选)
    │
    ├─ 2. LLM 筛选 + 撰写
    │     选 3-5 条最有价值的
    │     每条约 70 字中文摘要
    │
    ├─ 3. 生成 Markdown
    │     写入 /mnt/d/proj/blog/Misaka-Net-Blog/src/content/daily/2026-05-16.md
    │     严格遵循 frontmatter 格式
    │
    ├─ 4. Git 提交
    │     git add → git commit → git push
    │
    └─ 5. 通知 (可选)
          推送 Telegram/Discord 告知日报已生成
```

### 2.1 Hermes Cron Job 设计

| 参数 | 值 |
|------|-----|
| 名称 | `daily-news` |
| 调度 | `0 22 * * *` (每天 22:00) |
| 工作目录 | `/home/acs/project/daily-news` (WSL 侧) |
| 输出目录 | `/mnt/d/proj/blog/Misaka-Net-Blog/src/content/daily/` (Windows 挂载) |
| 模型 | 当前模型 (DeepSeek V4 Pro) |
| 超时 | 600s |

### 2.2 Cron Job Prompt 设计 (核心)

prompt 需要精确、可验证、容错。包含:

1. **信息收集** — 搜索 arXiv 最新论文、GitHub Trending、HN 热点
2. **筛选规则** — 技术相关性优先, 次选通用有趣内容, 确保 3 条以上
3. **格式约束** — 严格的 frontmatter 格式, 日期 `$(date +%Y-%m-%d)`
4. **输出验证** — 确认文件生成成功后, 才执行 git push
5. **失败处理** — 如果信息源不可用, 降级为 1-2 条 + 说明

### 2.3 信息源优先级

| 优先级 | 来源 | 获取方式 | 备用方案 |
|--------|------|----------|----------|
| 1 | arXiv 新论文 | `curl` + arXiv API | 跳过, 不影响日报生成 |
| 2 | GitHub Trending | `curl` scraping | 用 HN 替代 |
| 3 | Hacker News | HN API (免费, 无需 key) | 跳过 |
| 4 | 自定义 RSS | `curl` | 跳过 |

容错策略: 至少 1 个信息源成功即可生成日报。

### 2.4 测试方案

```bash
# 第一次: 手动触发, 验证全流程
hermes cron run daily-news

# 检查点:
# 1. /mnt/d/proj/blog/Misaka-Net-Blog/src/content/daily/ 下有今天的 .md
# 2. frontmatter 格式正确 (date, summary, tags)
# 3. git log 有新的 commit
# 4. 服务器 10 分钟内自动构建 → 网址可访问

# 第二次: 等 cron 自动触发
# 第二天 22:00 自然执行, 次日早上应为已上线状态
```

### 2.5 需要确认的前置条件

- [ ] Hermes cron 服务已启用 (`hermes cron status`)
- [ ] WSL 可以访问外网 (arXiv API)
- [ ] `/mnt/d/` 挂载正常 (WSL 能读写 Windows 文件)
- [ ] Git 在 WSL 下已配置 (user.name, user.email, SSH key)
- [ ] 服务器端 `build-daily.sh` 已配置并正在运行

### 2.6 扩展方向

- **自定义信息源**: 加入关注的中文技术博客 RSS
- **主题定制**: 某几天只关注 CV 论文, 某几天只关注 Agent
- **人工审核闸**: 生成后推送到 Telegram, 确认后再 push
- **统计面板**: 生成周报/月报 (本月最热论文、累计 N 期等)

---

## 实施顺序

```
Phase 1 — 前端 (先做, 约 30 分钟)
  1. 修改 content.config.ts — 加 daily collection
  2. 创建 src/content/daily/.gitkeep
  3. 创建 src/pages/daily/index.astro — 列表页
  4. 创建 src/pages/daily/[...slug].astro — 详情页
  5. 手动创建一期测试日报 (2026-05-16.md)
  6. npm run dev → 访问 /daily/ 验证

Phase 2 — Hermes (后做, 约 20 分钟)
  1. 创建 hermes cron job
  2. 手动触发一次 → 验证自动生成 + git push
  3. 确认服务器自动构建成功
  4. 等第二天 cron 自动执行 → 验收
```
