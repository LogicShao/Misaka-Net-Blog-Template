import rss from '@astrojs/rss';
import {SITE_DESCRIPTION, SITE_TITLE} from '../consts';
import {getSortedPublishedPosts} from '../utils/posts';

export async function GET(context) {
  // 获取所有博客文章，过滤草稿，按文件名时间排序（新文章在前）
  const posts = await getSortedPublishedPosts();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `/blog/${post.data.slug || post.id}/`,
    })),
  });
}
