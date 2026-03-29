import { model } from "kineo";

export const user = model((s) => ({
  id: s.int(),
  posts: s.relation(post),
}));

export const post = model((s) => ({
  authorId: s.int(),
  author: s.relation(user, {
    fields: ["authorId"],
    refs: ["id"],
  }),
}));
