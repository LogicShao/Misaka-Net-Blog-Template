# 项目任务清单

> ⚠️ Internal - 个人任务追踪，非项目公开文档
>
> 最后更新: 2026-05-30

---

## 代码质量改进 (Code Review 2026-05-29)

### 高优先级（立即修复）

- [x] **修复 TypeScript 警告**：`src/content.config.ts` 中 12 个 `z is deprecated` 警告
  - 原因：Astro 6.x 中 `z` 对象已废弃
  - 修复：改用 `import {z} from 'astro/zod'`
  - ✅ 已完成 (2026-05-29)

- [x] **添加 Admin 认证**：`tools/admin/server.js` 无身份验证
  - 风险：任何人访问 `localhost:3201` 可修改内容
  - 修复：添加基础认证或 JWT token
  - ✅ 已完成 (2026-05-29) - 使用 Bearer token 认证，通过 `ADMIN_TOKEN` 环境变量配置

### 中优先级（1-2 周内）

- [ ] **添加单元测试**：关键工具函数缺少测试覆盖
  - 目标文件：`src/utils/sortPosts.ts`、`getTimestampFromFilename`
  - 工具：Vitest + @vitest/ui

- [ ] **固定依赖版本**：`package.json` 使用 `^` 范围版本
  - 风险：未来 `npm install` 可能引入破坏性变更
  - 修复：关键依赖（astro、tailwindcss、echarts）使用精确版本

- [ ] **修复路径遍历风险**：Admin API 未验证文件路径
  - 位置：`admin-server.js` DELETE `/api/posts/:id`
  - 修复：验证路径规范化后仍在 `BLOG_DIR` 内

### 低优先级（有空时优化）

- [ ] **统一缩进规范**：`.editorconfig` 声明 2 空格，`AGENTS.md` 提到 Tab
  - 修复：统一为 2 空格，更新 `AGENTS.md` 文档

- [ ] **修复 CSS 注释乱码**：`src/styles/global.css` 中文注释显示为乱码
  - 原因：文件编码问题
  - 修复：重新保存为 UTF-8 无 BOM

- [ ] **使用 dotenv 包**：`astro.config.mjs` 和 `admin-server.js` 手动解析 `.env`
  - 修复：安装 `dotenv` 包统一管理

### 性能监控（待添加）

- [ ] **添加构建性能基准测试**：`time npm run build` + 产物大小监控
- [ ] **添加 Lighthouse CI**：自动化性能评分测试

---

## 已知问题 (Bug Triage)

- [ ] 浅色模式下部分元素对比度较低（行内代码、PrevNextNav 卡片）

---

## 迁移记录

### 日报功能迁移（2026-05-30）

- [x] 历史日报 Markdown 迁移到 `/home/acs/project/m-daily-news/src/content/daily/`
- [x] 移除博客仓库内的 `daily` collection
- [x] 移除 `/daily` 路由页面
- [x] 移除导航栏日报入口
- [x] 移除博客仓库内的历史日报文件

后续日报开发在 `/home/acs/project/m-daily-news` 独立进行。

---

## 已完成

### Bug 修复

- [x] Blog Galaxy 页面缩放范围 — ECharts dataZoom 配置完善，全屏高度计算正常
- [x] 导航栏高亮逻辑 — 已验证所有页面路由匹配正确（含 Blog Galaxy 排除逻辑）
- [x] UMAP n_components 参数 — 已添加小数据集防御性处理（<2 篇时跳过聚类）

