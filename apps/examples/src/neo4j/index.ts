import { Router } from "express";
import { db } from "./db";

const router: Router = Router();

router
  .get("/", async (_, res) => {
    const data = await db.post.findMany({});
    // TODO fix: include returns array of objects named `n` and empty array `author`, instead of including the author
    // TODO fix: author is an id instead of the actual author object after selection
    res.render("home", { database: "Neo4j", data });
  })
  .post("/", async (req, res) => {
    let user = await db.user.findFirst({
      where: {
        name: req.body.name,
        password: req.body.password,
      },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: crypto.randomUUID(),
          name: req.body.name,
          password: req.body.password,
        },
      });
    }

    await db.post.create({
      data: {
        id: crypto.randomUUID(),
        title: req.body.title,
        content: req.body.content,
        // TODO fix: can't pass author id instead of author object, which breaks things
        author: user.id,
      },
    });

    const data = await db.post.findMany({});
    res.render("home", { database: "Neo4j", data });
  });

export default router;
