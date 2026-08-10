async function run() {
  try {
    const res = await fetch("https://agentesia.diabolicalservices.tech/api/v1/debug");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
run();
