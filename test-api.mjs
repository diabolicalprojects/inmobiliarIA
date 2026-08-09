import crypto from "crypto";

async function run() {
  const sessionName = `agency-d01ae73f-109d-4601-81f9-c1807d7efac1-${crypto.randomUUID().substring(0, 8)}`;
  console.log("Creating session:", sessionName);
  
  const res = await fetch("https://openwa.diabolicalservices.tech/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer owa_k1_e745515e6ed2aff43f97b3325fae33f067064493911b597e09436033736e9a8e"
    },
    body: JSON.stringify({ name: sessionName })
  });
  
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
