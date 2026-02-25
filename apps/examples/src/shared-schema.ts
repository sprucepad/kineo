import { defineSchema, field, model, relation } from "kineo";

export default defineSchema({
  user: model("User", {
    id: field.string().id(),
    name: field.string().unique().required(),
    email: field.string().unique().required(),
    posts: relation.to("post").array().outgoing("HAS_POSTS").default([]),
  }),
  post: model("Post", {
    id: field.string().id(),
    title: field.string().required(),
    description: field.string(),
    author: relation.to("user").incoming("HAS_POSTS").required(),
  }),
});
