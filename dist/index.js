"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let user = 0;
// let allSockets: WebSocket[] = [];
const rooms = new Map();
const userRooms = new Map();
const INACTIVE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const roomLastActivity = new Map();
wss.on("connection", (socket) => {
    user = user + 1;
    console.log(`user connected:${user}`);
    //room cleanup
    const cleanupInterval = setInterval(() => {
        cleanupInactiveRooms();
    }, 60000); // one minute
    socket.on("message", (message) => {
        const data = JSON.parse(message.toString());
        console.log("data", data);
        // Update room activity timestamp
        if (data.type === "message") {
            updateRoomActivity(data.data.room);
        }
        switch (data.type) {
            case "join":
                handleJoin(socket, data.data.room, data.data.name);
                break;
            case "message":
                handleMessage(socket, data.data.message, data.data.name);
                break;
            case "leave":
                handleLeave(socket, data.data.name, data.data.room);
                break;
            default:
                socket.send(JSON.stringify({ error: "Invalid request" }));
        }
    });
    socket.on("close", () => {
        const room = userRooms.get(socket);
        if (room) {
            handleLeave(socket, "Unknown User", room);
            // Check if room is empty after user leaves
            checkAndDeleteEmptyRoom(room);
        }
        clearInterval(cleanupInterval);
    });
});
function handleJoin(ws, room, name) {
    var _a, _b;
    const previousRoom = userRooms.get(ws);
    if (previousRoom && rooms.has(previousRoom)) {
        (_a = rooms.get(previousRoom)) === null || _a === void 0 ? void 0 : _a.delete(ws);
        Broadcast(previousRoom, `${name} has left the chat`);
    }
    if (!rooms.has(room)) {
        rooms.set(room, new Set());
    }
    (_b = rooms.get(room)) === null || _b === void 0 ? void 0 : _b.add(ws);
    userRooms.set(ws, room);
    ws.send(JSON.stringify({
        type: "system",
        message: `Welcome to room ${room}!`,
    }));
    Broadcast(room, `${name} has joined the room`, ws);
    // Initialize or update room activity timestamp
    updateRoomActivity(room);
}
function handleMessage(ws, message, name) {
    const room = userRooms.get(ws);
    if (room && rooms.has(room)) {
        Broadcast(room, message, ws, name);
    }
    else {
        ws.send(JSON.stringify({ error: "You are not in any room" }));
    }
    console.log("room Inactive", roomLastActivity);
}
function handleLeave(ws, name, room) {
    var _a;
    const currentRoom = userRooms.get(ws);
    if (currentRoom && rooms.has(currentRoom)) {
        (_a = rooms.get(currentRoom)) === null || _a === void 0 ? void 0 : _a.delete(ws);
        userRooms.delete(ws);
        Broadcast(currentRoom, `${name} has left the chat`);
        // Check if room should be deleted after user leaves
        checkAndDeleteEmptyRoom(currentRoom);
    }
}
function Broadcast(room, message, sender, senderName) {
    if (rooms.has(room)) {
        for (const client of rooms.get(room)) {
            if (client.readyState === ws_1.WebSocket.OPEN && client !== sender) {
                client.send(JSON.stringify({
                    type: "message",
                    message,
                    sender: senderName || "System",
                }));
                console.log("senderName", senderName);
            }
        }
    }
}
// Add these new functions
function updateRoomActivity(room) {
    roomLastActivity.set(room, Date.now());
}
function checkAndDeleteEmptyRoom(room) {
    const roomClients = rooms.get(room);
    if (roomClients && roomClients.size === 0) {
        rooms.delete(room);
        roomLastActivity.delete(room);
        console.log(`Room ${room} deleted because it's empty`);
    }
}
function cleanupInactiveRooms() {
    const now = Date.now();
    for (const [room, lastActivity] of roomLastActivity.entries()) {
        if (now - lastActivity > INACTIVE_TIMEOUT) {
            const roomClients = rooms.get(room);
            if (roomClients) {
                // Notify all clients in the room
                for (const client of roomClients) {
                    client.send(JSON.stringify({
                        type: "system",
                        message: "Room closed due to inactivity",
                    }));
                    if (userRooms.has(client)) {
                        userRooms.delete(client);
                    }
                }
                // Delete the room
                rooms.delete(room);
                roomLastActivity.delete(room);
                console.log(`Room ${room} deleted due to inactivity`);
            }
        }
    }
}
