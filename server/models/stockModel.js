import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  "Security Code": { type: String, required: true },
  "Issuer Name": { type: String, required: true },
  "Security Id": { type: String, required: true },
  "Security Name": { type: String, required: true },
  "Yahoo Finance Ticker (BSE)": { type: String },
  "Yahoo Finance Ticker (NSE)": { type: String },
});

export const Stock = mongoose.model("financial-dashboard", stockSchema, "nse_bse_listed_companies");
