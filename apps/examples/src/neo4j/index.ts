import { Router } from "express";
import { db } from "./db";

const router: Router = Router();

router.get("/", async (_, res) => {
  const data = await db.post.findMany({});
  res.render("home", { database: "Neo4j", data });
});

export default router;
