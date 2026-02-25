import express from "express";
import neo4jRouter from "@/neo4j";

const PORT = 5500;

const app = express();
app.set("view engine", "ejs");
app.set("views", "./views");
app.get("/", (_, res) => res.render("index"));

app.use("/neo4j", neo4jRouter);

app.listen(PORT, () => console.log(`Examples running on port ${PORT}!`));
