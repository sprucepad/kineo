import { model } from "kineo";

export const user = model((s) => ({
  id: s.int().id(),
  username: s.string().unique(),
  email: s.string().unique(),
  password: s.string(),
}))
  .relate((s) => ({
    posts: s.relation(post).many(),
  }))
  .index("username", "email");

export const post = model((s) => ({
  id: s.string().id(),
  title: s.string(),
  content: s.string(),
  published: s.boolean().default(false),
  views: s.int().default(0),
  authorId: s.int(),
}))
  .relate((s) => ({
    author: s.relation(user).fields("authorId").refs("id"),
    categories: s.relation(category).many(),
  }))
  .index("authorId", "title");

export const category = model((s) => ({
  id: s.string().id(),
  name: s.string(),
}))
  .relate((s) => ({
    posts: s.relation(post).many(),
  }))
  .index("name");
