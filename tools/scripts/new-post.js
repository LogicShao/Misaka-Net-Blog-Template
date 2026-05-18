#!/usr/bin/env node

/**
 * Misaka Network Blog - 新建博客文章脚本
 * 快速创建带有 frontmatter 的博客文章
 */

import {createInterface} from 'readline';
import {writeFileSync, existsSync, mkdirSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {nanoid} from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建 readline 接口
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// 封装 question 为 Promise
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 生成 slug（将标题转换为文件名友好的格式）
// 注意：当前版本使用 nanoid 生成短链接，此函数保留供未来使用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateSlug(title) {
  // 去除不能用于文件名的特殊字符，保留中文、英文、数字等
  const slug = title
    .trim()
    .replace(/[\/\\:*?"<>|]/g, '') // 移除 Windows/Unix 不支持的文件名字符
    .replace(/\s+/g, '-') // 将空格替换为连字符
    .replace(/\.+$/g, ''); // 移除末尾的点号（Windows 文件名规范）

  // 如果处理后为空或只有连字符，使用时间戳作为后备
  if (!slug || slug === '' || /^-+$/.test(slug)) {
    return `post-${Date.now()}`;
  }

  return slug;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 生成时间戳格式的文件名 YY-MM-DD-HH-MM-SS
function generateTimestampFilename() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); // 取年份后两位
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}-${minute}-${second}.md`;
}

// 解析标签输入
function parseTags(input) {
  if (!input || input.trim() === '') {
    return ['未分类'];
  }
  return input
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

// 生成文章模板
function generatePostTemplate(data) {
  const {title, description, pubDate, tags, draft, heroImage, slug} = data;

  const frontmatter = `---
title: '${title}'
description: '${description}'
pubDate: ${pubDate}${heroImage ? `\nheroImage: '${heroImage}'` : ''}
slug: '${slug}'
tags: [${tags.map(tag => `'${tag}'`).join(', ')}]
draft: ${draft}
---

# ${title}

${description}

## 正文内容

在此处开始编写你的文章内容...

### 小标题示例

你可以使用 Markdown 语法编写内容：

- 列表项 1
- 列表项 2
- 列表项 3

\`\`\`javascript
// 代码示例
console.log('Hello, Misaka Network!');
\`\`\`

> 引用文本示例

**加粗文本** 和 *斜体文本*

---

## 总结

在此处添加文章总结...
`;

  return frontmatter;
}

// 主函数
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🌟 Misaka Network - 新建博客文章      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  try {
    // 收集文章信息
    const title = await question('📝 文章标题 (必填): ');
    if (!title || title.trim() === '') {
      console.error('❌ 错误：文章标题不能为空！');
      rl.close();
      process.exit(1);
    }

    const description = await question(`📄 文章描述 (默认: "${title} - 一篇关于技术的文章"): `)
      || `${title} - 一篇关于技术的文章`;

    const tagsInput = await question('🏷️  标签 (逗号分隔，默认: "未分类"): ');
    const tags = parseTags(tagsInput);

    const draftInput = await question('📋 是否为草稿? (y/N): ');
    const draft = draftInput.toLowerCase() === 'y' || draftInput.toLowerCase() === 'yes';

    const heroImageInput = await question('🖼️  封面图片路径 (可选，留空则不使用): ');
    const heroImage = heroImageInput.trim() || null;

    const dateInput = await question('📅 发布日期 (YYYY-MM-DD，留空使用今天): ');
    const pubDate = dateInput.trim() || formatDate(new Date());

    // 生成短链接 ID (8字符 NanoID)
    const slug = nanoid(8);

    // 生成文件名（使用时间戳格式 YY-MM-DD-HH-MM.md）
    const filename = generateTimestampFilename();

    // 确认信息
    console.log('\n📊 文章信息预览：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`标题:     ${title}`);
    console.log(`描述:     ${description}`);
    console.log(`日期:     ${pubDate}`);
    console.log(`短链接:   /blog/${slug}`);
    console.log(`标签:     ${tags.join(', ')}`);
    console.log(`草稿:     ${draft ? '是' : '否'}`);
    console.log(`封面图:   ${heroImage || '无'}`);
    console.log(`文件名:   ${filename}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const confirm = await question('✅ 确认创建? (Y/n): ');
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      console.log('❌ 已取消创建。');
      rl.close();
      process.exit(0);
    }

    // 生成文章内容
    const postContent = generatePostTemplate({
      title,
      description,
      pubDate,
      tags,
      draft,
      heroImage,
      slug
    });

    // 确定输出路径（按年月分类：src/content/blog/年/月/文件名.md）
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const outputDir = join(__dirname, '..', '..', 'src', 'content', 'blog', year, month);
    const outputPath = join(outputDir, filename);

    // 检查文件是否已存在
    if (existsSync(outputPath)) {
      const overwrite = await question('⚠️  文件已存在！是否覆盖? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ 已取消创建。');
        rl.close();
        process.exit(0);
      }
    }

    // 确保目录存在
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, {recursive: true});
    }

    // 写入文件
    writeFileSync(outputPath, postContent, 'utf8');

    console.log('\n✨ 成功！文章已创建：');
    console.log(`📁 ${outputPath}`);
    console.log('\n💡 提示：');
    console.log('   - 使用你喜欢的编辑器打开文件开始写作');
    console.log('   - 运行 npm run dev 启动开发服务器预览');
    console.log('   - draft: true 的文章不会在生产环境显示\n');

  } catch (error) {
    console.error('❌ 创建文章时出错：', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 运行主函数
main();
