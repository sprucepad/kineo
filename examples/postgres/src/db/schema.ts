import { model, type InferModel } from "kineo";

export const user = model((s) => ({
  id: s.int().id(),
  username: s.string().unique(),
  email: s.string().unique(),
  password: s.string().required(),
})).relate((s) => ({
  posts: s.relation(post).many(),
}));

export type User = InferModel<typeof user>;

export const post = model((s) => ({
  id: s.int().id(),
  title: s.string().required(),
  tagline: s.string().required(),
  content: s.string().required(),
  image: s.string(),
  authorId: s.int().default(0),
}))
  .relate((s) => ({
    author: s.relation(user).fields("authorId").refs("id"),
    categories: s.relation(category).many(),
  }))
  .index(["authorId"]);

export type Post = InferModel<typeof post>;

export const category = model((s) => ({
  id: s.int(),
  name: s.string(),
})).relate((s) => ({
  posts: s.relation(post).many(),
}));
