/**
 * 博客文章排序工具函数
 *
 * 文件名格式：YY-MM-DD-HH-MM-SS.md（推荐）或 YY-MM-DD-HH-MM.md（向后兼容）
 * 例如：
 *   - 25-11-24-16-00-30.md 表示 2025年11月24日 16:00:30
 *   - 25-11-24-16-00.md 表示 2025年11月24日 16:00:00（秒默认为00）
 */

import type {CollectionEntry} from 'astro:content';

/**
 * 从文件名中提取时间戳（支持秒级精度）
 * @param id 文章 ID（可能包含路径，如 "2026/01/26-01-07-10-37-45" 或 "26-01-07-10-37-45"）
 * @returns 时间戳（毫秒），如果解析失败返回 0
 *
 * @example
 * getTimestampFromFilename('25-11-24-16-00-30') // 返回 2025-11-24 16:00:30 的时间戳
 * getTimestampFromFilename('25-11-24-16-00')    // 返回 2025-11-24 16:00:00 的时间戳（向后兼容）
 * getTimestampFromFilename('2026/01/26-01-07-10-37-45') // 返回 2026-01-07 10:37:45 的时间戳
 */
export function getTimestampFromFilename(id: string): number {
  // 从 ID 中提取文件名部分（去除可能的路径前缀）
  // 例如："2026/01/26-01-07-10-37-45" → "26-01-07-10-37-45"
  const filename = id.split('/').pop() || id;

  // 匹配文件名格式：YY-MM-DD-HH-MM-SS（秒可选）
  // 支持：26-01-07-10-37-45 或 26-01-07-10-37
  const match = filename.match(/^(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-(\d{2}))?/);

  if (!match) {
    // 如果文件名不符合格式，返回 0（不再输出警告，避免控制台污染）
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

/**
 * 排序博客文章（新文章在前）
 *
 * 优先使用文件名中的精确时间（小时+分钟+秒）进行排序
 * 如果文件名解析失败，降级使用 pubDate 字段
 *
 * @param posts 文章数组
 * @returns 排序后的文章数组（新文章在前）
 *
 * @example
 * const sorted = sortPostsByTime(posts);
 */
export function sortPostsByTime(posts: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
  return posts.sort((a, b) => {
    // 优先使用文件名中的时间戳
    const timeA = getTimestampFromFilename(a.id);
    const timeB = getTimestampFromFilename(b.id);

    // 如果文件名时间戳有效，使用文件名时间排序
    if (timeA > 0 && timeB > 0) {
      return timeB - timeA; // 降序：新文章在前
    }

    // 降级方案：使用 pubDate 字段
    const dateA = a.data.pubDate?.valueOf() || 0;
    const dateB = b.data.pubDate?.valueOf() || 0;

    return dateB - dateA;
  });
}

/**
 * 排序比较函数（用于 Array.sort）
 *
 * @example
 * posts.sort(comparePostsByTime)
 */
export function comparePostsByTime(
  a: CollectionEntry<'blog'>,
  b: CollectionEntry<'blog'>
): number {
  const timeA = getTimestampFromFilename(a.id);
  const timeB = getTimestampFromFilename(b.id);

  if (timeA > 0 && timeB > 0) {
    return timeB - timeA;
  }

  return (b.data.pubDate?.valueOf() || 0) - (a.data.pubDate?.valueOf() || 0);
}
