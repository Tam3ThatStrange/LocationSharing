const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

// Configure file storage
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// File upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
    res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

let users = {};

io.on("connection", (socket) => {

    socket.on("join", (username) => {
        users[socket.id] = {
            username,
            latitude: null,
            longitude: null
        };

        io.emit("chat-message", {
            username: "System",
            message: `${username} joined`
        });
    });

    socket.on("send-location", (data) => {
        if (users[socket.id]) {
            users[socket.id].latitude = data.latitude;
            users[socket.id].longitude = data.longitude;
        }
        io.emit("update-locations", users);
    });

    socket.on("chat-message", (message) => {
        if (users[socket.id]) {
            io.emit("chat-message", {
                username: users[socket.id].username,
                message
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
