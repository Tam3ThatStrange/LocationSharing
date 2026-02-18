const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: false
}));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("users.json")) fs.writeFileSync("users.json", "[]");

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

/* ---------------- AUTH ---------------- */

function getUsers() {
    return JSON.parse(fs.readFileSync("users.json"));
}

function saveUsers(users) {
    fs.writeFileSync("users.json", JSON.stringify(users));
}

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();

    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: "User exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    users.push({ username, password: hashed });
    saveUsers(users);

    res.json({ success: true });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) return res.json({ success: false });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false });

    req.session.username = username;
    res.json({ success: true });
});

app.get("/session", (req, res) => {
    res.json({ username: req.session.username || null });
});

/* ---------------- FILE UPLOAD ---------------- */

app.post("/upload", upload.single("file"), (req, res) => {
    res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

/* ---------------- SOCKET ---------------- */

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
        delete users[socket.id];
        io.emit("update-locations", users);
    });
});

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
