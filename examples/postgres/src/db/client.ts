import { kineo } from "kineo";
import postgres from "kineo/adapter/postgres/runtime";

import * as schema from "./schema.js";

const db = kineo(postgres(process.env.DB_URL!), schema);
export default db;
