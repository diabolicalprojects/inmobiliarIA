async function run() {
  const res = await fetch(`https://openwa.diabolicalservices.tech/swagger.json`);
  const json = await res.json();
  const paths = Object.keys(json.paths).filter(p => p.includes("sendText") || p.includes("message"));
  for (const p of paths) {
    console.log(p);
  }
}

run();
