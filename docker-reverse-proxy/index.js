const dockerode = require("dockerode");
const express = require("express");
const http = require("http");
const httpProxy = require("http-proxy");
const cors = require("cors");

const db = new Map();

const proxy = httpProxy.createProxy({
  ws: true,
});

const docker = new dockerode({ socketPath: "/var/run/docker.sock" });

docker.getEvents((err, stream) => {
  if (err) {
    console.log("error getting docker events ", err);
    return;
  }
  stream.on("data", async (chunk) => {
    if (!chunk) return;
    const event = JSON.parse(chunk.toString());
    if (event.Type === "container" && event.Action === "start") {
      const container = docker.getContainer(event.id);
      const containerInfo = await container.inspect();

      // console.log(
      //   "containerInfo networksettings",
      //   containerInfo.NetworkSettings
      // );

      const containerName = containerInfo.Name.substring(1);
      const ipaddress =
        containerInfo.NetworkSettings.Networks["repl-lit-network"].IPAddress;

      //for bridge network
      // const ipaddress = containerInfo.NetworkSettings.Networks.bridge.IPAddress;

      const exposedPorts = Object.keys(containerInfo.NetworkSettings.Ports);

      let defaultPort = null;
      if (exposedPorts && exposedPorts.length > 0) {
        const [port, type] = exposedPorts[0].split("/");
        if (type === "tcp") defaultPort = port;
        console.log(
          `Registering ${containerName}.localhost ---> http://${ipaddress}`
        );
      }
      db.set(containerName, { containerName, ipaddress, defaultPort });
    }
  });
});
const reverseProxyApp = express();
reverseProxyApp.use(cors());
reverseProxyApp.use((req, res) => {
  try {
    const hostname = req.hostname;
    const subdomain = hostname.split(".")[0];
    if (!db.has(subdomain)) return res.status(404).end("404 Not Found");

    //running project on port
    const PORT = req.query.port;
    console.log("output port", PORT);
    const { ipaddress, defaultPort } = db.get(subdomain);
    let target;
    if (!PORT) target = `http://${ipaddress}:${defaultPort}`;
    else target = `http://${ipaddress}:${PORT}`;
    console.log(`Forwarding ${hostname} --> ${target}`);

    return proxy.web(req, res, { target, changeOrigin: true, ws: true });
  } catch (error) {
    console.error("Error while forwarding request:", error);
    return res.status(500).json({
      status: "error",
      message: "Error while forwarding request",
      error: error.message,
    });
  }
});

const reverseProxy = http.createServer(reverseProxyApp);
reverseProxy.on("upgrade", (req, soc, head) => {
  console.log("connection upgrade");
  try {
    const hostname = req.headers.host;
    console.log("hostname", hostname);
    const subdomain = hostname.split(".")[0];

    if (!db.has(subdomain)) {
      console.log("Subdomain not found");
      return soc.destroy(); // Destroy the socket connection if subdomain is not found
    }

    const { ipaddress, defaultPort } = db.get(subdomain);
    const target = `http://${ipaddress}:${defaultPort}`;

    console.log(`Forwarding ${hostname} --> ${target}`);

    return proxy.ws(req, soc, head, { target, ws: true });
  } catch (error) {
    console.error("Error while upgrading connection:", error);
    return soc.destroy();
  }
});

reverseProxy.listen(80, () =>
  console.log("Reverse Proxy is listening on port 80")
);
