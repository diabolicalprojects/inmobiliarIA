async function run() {
  const res = await fetch("https://openwa.diabolicalservices.tech/openapi.json");
  const data = await res.json();
  const paths = Object.keys(data.paths);
  console.log(paths.filter(p => p.includes("webhook") || p.includes("config")));
}
run();
