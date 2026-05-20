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
