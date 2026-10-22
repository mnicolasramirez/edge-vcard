// Entry point for wrangler. card.json is your card (copy card.example.json to start); it is
// bundled at deploy and used whenever no valid card is found in KV.
import bundled from "../card.json";
import { createWorker } from "./app.js";

export default createWorker(bundled);
