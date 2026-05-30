<div align="center">

# Misaka Network Blog

<img src="public/favicon/favicon.svg" alt="Misaka Network Logo" width="96" align="right" />

御坂网络 - 科学实验日志与技术观测站  
*A Certain Scientific Blog Theme*

[![Astro](https://img.shields.io/badge/Astro-6.x-ff5d01?style=for-the-badge&logo=astro)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

[在线演示](https://blog.misaka-net.top) | [快速开始](#快速开始) | [内容写作](#内容写作) | [管理端](#管理端)

</div>

---

## 特性
- Astro 6 + Tailwind 4 + TypeScript
- Markdown/MDX 内容体系 + Shiki 代码高亮
- KaTeX 数学公式、RSS、Sitemap、SEO
- 搜索索引（Fuse.js）
- 友链/标签/草稿支持
- Blog Galaxy 可视化（ECharts 聚类星系图）
- 深色/浅色主题切换
- 本地管理端（Web）
- 静态 HTML 输出（可部署到任意 Web 服务器）

## 快速开始
**前置要求**：Node.js 22+

```bash
npm install
cp .env.example .env  # 复制环境变量配置文件
npm run dev
```
访问 `http://localhost:3000`（默认端口，可在 `.env` 中配置）

## 环境变量配置

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
# 开发服务器端口（默认：3000）
DEV_PORT=3000

# Admin 管理后台端口（默认：3201）
ADMIN_PORT=3201
```

## 常用命令
| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式 |
| `npm run build` | 构建生产版（输出到 `dist/`） |
| `npm run build:full` | 更新聚类数据并构建 |
| `npm run preview` | 本地预览构建结果 |
| `npm run new` | 新建文章脚本 |
| `npm run friends` | 友链管理脚本 |
| `npm run admin` | 启动本地 Web 管理端 |

## 内容写作
在 `src/content/blog/` 新建 `.md`/`.mdx`，或使用脚本：

```bash
npm run new
```

最小 Frontmatter 示例：

```yaml
---
title: '文章标题'
description: '文章摘要'
pubDate: 2024-01-15
tags: ['标签1', '标签2']
draft: false
---
```

## 管理端
- **Web 管理端**：`npm run admin`，默认地址 `http://localhost:3201`
- **端口配置**：在 `.env` 中设置 `ADMIN_PORT`（示例见 `.env.example`）

## 项目结构（摘要）
```text
src/                  源代码
  pages/              路由页面
  components/         UI 组件
  content/            内容
    blog/             博客文章 (Markdown/MDX)
  styles/             样式
  utils/              工具函数
tools/                开发工具
  admin/              Web 管理后台
  scripts/            CLI 脚本
  blog-clustering/    聚类可视化
public/               静态资源
docs/                 项目文档
deploy/               部署配置
```

## 部署

构建命令 `npm run build`，输出目录 `dist/`。产物为纯静态文件，可部署到任意 Web 服务器或静态托管平台（Vercel、Netlify、Cloudflare Pages、Nginx 等）。

本站演示使用 GitHub Actions 自动部署到自托管服务器（1Panel + OpenResty），部署流程：push main → CI 构建 → rsync 到服务器 → reload。

## 开源模板

本项目已提取主题框架为独立模板仓库：[Misaka-Net-Blog-Template](https://github.com/LogicShao/Misaka-Net-Blog-Template)

模板包含完整主题、组件、布局和开发工具，不含个人内容，可直接克隆作为新博客起点。

## 许可
MIT License
