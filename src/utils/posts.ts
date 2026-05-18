import {getCollection, type CollectionEntry} from 'astro:content';
import {sortPostsByTime} from './sortPosts';

export type BlogPost = CollectionEntry<'blog'>;

export async function getPublishedPosts(): Promise<BlogPost[]> {
  return getCollection('blog', ({data}: BlogPost) => data.draft !== true);
}

export async function getSortedPublishedPosts(): Promise<BlogPost[]> {
  return sortPostsByTime(await getPublishedPosts());
}
