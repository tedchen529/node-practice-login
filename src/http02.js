import http from "node:http";
import fs from "node:fs/promises";

const server = http.createServer(async (req, res)=>{
  const jsonStr = JSON.stringify(req.headers, null, 4);

  await fs.writeFile("./headers.txt", jsonStr);

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf8'
  })
  res.end(jsonStr);
});

server.listen(3000);