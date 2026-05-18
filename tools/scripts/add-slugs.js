#!/usr/bin/env node

/**
 * Misaka Network Blog - 批量为现有文章添加 slug
 * 为所有没有 slug 字段的文章生成并添加 8 字符 NanoID
 */

import {readdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {nanoid} from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BLOG_DIR = join(__dirname, '..', '..', 'src', 'content', 'blog');

/**
 * 递归扫描目录，获取所有博客文件
 */
function getAllBlogFiles(dir, files = []) {
  const entries = readdirSync(dir, {withFileTypes: true});

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      getAllBlogFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 解析 frontmatter
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return null;
  }

  const frontmatterStr = match[1];
  const bodyContent = match[2];
  const frontmatter = {};

  const lines = frontmatterStr.split('\n');
  let currentKey = null;
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey) {
      currentValue += '\n' + line;
    }
  }

  if (currentKey) {
    frontmatter[currentKey] = currentValue.trim();
  }

  return {frontmatter, bodyContent};
}

/**
 * 在 frontmatter 中添加 slug 字段
 */
function addSlugToFrontmatter(content, slug) {
  // 在 pubDate 之后添加 slug
  const lines = content.split('\n');
  const newLines = [];
  let slugAdded = false;

  for (const line of lines) {
    newLines.push(line);

    // 在 pubDate 行之后插入 slug
    if (!slugAdded && line.startsWith('pubDate:')) {
      newLines.push(`slug: '${slug}'`);
      slugAdded = true;
    }
  }

  return newLines.join('\n');
}

/**
 * 主函数
 */
function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🔗 批量为文章添加 Slug (NanoID)       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const blogFiles = getAllBlogFiles(BLOG_DIR);
  console.log(`📁 找到 ${blogFiles.length} 篇文章\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of blogFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter(content);

      if (!parsed) {
        console.log(`⚠️  跳过（无法解析 frontmatter）: ${filePath}`);
        errors++;
        continue;
      }

      // 检查是否已有 slug
      if (parsed.frontmatter.slug) {
        console.log(`✓  已有 slug: ${filePath.replace(BLOG_DIR, '')}`);
        skipped++;
        continue;
      }

      // 生成新的 slug
      const slug = nanoid(8);

      // 添加 slug 到 frontmatter
      const updatedContent = addSlugToFrontmatter(content, slug);

      // 写回文件
      writeFileSync(filePath, updatedContent, 'utf-8');

      console.log(`✨ 添加 slug '${slug}': ${filePath.replace(BLOG_DIR, '')}`);
      processed++;

    } catch (error) {
      console.error(`❌ 处理失败: ${filePath}`);
      console.error(`   错误: ${error.message}`);
      errors++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 完成！`);
  console.log(`   处理: ${processed} 篇`);
  console.log(`   跳过: ${skipped} 篇`);
  console.log(`   错误: ${errors} 篇`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
