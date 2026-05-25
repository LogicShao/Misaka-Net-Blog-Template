# 项目任务清单

> ⚠️ Internal — 个人任务追踪，非项目公开文档
>
> 最后更新: 2026-05-23

---

## 已知问题 (Bug Triage)

- [ ] 浅色模式下部分元素对比度较低（行内代码、PrevNextNav 卡片）

---

## 待实现

### 日报 RSS Feed

日报系统前端已完成（content collection / 路由 / 导航），但缺少独立的 RSS 端点。
当前 `src/pages/rss.xml.js` 仅包含博客文章。

### 日报 Phase 2 可选增强

以下为原规划中标记为 Phase 2/可选的功能，尚未实施：

- [ ] `/daily/tags/[tag]` 标签筛选页
- [ ] 首页 "最近日报" 小部件
- [ ] 统计信息：连续更新天数、总篇数
- [ ] 日报 RSS 独立端点

### Hermes 自动化日报生成

> 详见下方"已完成 → 规划参考"中的原始设计方案。

**当前状态**：前端已就绪，Hermes cron job 待配置/启用。

**前置条件待确认：**

- [ ] Hermes cron 服务已启用
- [ ] WSL 可访问外网（arXiv API 等）
- [ ] `/mnt/d/` 挂载正常（WSL 读写 Windows 文件）
- [ ] Git 在 WSL 下已配置（user.name, user.email, SSH key）
- [ ] 服务端自动构建已配置

---

## 已完成

### Phase 1 — 日报前端系统（2026-05-16 完成）

- [x] `src/content.config.ts` — 新增 `daily` collection（Glob loader + Zod schema）
- [x] `src/content/daily/` — 创建日报内容目录
- [x] `src/pages/daily/[...page].astro` — 日报列表页（分页）
- [x] `src/pages/daily/[...slug].astro` — 单日日报详情页
- [x] `src/components/Header.astro` — 导航栏新增"日报"入口
- [x] `src/components/HeaderLink.astro` — 日报路由高亮逻辑

### Bug 修复

- [x] Blog Galaxy 页面缩放范围 — ECharts dataZoom 配置完善，全屏高度计算正常
- [x] 导航栏高亮逻辑 — 已验证所有页面路由匹配正确（含 Blog Galaxy 排除逻辑）
- [x] sync-template GitHub Action — mkdir 列表已包含 `src/content/daily` 目录
- [x] UMAP n_components 参数 — 已添加小数据集防御性处理（<2 篇时跳过聚类）

### 规划参考（历史）

<details>
<summary>📋 日报 Markdown 格式规范（已实施）</summary>

```markdown
---
date: 2026-05-16
summary: "一句话概括"
tags: [AI, C++, web]
---

1. 条目一
   https://example.com
   2-3句中文摘要...

2. 条目二
   ...
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | Date | ✅ | 日报日期 |
| `summary` | string | ✅ | 列表页卡片摘要 |
| `tags` | string[] | ✅ | 标签，用于筛选和关联 |

</details>

<details>
<summary>📋 Hermes 自动化日报生成方案（待实施）</summary>

```
WSL (Hermes cron, 每日 22:00)
    ├─ 1. 搜索信息源
    │     ├─ arXiv API (cs.AI / cs.CL / cs.CV, 过去 24h)
    │     ├─ GitHub Trending (可选)
    │     └─ Hacker News API (可选)
    ├─ 2. LLM 筛选 + 撰写（3-5 条，各约 70 字中文摘要）
    ├─ 3. 生成 Markdown → src/content/daily/
    ├─ 4. Git 提交（add → commit → push）
    └─ 5. 通知（可选）
```

| 参数 | 值 |
|------|-----|
| Cron 名称 | `daily-news` |
| 调度 | `0 22 * * *` (每天 22:00) |
| 工作目录 | `/home/acs/project/daily-news` (WSL) |
| 输出目录 | `/mnt/d/proj/blog/Misaka-Net-Blog/src/content/daily/` |
| 超时 | 600s |

信息源优先级：
| 优先级 | 来源 | 获取方式 | 备用方案 |
|--------|------|----------|----------|
| 1 | arXiv 新论文 | `curl` + arXiv API | 跳过 |
| 2 | GitHub Trending | `curl` scraping | 用 HN 替代 |
| 3 | Hacker News | HN API (免费) | 跳过 |
| 4 | 自定义 RSS | `curl` | 跳过 |

容错策略：至少 1 个信息源成功即可生成日报。

</details>
