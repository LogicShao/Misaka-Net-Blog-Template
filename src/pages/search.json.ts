import type {APIRoute} from 'astro';
import type {BlogPost} from '../utils/posts';
import {getPublishedPosts} from '../utils/posts';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const searchIndex = posts.map((post: BlogPost) => ({
    slug: post.data.slug || post.id,
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags || [],
    pubDate: post.data.pubDate.toISOString(),
  }));

  return new Response(JSON.stringify(searchIndex), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
