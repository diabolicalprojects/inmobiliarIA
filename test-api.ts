async function run() {
  const res = await fetch("https://openwa.diabolicalservices.tech/api/sessions", {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer owa_k1_e745515e6ed2aff43f97b3325fae33f067064493911b597e09436033736e9a8e"
    }
  });
  
  const data = await res.json();
  const testSession = data.find((s: any) => s.name === "test-config-2");
  console.log(JSON.stringify(testSession, null, 2));
}
run();
