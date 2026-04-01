import { model } from "kineo";
import type { InferModel } from "kineo/schema";

export const user = model((s) => ({
  id: s.int().id(),
})).relate((s) => ({
  posts: s.relation(post).many().required(),
}));

export type User = InferModel<typeof user>;

export const post = model((s) => ({
  id: s.int().id(),
  authorId: s.int().required(),
}))
  .relate((s) => ({
    author: s
      .relation(user, {
        fields: ["authorId"],
        refs: ["id"],
      })
      .required(),
  }))
  .index(["authorId"]);

export type Post = InferModel<typeof post>;
