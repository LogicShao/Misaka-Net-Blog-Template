// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

// 手动加载 .env 文件
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    // 移除 \r 以处理 CRLF 换行符
    const cleanLine = line.replace(/\r/g, '');
    const match = cleanLine.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// 读取环境变量
const DEV_PORT = process.env.DEV_PORT ? parseInt(process.env.DEV_PORT) : 3000;

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.misaka-net.top', // 替换为你的 Cloudflare Pages URL 或自定义域名
  // 静态生成模式（默认）- 适合博客
  // Cloudflare Pages 会自动检测并部署静态文件

  // Astro 开发服务器配置
  server: {
    port: DEV_PORT,
    host: '127.0.0.1',  // 强制使用 IPv4，避免 IPv6 权限问题
  },

  integrations: [
    mdx(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [
        rehypeKatex,
        {
          strict: (/** @type {string} */ code) => (code === 'unicodeTextInMathMode' ? 'ignore' : 'warn'),
        },
      ],
    ],
    shikiConfig: {
      theme: 'dracula',
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/model/**', '**/venv/**'],
      },
    },
  },
});
