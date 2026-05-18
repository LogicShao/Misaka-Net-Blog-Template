import {defineCollection, z} from 'astro:content';
import {glob} from 'astro/loaders';

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({base: './src/content/blog', pattern: '**/*.{md,mdx}'}),
  // Type-check frontmatter using a schema
  schema: ({image}) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      // 短链接 ID（8字符 NanoID）
      slug: z.string().optional(),
    }),
});

const daily = defineCollection({
  loader: glob({base: './src/content/daily', pattern: '**/*.md'}),
  schema: z.object({
    date: z.coerce.date(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = {blog, daily};
