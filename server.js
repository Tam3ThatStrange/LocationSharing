const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let users = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send-location", (data) => {
        users[socket.id] = data;
        io.emit("update-locations", users);
    });

    socket.on("disconnect", () => {
        delete users[socket.id];
        io.emit("update-locations", users);
    });
});

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});

