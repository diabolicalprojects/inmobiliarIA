import { getOpenWAClient } from "./src/lib/openwa.js";

// Setup polyfill for fetch if needed (node 20 has fetch)
process.env.OPENWA_BASE_URL = "https://openwa.diabolicalservices.tech";
process.env.OPENWA_API_KEY = "owa_k1_e745515e6ed2aff43f97b3325fae33f067064493911b597e09436033736e9a8e";

async function run() {
  const client = getOpenWAClient();
  try {
    const res = await client.startSession("agency_test");
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
