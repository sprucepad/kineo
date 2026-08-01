CREATE TABLE "category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
); -- Create table category
CREATE TABLE "post" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL,
  "views" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL
); -- Create table post
CREATE TABLE "user" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL
); -- Create table user
CREATE TABLE "category_post" (
  "categoryId" TEXT NOT NULL,
  "postId" TEXT NOT NULL
); -- Create table category_post
ALTER TABLE "post" ADD CONSTRAINT "post_author_fkey" FOREIGN KEY ("authorId") REFERENCES "user" ("id"); -- Add relationship post -> user
ALTER TABLE "category_post" ADD CONSTRAINT "category_post_mn_category_post_fkey" FOREIGN KEY ("categoryId") REFERENCES "category" ("id"); -- Add relationship category_post -> category
ALTER TABLE "category_post" ADD CONSTRAINT "category_post_mn_post_category_fkey" FOREIGN KEY ("postId") REFERENCES "post" ("id"); -- Add relationship category_post -> post
