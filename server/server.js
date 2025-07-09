import { app } from "./app.js";
import { connection } from "./database/dbConnection.js";
import { config } from "dotenv";

config({ path: "./config.env" });

connection();

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port http://localhost:${process.env.PORT}`);
});