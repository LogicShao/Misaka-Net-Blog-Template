# 日报迁移交接说明

> ⚠️ Internal - 供下一个 session / 新开发仓库使用

## 迁移结果

日报功能已从本博客仓库拆除，后续在独立仓库开发：

```text
/home/acs/project/m-daily-news
```

历史日报已迁移到：

```text
/home/acs/project/m-daily-news/src/content/daily/
```

迁移文件：

- `2026-05-16.md`
- `2026-05-27.md`
- `2026-05-28.md`
- `2026-05-30.md`

## 博客仓库已移除内容

- `src/content/daily/*.md`
- `src/pages/daily/[...page].astro`
- `src/pages/daily/[...slug].astro`
- `src/utils/daily.ts`
- `content.config.ts` 中的 `daily` collection
- 导航栏中的 `/daily` 入口

## 新仓库职责

新仓库负责：

- 信息源采集与搜索
- LLM 筛选与文案生成
- Markdown 输出
- 格式校验
- 任务调度与运行状态记录
- 后续 MVP 页面或容器部署

## 明确约束

- 不把日报生成逻辑重新耦合回博客项目。
- 不再向本博客仓库写入 `src/content/daily/`。
- 后续日报开发只在 `/home/acs/project/m-daily-news` 继续。

