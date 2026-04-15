import { model, type InferModel } from "kineo";

export const user = model((s) => ({
  id: s.int().id(),
  username: s.string().unique().required(),
  email: s.string().unique().required(),
  password: s.string().required(),
})).relate((s) => ({
  posts: s.relation(post).many(),
}));

export type User = InferModel<typeof user>;

export const post = model((s) => ({
  id: s.string().id(),
  title: s.string().required(),
  content: s.string().required(),
  published: s.boolean().required(),
  views: s.int().required(),
  authorId: s.int().required(),
}))
  .relate((s) => ({
    author: s.relation(user).fields("authorId").refs("id").required(),
    categories: s.relation(category).many(),
  }))
  .index("authorId");

export type Post = InferModel<typeof post>;

export const category = model((s) => ({
  id: s.string().id(),
  name: s.string().required(),
})).relate((s) => ({
  posts: s.relation(post).many(),
}));

export type Category = InferModel<typeof category>;
