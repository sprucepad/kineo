import { model } from "kineo";

export const user = model((s) => ({
  id: s.int().id(),
})).relate((s) => ({
  posts: s.relation(post).many().required(),
}));

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
