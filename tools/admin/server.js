import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {exec} from 'child_process';
import {promisify} from 'util';
import {fixChineseBold} from '../scripts/markdown-bold-fix.js';
import {nanoid} from 'nanoid';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(PROJECT_ROOT, '.env'));

// ==================== 日志工具 ====================
const LOG_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(level, category, message, data = null) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const colors = {
    INFO: LOG_COLORS.cyan,
    SUCCESS: LOG_COLORS.green,
    WARN: LOG_COLORS.yellow,
    ERROR: LOG_COLORS.red,
    DEBUG: LOG_COLORS.magenta,
  };

  const color = colors[level] || LOG_COLORS.reset;
  const levelStr = `[${level}]`.padEnd(9);
  const categoryStr = `[${category}]`.padEnd(12);

  const logMessage = `${LOG_COLORS.dim}${timestamp}${LOG_COLORS.reset} ${color}${levelStr}${LOG_COLORS.reset} ${LOG_COLORS.blue}${categoryStr}${LOG_COLORS.reset} ${message}`;

  if (data) {
    console.log(logMessage);
    console.log(`${LOG_COLORS.dim}${JSON.stringify(data, null, 2)}${LOG_COLORS.reset}`);
  } else {
    console.log(logMessage);
  }
}

const logger = {
  info: (category, message, data) => log('INFO', category, message, data),
  success: (category, message, data) => log('SUCCESS', category, message, data),
  warn: (category, message, data) => log('WARN', category, message, data),
  error: (category, message, data) => log('ERROR', category, message, data),
  debug: (category, message, data) => log('DEBUG', category, message, data),
};

// ==================== Express 设置 ====================
const app = express();
const HOST = '127.0.0.1';
const portEnv = process.env.ADMIN_PORT;
const PORT = portEnv && !Number.isNaN(Number(portEnv)) ? Number(portEnv) : 3201;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? LOG_COLORS.red : LOG_COLORS.green;
    logger.info('HTTP', `${req.method} ${req.path} ${statusColor}${res.statusCode}${LOG_COLORS.reset} ${duration}ms`);
    return originalSend.call(this, data);
  };

  next();
});

const BLOG_DIR = path.join(PROJECT_ROOT, 'src', 'content', 'blog');
const CONSTS_FILE = path.join(PROJECT_ROOT, 'src', 'consts.ts');

/**
 * 递归扫描目录，获取所有博客文件
 * @param {string} dir - 要扫描的目录路径
 * @param {string} baseDir - 基础目录（用于计算相对路径）
 * @returns {Array<{relativePath: string, fullPath: string}>} 文件信息数组
 */
function getAllBlogFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 递归扫描子目录
      results.push(...getAllBlogFiles(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      // 计算相对路径（如 "2026/01/26-01-07-10-37.md"）
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ relativePath, fullPath });
    }
  }

  return results;
}

app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      blogRoot: PROJECT_ROOT,
      blogDir: BLOG_DIR,
    },
  });
});

// 解析 Markdown frontmatter
function parseFrontmatter(content) {
  // 兼容 Windows (\r\n) 和 Unix (\n) 换行符
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {frontmatter: {}, content: content};
  }

  const frontmatterStr = match[1];
  const bodyContent = match[2];
  const frontmatter = {};

  // 解析 frontmatter 字段
  const lines = frontmatterStr.split('\n');
  let currentKey = null;
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        frontmatter[currentKey] = parseValue(currentValue.trim());
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey) {
      currentValue += '\n' + line;
    }
  }

  if (currentKey) {
    frontmatter[currentKey] = parseValue(currentValue.trim());
  }

  return {frontmatter, content: bodyContent};
}

// 解析值（处理字符串、数组、布尔值等）
function parseValue(value) {
  value = value.trim();

  // 解析布尔值
  if (value === 'true') return true;
  if (value === 'false') return false;

  // 去除引号
  if ((value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }

  // 解析数组
  if (value.startsWith('[') && value.endsWith(']')) {
    const arrayContent = value.slice(1, -1);
    return arrayContent.split(',').map(item => {
      item = item.trim();
      if ((item.startsWith("'") && item.endsWith("'")) ||
        (item.startsWith('"') && item.endsWith('"'))) {
        return item.slice(1, -1);
      }
      return item;
    }).filter(item => item);
  }

  return value;
}

// 构建 frontmatter 字符串
function buildFrontmatter(frontmatter) {
  let result = '---\n';

  for (const [key, value] of Object.entries(frontmatter)) {
    // 跳过空字符串的 updatedDate（表示未修改）
    if (key === 'updatedDate' && (!value || value.trim() === '')) {
      continue;
    }

    if (Array.isArray(value)) {
      result += `${key}: [${value.map(v => `'${v}'`).join(', ')}]\n`;
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      // 布尔值和数字不加引号
      result += `${key}: ${value}\n`;
    } else {
      result += `${key}: '${value}'\n`;
    }
  }

  result += '---\n';
  return result;
}

// ==================== 友链管理函数 ====================

/**
 * 读取并解析 consts.ts 文件中的友链数据
 */
function readFriendLinks() {
  try {
    const content = fs.readFileSync(CONSTS_FILE, 'utf8');

    // 提取 FRIEND_LINKS 数组
    const match = content.match(/export const FRIEND_LINKS: FriendLink\[\] = \[([\s\S]*?)\];/);

    if (!match) {
      throw new Error('无法找到 FRIEND_LINKS 数组');
    }

    // 解析友链对象（支持可选的 note 字段）
    const arrayContent = match[1];
    const objectRegex = /\{[\s\S]*?name:\s*'([^']+)'[\s\S]*?url:\s*'([^']+)'[\s\S]*?avatar:\s*'([^']+)'[\s\S]*?description:\s*'([^']+)'(?:[\s\S]*?note:\s*'([^']*)')?[\s\S]*?\}/g;

    const friendLinks = [];
    let objectMatch;
    while ((objectMatch = objectRegex.exec(arrayContent)) !== null) {
      const friendLink = {
        name: objectMatch[1],
        url: objectMatch[2],
        avatar: objectMatch[3],
        description: objectMatch[4]
      };

      // 添加 note 如果存在
      if (objectMatch[5]) {
        friendLink.note = objectMatch[5];
      }

      friendLinks.push(friendLink);
    }

    return {content, friendLinks};
  } catch (error) {
    throw new Error(`读取友链数据失败: ${error.message}`);
  }
}

/**
 * 生成友链数组的 TypeScript 代码
 */
function generateFriendLinksCode(friendLinks) {
  const items = friendLinks.map(link => {
    let code = `\t{
        name: '${link.name}',
        url: '${link.url}',
        avatar: '${link.avatar}',
        description: '${link.description}'`;

    // 添加 note 如果存在
    if (link.note) {
      code += `,\n        note: '${link.note}'`;
    }

    code += '\n    }';
    return code;
  }).join(',\n');

  return `export const FRIEND_LINKS: FriendLink[] = [
${items}
];`;
}

/**
 * 写入更新后的友链数据到 consts.ts
 */
function writeFriendLinks(friendLinks) {
  try {
    const {content} = readFriendLinks();
    const newFriendLinksCode = generateFriendLinksCode(friendLinks);

    // 替换原有的 FRIEND_LINKS 数组
    const newContent = content.replace(
      /export const FRIEND_LINKS: FriendLink\[\] = \[[\s\S]*?\];/,
      newFriendLinksCode
    );

    fs.writeFileSync(CONSTS_FILE, newContent, 'utf8');
    return true;
  } catch (error) {
    throw new Error(`写入友链数据失败: ${error.message}`);
  }
}

// API: 获取所有文章列表
app.get('/api/posts', (req, res) => {
  try {
    logger.debug('API', 'Loading all posts from blog directory');
    // 使用递归扫描获取所有博客文件（包括子目录）
    const blogFiles = getAllBlogFiles(BLOG_DIR);
    logger.info('API', `Found ${blogFiles.length} blog files`);

    const posts = blogFiles.map(({relativePath, fullPath}) => {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const {frontmatter} = parseFrontmatter(content);
      const stats = fs.statSync(fullPath);

      // 从相对路径中提取文件名（如 "2026/01/26-01-07-10-37.md" → "26-01-07-10-37.md"）
      const filename = path.basename(relativePath);

      return {
        id: relativePath.replace(/\.(md|mdx)$/, ''), // 如 "2026/01/26-01-07-10-37"
        filename: filename, // 文件名（不含路径）
        relativePath: relativePath, // 完整相对路径（含扩展名）
        title: frontmatter.title || '无标题',
        description: frontmatter.description || '',
        pubDate: frontmatter.pubDate || '',
        tags: frontmatter.tags || [],
        draft: frontmatter.draft || false,
        updatedAt: stats.mtime,
      };
    });

    // 按文件名中的时间降序排序（新文章在前）
    posts.sort((a, b) => {
      // 从文件名提取时间戳：YY-MM-DD-HH-MM-SS.md（或向后兼容的 YY-MM-DD-HH-MM.md）
      const timestampA = getTimestampFromFilename(a.filename);
      const timestampB = getTimestampFromFilename(b.filename);

      // 如果文件名时间戳有效，使用文件名时间排序
      if (timestampA > 0 && timestampB > 0) {
        return timestampB - timestampA;
      }

      // 降级方案：使用 pubDate 字段
      const dateA = new Date(a.pubDate || 0);
      const dateB = new Date(b.pubDate || 0);
      return dateB - dateA;
    });

    logger.success('API', `Returning ${posts.length} posts (sorted)`);
    res.json(posts);
  } catch (error) {
    logger.error('API', 'Failed to load posts', {error: error.message, stack: error.stack});
    res.status(500).json({error: error.message});
  }
});

/**
 * 从文件名中提取时间戳（用于排序）
 * @param {string} filename 文件名，格式：YY-MM-DD-HH-MM-SS.md（推荐）或 YY-MM-DD-HH-MM.md（向后兼容）
 * @returns {number} 时间戳（毫秒），解析失败返回 0
 */
function getTimestampFromFilename(filename) {
  // 移除扩展名
  const id = filename.replace(/\.(md|mdx)$/, '');

  // 匹配文件名格式：YY-MM-DD-HH-MM-SS（秒可选）
  // 支持：26-01-07-10-37-45 或 26-01-07-10-37
  const match = id.match(/^(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-(\d{2}))?/);

  if (!match) {
    return 0;
  }

  const [, yy, month, day, hour, minute, second] = match;

  // 将两位年份转换为完整年份（假设 20xx 年代）
  const year = 2000 + parseInt(yy, 10);

  // 创建 Date 对象（秒默认为 0，向后兼容旧格式）
  const date = new Date(
    year,
    parseInt(month, 10) - 1, // JavaScript 月份从 0 开始
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second || '0', 10) // 如果没有秒，默认为 00
  );

  return date.getTime();
}

// API: 获取单篇文章内容（支持路径格式的 ID）
app.get('/api/posts/:id(*)', (req, res) => {
  try {
    const requestedId = req.params.id;
    logger.debug('API', `Loading post: ${requestedId}`);

    // :id 可能是 "2026/01/26-01-07-10-37" 或 "2026/01/26-01-07-10-37.md"
    let fileId = requestedId;

    // 确保有扩展名
    if (!fileId.endsWith('.md') && !fileId.endsWith('.mdx')) {
      const mdPath = path.join(BLOG_DIR, `${fileId}.md`);
      const mdxPath = path.join(BLOG_DIR, `${fileId}.mdx`);

      if (fs.existsSync(mdPath)) {
        fileId = `${fileId}.md`;
        logger.debug('API', `Resolved to .md file: ${fileId}`);
      } else if (fs.existsSync(mdxPath)) {
        fileId = `${fileId}.mdx`;
        logger.debug('API', `Resolved to .mdx file: ${fileId}`);
      } else {
        logger.warn('API', `Post not found: ${requestedId}`);
        return res.status(404).json({error: '文章不存在'});
      }
    }

    const filePath = path.join(BLOG_DIR, fileId);

    if (!fs.existsSync(filePath)) {
      logger.warn('API', `File does not exist: ${filePath}`);
      return res.status(404).json({error: '文章不存在'});
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const {frontmatter, content: bodyContent} = parseFrontmatter(content);

    logger.success('API', `Post loaded successfully: ${frontmatter.title || '无标题'}`);
    res.json({
      id: fileId.replace(/\.(md|mdx)$/, ''),
      frontmatter,
      content: bodyContent,
    });
  } catch (error) {
    logger.error('API', 'Failed to load post', {error: error.message, stack: error.stack});
    res.status(500).json({error: error.message});
  }
});

// API: 创建新文章
app.post('/api/posts', (req, res) => {
  try {
    const {filename, frontmatter, content} = req.body;

    if (!filename) {
      return res.status(400).json({error: '文件名不能为空'});
    }

    // 自动生成 slug（如果 frontmatter 中没有提供）
    if (!frontmatter.slug) {
      frontmatter.slug = nanoid(8);
      logger.debug('API', `Auto-generated slug: ${frontmatter.slug}`);
    }

    // 确保文件名以 .md 结尾
    const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

    // 从文件名提取年月信息（YY-MM-DD-HH-MM-SS.md 或 YY-MM-DD-HH-MM.md）
    const match = finalFilename.match(/^(\d{2})-(\d{2})-/);
    let targetDir = BLOG_DIR;
    let relativePath = finalFilename;

    if (match) {
      const [, yy, mm] = match;
      const year = `20${yy}`;
      const month = mm;

      // 创建年月目录结构
      targetDir = path.join(BLOG_DIR, year, month);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      relativePath = `${year}/${month}/${finalFilename}`;
    }

    const filePath = path.join(targetDir, finalFilename);

    if (fs.existsSync(filePath)) {
      return res.status(400).json({error: '文件已存在'});
    }

    const fullContent = buildFrontmatter(frontmatter) + '\n' + (content || '');
    fs.writeFileSync(filePath, fullContent, 'utf-8');

    res.json({
      success: true,
      id: relativePath.replace(/\.(md|mdx)$/, ''),
      message: '文章创建成功'
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// API: 更新文章
app.put('/api/posts/:id(*)', (req, res) => {
  try {
    // :id 可能是 "2026/01/26-01-07-10-37" 或 "2026/01/26-01-07-10-37.md"
    let fileId = req.params.id;

    // 确保有扩展名
    if (!fileId.endsWith('.md') && !fileId.endsWith('.mdx')) {
      // 尝试添加 .md 扩展名
      const mdPath = path.join(BLOG_DIR, `${fileId}.md`);
      const mdxPath = path.join(BLOG_DIR, `${fileId}.mdx`);

      if (fs.existsSync(mdPath)) {
        fileId = `${fileId}.md`;
      } else if (fs.existsSync(mdxPath)) {
        fileId = `${fileId}.mdx`;
      } else {
        return res.status(404).json({error: '文章不存在'});
      }
    }

    const filePath = path.join(BLOG_DIR, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({error: '文章不存在'});
    }

    const {frontmatter, content} = req.body;
    const fullContent = buildFrontmatter(frontmatter) + '\n' + (content || '');

    fs.writeFileSync(filePath, fullContent, 'utf-8');

    res.json({
      success: true,
      message: '文章更新成功'
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// API: 删除文章
app.delete('/api/posts/:id(*)', (req, res) => {
  try {
    // :id 可能是 "2026/01/26-01-07-10-37" 或 "2026/01/26-01-07-10-37.md"
    let fileId = req.params.id;

    // 确保有扩展名
    if (!fileId.endsWith('.md') && !fileId.endsWith('.mdx')) {
      const mdPath = path.join(BLOG_DIR, `${fileId}.md`);
      const mdxPath = path.join(BLOG_DIR, `${fileId}.mdx`);

      if (fs.existsSync(mdPath)) {
        fileId = `${fileId}.md`;
      } else if (fs.existsSync(mdxPath)) {
        fileId = `${fileId}.mdx`;
      } else {
        return res.status(404).json({error: '文章不存在'});
      }
    }

    const filePath = path.join(BLOG_DIR, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({error: '文章不存在'});
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '文章删除成功'
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// API: 修复文章中的中文加粗格式
app.post('/api/posts/:id(*)/fix-bold', (req, res) => {
  try {
    // :id 可能是 "2026/01/26-01-07-10-37" 或 "2026/01/26-01-07-10-37.md"
    let fileId = req.params.id;

    // 确保有扩展名
    if (!fileId.endsWith('.md') && !fileId.endsWith('.mdx')) {
      const mdPath = path.join(BLOG_DIR, `${fileId}.md`);
      const mdxPath = path.join(BLOG_DIR, `${fileId}.mdx`);

      if (fs.existsSync(mdPath)) {
        fileId = `${fileId}.md`;
      } else if (fs.existsSync(mdxPath)) {
        fileId = `${fileId}.mdx`;
      } else {
        return res.status(404).json({
          success: false,
          error: '文章不存在'
        });
      }
    }

    const filePath = path.join(BLOG_DIR, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文章不存在'
      });
    }

    // 读取文章内容
    const content = fs.readFileSync(filePath, 'utf-8');

    // 修复中文加粗格式
    const fixedContent = fixChineseBold(content);

    // 检查是否有改动
    if (content === fixedContent) {
      return res.json({
        success: true,
        modified: false,
        message: '文章无需修复'
      });
    }

    // 写入修复后的内容
    fs.writeFileSync(filePath, fixedContent, 'utf-8');

    res.json({
      success: true,
      modified: true,
      message: '中文加粗格式修复成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 构建博客
app.post('/api/build', async (req, res) => {
  try {
    const {stdout, stderr} = await execAsync('npm run build', {
      cwd: PROJECT_ROOT,
    });

    res.json({
      success: true,
      message: '构建成功',
      output: stdout,
      errors: stderr,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      output: error.stdout,
      errors: error.stderr,
    });
  }
});

// API: 获取构建状态
app.get('/api/build/status', (req, res) => {
  const distDir = path.join(PROJECT_ROOT, 'dist');
  const exists = fs.existsSync(distDir);

  if (exists) {
    const stats = fs.statSync(distDir);
    res.json({
      built: true,
      lastBuildTime: stats.mtime,
    });
  } else {
    res.json({
      built: false,
    });
  }
});

// ==================== 友链管理 API ====================

// API: 获取所有友链
app.get('/api/friends', (req, res) => {
  try {
    const {friendLinks} = readFriendLinks();
    res.json({
      success: true,
      data: friendLinks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 添加友链
app.post('/api/friends', (req, res) => {
  try {
    const {name, url, avatar, description, note} = req.body;

    // 验证必填字段
    if (!name || !url || !avatar || !description) {
      return res.status(400).json({
        success: false,
        error: '所有字段都是必填的'
      });
    }

    // URL 验证
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'URL 必须以 http:// 或 https:// 开头'
      });
    }

    // 读取现有友链并添加新友链
    const {friendLinks} = readFriendLinks();
    const newFriend = {
      name: name.trim(),
      url: url.trim(),
      avatar: avatar.trim(),
      description: description.trim()
    };

    // 添加 note 如果提供
    if (note && note.trim()) {
      newFriend.note = note.trim();
    }

    friendLinks.push(newFriend);

    // 写入文件
    writeFriendLinks(friendLinks);

    res.json({
      success: true,
      message: '友链添加成功',
      data: friendLinks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 更新友链
app.put('/api/friends/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const {name, url, avatar, description, note} = req.body;

    // 验证必填字段
    if (!name || !url || !avatar || !description) {
      return res.status(400).json({
        success: false,
        error: '所有字段都是必填的'
      });
    }

    // URL 验证
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'URL 必须以 http:// 或 https:// 开头'
      });
    }

    // 读取现有友链
    const {friendLinks} = readFriendLinks();

    // 验证索引
    if (isNaN(index) || index < 0 || index >= friendLinks.length) {
      return res.status(400).json({
        success: false,
        error: '无效的友链索引'
      });
    }

    // 更新友链
    const updatedFriend = {
      name: name.trim(),
      url: url.trim(),
      avatar: avatar.trim(),
      description: description.trim()
    };

    // 添加 note 如果提供，或者保留原有的 note
    if (note && note.trim()) {
      updatedFriend.note = note.trim();
    } else if (friendLinks[index].note) {
      updatedFriend.note = friendLinks[index].note;
    }

    friendLinks[index] = updatedFriend;

    // 写入文件
    writeFriendLinks(friendLinks);

    res.json({
      success: true,
      message: '友链更新成功',
      data: friendLinks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 删除友链
app.delete('/api/friends/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);

    // 读取现有友链
    const {friendLinks} = readFriendLinks();

    // 验证索引
    if (isNaN(index) || index < 0 || index >= friendLinks.length) {
      return res.status(400).json({
        success: false,
        error: '无效的友链索引'
      });
    }

    // 删除友链
    const deletedLink = friendLinks.splice(index, 1)[0];

    // 写入文件
    writeFriendLinks(friendLinks);

    res.json({
      success: true,
      message: '友链删除成功',
      deletedLink,
      data: friendLinks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 个人名片管理 API ====================

/**
 * 读取并解析 consts.ts 文件中的 PROFILE 数据
 */
function readProfile() {
  try {
    const content = fs.readFileSync(CONSTS_FILE, 'utf8');

    // 提取 PROFILE 对象
    const match = content.match(/export const PROFILE: ProfileInfo = \{([\s\S]*?)\};/);

    if (!match) {
      throw new Error('无法找到 PROFILE 对象');
    }

    // 解析个人信息字段
    const objectContent = match[1];
    const profile = {};

    // 匹配字段：name, avatar, bio, location, email, github, bilibili, website
    const fieldRegex = /(\w+):\s*'([^']*)'/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(objectContent)) !== null) {
      profile[fieldMatch[1]] = fieldMatch[2];
    }

    return {content, profile};
  } catch (error) {
    throw new Error(`读取个人信息失败: ${error.message}`);
  }
}

/**
 * 生成 PROFILE 对象的 TypeScript 代码
 */
function generateProfileCode(profile) {
  let code = `export const PROFILE: ProfileInfo = {\n`;

  // 必填字段
  code += `\tname: '${profile.name || ''}',\n`;
  code += `\tavatar: '${profile.avatar || ''}',\n`;
  code += `\tbio: '${profile.bio || ''}',\n`;

  // 可选字段
  if (profile.location) {
    code += `\tlocation: '${profile.location}',\n`;
  }
  if (profile.email) {
    code += `\temail: '${profile.email}',\n`;
  }
  if (profile.github) {
    code += `\tgithub: '${profile.github}',\n`;
  }
  if (profile.bilibili) {
    code += `\tbilibili: '${profile.bilibili}',\n`;
  }
  if (profile.website) {
    code += `\twebsite: '${profile.website}'\n`;
  }

  code += `};`;
  return code;
}

/**
 * 写入更新后的 PROFILE 数据到 consts.ts
 */
function writeProfile(profile) {
  try {
    const {content} = readProfile();
    const newProfileCode = generateProfileCode(profile);

    // 替换原有的 PROFILE 对象
    const newContent = content.replace(
      /export const PROFILE: ProfileInfo = \{[\s\S]*?\};/,
      newProfileCode
    );

    fs.writeFileSync(CONSTS_FILE, newContent, 'utf8');
    return true;
  } catch (error) {
    throw new Error(`写入个人信息失败: ${error.message}`);
  }
}

// API: 获取个人信息
app.get('/api/profile', (req, res) => {
  try {
    const {profile} = readProfile();
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: 更新个人信息
app.put('/api/profile', (req, res) => {
  try {
    const {name, avatar, bio, location, email, github, bilibili, website} = req.body;

    // 验证必填字段
    if (!name || !avatar || !bio) {
      return res.status(400).json({
        success: false,
        error: '姓名、头像和简介是必填的'
      });
    }

    // 更新个人信息
    const updatedProfile = {
      name: name.trim(),
      avatar: avatar.trim(),
      bio: bio.trim()
    };

    // 添加可选字段
    if (location && location.trim()) {
      updatedProfile.location = location.trim();
    }
    if (email && email.trim()) {
      updatedProfile.email = email.trim();
    }
    if (github && github.trim()) {
      updatedProfile.github = github.trim();
    }
    if (bilibili && bilibili.trim()) {
      updatedProfile.bilibili = bilibili.trim();
    }
    if (website && website.trim()) {
      updatedProfile.website = website.trim();
    }

    // 写入文件
    writeProfile(updatedProfile);

    res.json({
      success: true,
      message: '个人信息更新成功',
      data: updatedProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  logger.success('SERVER', `Admin server started successfully`);
  logger.info('SERVER', `Management UI: http://${HOST}:${PORT}`);
  logger.info('SERVER', `API Endpoint: http://${HOST}:${PORT}/api`);
  logger.info('SERVER', `Blog Directory: ${BLOG_DIR}`);
  logger.info('SERVER', `Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
  console.log(`\n${LOG_COLORS.yellow}Press Ctrl+C to stop the server${LOG_COLORS.reset}\n`);
});
