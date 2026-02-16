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

    socket.on("join", (username) => {
        users[socket.id] = {
            username: username,
            latitude: null,
            longitude: null
        };

        io.emit("chat-message", {
            username: "System",
            message: `${username} joined the chat`
        });
    });

    socket.on("send-location", (data) => {
        if (users[socket.id]) {
            users[socket.id].latitude = data.latitude;
            users[socket.id].longitude = data.longitude;
        }
        io.emit("update-locations", users);
    });

    // 💬 CHAT MESSAGE
    socket.on("chat-message", (message) => {
        if (users[socket.id]) {
            io.emit("chat-message", {
                username: users[socket.id].username,
                message: message
            });
        }
    });

    socket.on("disconnect", () => {
        if (users[socket.id]) {
            io.emit("chat-message", {
                username: "System",
                message: `${users[socket.id].username} left`
            });
        }

        delete users[socket.id];
        io.emit("update-locations", users);
    });
});

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
