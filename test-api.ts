async function run() {
  const res = await fetch("https://openwa.diabolicalservices.tech/api/webhooks", {
    headers: {
      "Authorization": "Bearer owa_k1_e745515e6ed2aff43f97b3325fae33f067064493911b597e09436033736e9a8e",
      "Accept": "application/json"
    }
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log(text);
}
run();
