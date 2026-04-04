import { model, type InferModel } from "kineo";

export const user = model((s) => ({
  id: s.int().id(),
})).relate((s) => ({
  posts: s.relation(post).many(),
}));

export type User = InferModel<typeof user>;

export const post = model((s) => ({
  id: s.int().id(),
  authorId: s.int().default(0),
}))
  .relate((s) => ({
    author: s.relation(user).fields("authorId").refs("id"),
  }))
  .index(["authorId"]);

export type Post = InferModel<typeof post>;
