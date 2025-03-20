import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

//whenever there is connection
// event handler
wss.on("connection", function connection(socket) {
  socket.on("error", console.error);

  // console.log("user connected");
  socket.send("ping");
  // setInterval(() => {
  //   socket.send(`cureent price of sol:-${Math.random()}`);
  // }, 5000);

  // socket.on("message", (e) => {
  //   // console.log(e.toString());
  //   if (e.toString() === " ping") {
  //     socket.send("pong");
  //   }
  // });
  setInterval(() => {
    socket.send("hii");
  }, 1000);
  // socket.on("message", function message(data, isBinary) {
  //   wss.clients.forEach(function each(client) {
  //     if (client.readyState === WebSocket.OPEN) {
  //       client.send(data, { binary: isBinary });
  //     }
  //   });
  // });
});
