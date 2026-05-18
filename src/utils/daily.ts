import {getCollection, type CollectionEntry} from 'astro:content';

export type DailyPost = CollectionEntry<'daily'>;

export async function getDailyPosts(): Promise<DailyPost[]> {
	return getCollection('daily');
}

export async function getSortedDailyPosts(): Promise<DailyPost[]> {
	const posts = await getDailyPosts();
	return posts.sort((a, b) => {
		return (b.data.date?.valueOf() || 0) - (a.data.date?.valueOf() || 0);
	});
}
