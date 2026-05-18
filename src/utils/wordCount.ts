/**
 * 字数统计工具（支持中英文混合）
 * 用于准确统计 Markdown 文章的字数
 */

/**
 * 统计文章字数（支持中英文混合）
 * @param markdown Markdown 格式的文章内容
 * @returns 字数
 */
export function countWords(markdown: string): number {
  if (!markdown) return 0;

  let content = markdown;

  // 1. 移除代码块（包括行内代码和多行代码块）
  content = content.replace(/```[\s\S]*?```/g, ''); // 多行代码块
  content = content.replace(/`[^`]+`/g, ''); // 行内代码

  // 2. 移除 Markdown 语法标记
  content = content.replace(/!\[.*?\]\(.*?\)/g, ''); // 图片
  content = content.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // 链接（保留文本内容）
  content = content.replace(/^#{1,6}\s+/gm, ''); // 标题标记
  content = content.replace(/[*_~]/g, ''); // 加粗、斜体、删除线标记
  content = content.replace(/^>\s+/gm, ''); // 引用标记
  content = content.replace(/^[-*+]\s+/gm, ''); // 列表标记
  content = content.replace(/^\d+\.\s+/gm, ''); // 有序列表标记
  content = content.replace(/---+/g, ''); // 分隔线

  // 3. 移除 HTML 标签
  content = content.replace(/<[^>]+>/g, '');

  // 4. 移除多余的空白字符
  content = content.replace(/\n+/g, ' '); // 换行符替换为空格
  content = content.replace(/\s+/g, ' '); // 多个空格合并为一个
  content = content.trim();

  // 5. 分别统计中英文
  const chineseCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length; // 中文字符
  const englishWords = content.match(/[a-zA-Z]+/g) || []; // 英文单词
  const englishCount = englishWords.length;

  return chineseCount + englishCount;
}

/**
 * 格式化字数为 K 单位（如 1.5K）
 * @param words 字数
 * @returns 格式化后的字符串
 */
export function formatWordCount(words: number): string {
  if (words < 1000) {
    return words.toString();
  }
  return `${(words / 1000).toFixed(1)}K`;
}
