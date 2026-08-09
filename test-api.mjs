async function run() {
  const url = "https://openwa.diabolicalservices.tech/api/sessions";
  console.log("Fetching:", url);
  
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer owa_k1_e745515e6ed2aff43f97b3325fae33f067064493911b597e09436033736e9a8e"
    }
  });
  
  console.log("Status:", res.status);
  console.log("Headers:", res.headers);
  const text = await res.text();
  console.log("Body preview:", text.substring(0, 200));
}
run();
