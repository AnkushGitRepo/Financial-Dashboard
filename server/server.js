import { app } from "./app.js";
import { connection } from "./database/dbConnection.js";
import { config } from "dotenv";
import cron from "node-cron";
import { exec } from "child_process";

config({ path: "./config.env" });

connection();

// Function to run the Python scraper
const runScraper = () => {
  exec("python ../scraper/ipo_data_scraper.py", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout`);
  });
};

// Run the scraper immediately when the server starts
runScraper();

// Schedule the scraper to run every hour
cron.schedule("0 * * * *", () => {
  console.log(" 🔎 Running IPO data scraper...");
  runScraper();
});

app.listen(process.env.PORT, () => {
  console.log(` 🌐 Server listening on port http://localhost:${process.env.PORT}`);
});