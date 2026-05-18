#!/usr/bin/env node

/**
 * 博客文章目录重组脚本
 * 将所有文章从平铺结构迁移到 年/月/ 的层级结构
 *
 * 使用方法：node tools/scripts/migrate-blog-structure.js
 */

import {readdirSync, mkdirSync, renameSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 博客目录路径
const BLOG_DIR = join(__dirname, '..', '..', 'src', 'content', 'blog');

/**
 * 从文件名提取年月信息
 * @param {string} filename 文件名（如 26-01-07-10-37.md）
 * @returns {{year: string, month: string} | null}
 */
function extractYearMonth(filename) {
  // 匹配格式：YY-MM-DD-HH-MM.md
  const match = filename.match(/^(\d{2})-(\d{2})-\d{2}-\d{2}-\d{2}\.(md|mdx)$/);

  if (!match) {
    return null;
  }

  const [, yy, mm] = match;
  const year = `20${yy}`; // 假设都是 21 世纪
  const month = mm;

  return {year, month};
}

/**
 * 迁移单个文件
 * @param {string} filename 文件名
 * @returns {boolean} 是否成功迁移
 */
function migrateFile(filename) {
  const yearMonth = extractYearMonth(filename);

  if (!yearMonth) {
    console.log(`⏭️  跳过：${filename}（不符合命名规范）`);
    return false;
  }

  const {year, month} = yearMonth;
  const oldPath = join(BLOG_DIR, filename);
  const newDir = join(BLOG_DIR, year, month);
  const newPath = join(newDir, filename);

  // 检查文件是否已经在正确位置
  if (!existsSync(oldPath)) {
    console.log(`⏭️  跳过：${filename}（文件不存在或已迁移）`);
    return false;
  }

  // 创建目标目录
  if (!existsSync(newDir)) {
    mkdirSync(newDir, {recursive: true});
    console.log(`📁 创建目录：${year}/${month}/`);
  }

  // 移动文件
  try {
    renameSync(oldPath, newPath);
    console.log(`✅ 迁移：${filename} → ${year}/${month}/${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ 错误：无法迁移 ${filename}`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  📦 博客目录结构迁移工具              ║');
  console.log('║  迁移到 年/月/ 层级结构               ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 检查博客目录是否存在
  if (!existsSync(BLOG_DIR)) {
    console.error(`❌ 错误：博客目录不存在 ${BLOG_DIR}`);
    process.exit(1);
  }

  // 读取所有文件
  let files;
  try {
    files = readdirSync(BLOG_DIR, {withFileTypes: true})
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
  } catch (error) {
    console.error('❌ 错误：无法读取博客目录', error.message);
    process.exit(1);
  }

  console.log(`📊 发现 ${files.length} 个文件\n`);

  // 迁移所有文件
  let successCount = 0;
  let skipCount = 0;

  for (const filename of files) {
    const result = migrateFile(filename);
    if (result) {
      successCount++;
    } else {
      skipCount++;
    }
  }

  // 输出统计信息
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 成功迁移：${successCount} 个文件`);
  console.log(`⏭️  跳过：${skipCount} 个文件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎉 迁移完成！');
  console.log('💡 提示：运行 npm run build 验证迁移是否成功\n');
}

// 运行主函数
main();
