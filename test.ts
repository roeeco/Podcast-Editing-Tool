import fetch from "node-fetch";

const key = "56531106-177ca2333a437ad917c79bd24";
const urls = [
  `http://localhost:3000/api/pixabay?type=music&q=happy`
];

async function test() {
  for (const url of urls) {
    const res = await fetch(url);
    console.log(url, res.status);
    if(res.ok) {
        console.log(await res.json().then((r: any) => r.hits ? r.hits.length : 0));
    }
  }
}
test();
