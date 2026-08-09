async function run() {
  const sessionName = "test-config-session";
  
  const res = await fetch("https://openwa.diabolicalservices.tech/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer owa_k1_e745515e6ed2aff43f97b3325fae33f067064493911b597e09436033736e9a8e"
    },
    body: JSON.stringify({
      name: sessionName,
      config: {
        webhooks: [
          {
            url: "https://agentesia.diabolicalservices.tech/api/v1/webhooks/openwa/incoming",
            events: ["message", "message.any"]
          }
        ]
      }
    })
  });
  
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
