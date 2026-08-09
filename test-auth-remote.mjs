async function run() {
  const url = "https://agentesia.diabolicalservices.tech/api/auth/callback/credentials";
  
  const csrfRes = await fetch("https://agentesia.diabolicalservices.tech/api/auth/csrf");
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson.csrfToken;
  const cookie = csrfRes.headers.get("set-cookie") || "";
  
  const params = new URLSearchParams();
  params.append("email", "admin@inmobiliarialuna.com");
  params.append("password", "admin123");
  params.append("csrfToken", csrfToken);
  params.append("json", "true");
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookie,
      "X-Forwarded-Proto": "https"
    },
    body: params.toString(),
    redirect: "manual" // DON'T follow redirects!
  });
  
  console.log("Status:", res.status);
  console.log("Location:", res.headers.get("location"));
  console.log(await res.text());
}
run();
