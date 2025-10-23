// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";

// const app = express();
// app.use(cors());

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL || "http://localhost:3000",
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// // 🧠 Keep track of connected users (userId → socket.id)
// const onlineUsers = new Map<string, string>();

// io.on("connection", (socket) => {
//   console.log("✅ Socket connected:", socket.id);

//   /**
//    * 👤 Register user online
//    */
//   socket.on("userOnline", (userId: string) => {
//     if (!userId) return;
//     onlineUsers.set(userId, socket.id);
//     socket.data.userId = userId; // store in socket data for reference
//     console.log(`🟢 User ${userId} is online`);

//     io.emit("userStatusUpdate", { userId, status: "online" });
//     const onlineUserIds = Array.from(onlineUsers.keys());
//     socket.emit("onlineUsers", onlineUserIds);
//   });

//   /**
//    * Request full online users list
//    */
//   socket.on("getOnlineUsers", () => {
//     const onlineUserIds = Array.from(onlineUsers.keys());
//     socket.emit("onlineUsers", onlineUserIds);
//     console.log(`Sent onlineUsers to ${socket.id}:`, onlineUserIds);
//   });

//   /**
//    * 🏠 Join a conversation room
//    */
//   socket.on("join", (conversationId: string) => {
//     if (!conversationId) return;
//     socket.join(conversationId);
//     console.log(`Socket ${socket.id} joined room ${conversationId}`);
//   });

//   /**
//    * 💬 New message event
//    */
//   socket.on("message", (msg) => {
//     const { conversationId, text, type, createdAt } = msg;
//     if (!conversationId) return;

//     io.to(conversationId).emit("message", msg);
//     io.emit("newMessage", {
//       conversationId,
//       message: {
//         text: text || "",
//         createdAt: createdAt || new Date().toISOString(),
//         type: type || "text",
//       },
//     });
//   });

//   /**
//    * 🗑️ Message delete event
//    */
//   socket.on("deleteMessage", (data) => {
//     const { conversationId, messageIds } = data;
//     if (!conversationId || !Array.isArray(messageIds)) return;

//     console.log(
//       `🗑️ Deleting messages ${messageIds.join(", ")} from conversation ${conversationId}`
//     );

//     io.to(conversationId).emit("messageDeleted", { conversationId, messageIds });
//   });

//   // ────────────────────────────────────────────────
//   // 📞 CALL EVENTS SECTION
//   // ────────────────────────────────────────────────

//   /**
//    * 🟢 Call request: when user A calls user B
//    */
//   socket.on("call:request", ({ toUserId, fromUser, callType }) => {
//     const targetSocketId = onlineUsers.get(toUserId);
//     if (targetSocketId) {
//       console.log(`📞 Call request from ${fromUser.id} to ${toUserId}`);
//       io.to(targetSocketId).emit("call:incoming", { fromUser, callType });
//     } else {
//       console.log(`⚠️ User ${toUserId} not online for call`);
//     }
//   });

//   /**
//    * ✅ Accept call
//    */
//   socket.on("call:accept", ({ toUserId }) => {
//     const targetSocketId = onlineUsers.get(toUserId);
//     if (targetSocketId) {
//       io.to(targetSocketId).emit("call:accepted");
//       console.log(`✅ Call accepted by ${socket.data.userId}`);
//     }
//   });

//   /**
//    * ❌ Reject call
//    */
//   socket.on("call:reject", ({ toUserId }) => {
//     const targetSocketId = onlineUsers.get(toUserId);
//     if (targetSocketId) {
//       io.to(targetSocketId).emit("call:rejected");
//       console.log(`🚫 Call rejected by ${socket.data.userId}`);
//     }
//   });

//   /**
//    * 🔴 End call
//    */
//   socket.on("call:end", ({ toUserId }) => {
//     const targetSocketId = onlineUsers.get(toUserId);
//     if (targetSocketId) {
//       io.to(targetSocketId).emit("call:ended");
//       console.log(`🔴 Call ended by ${socket.data.userId}`);
//     }
//   });

//   // ────────────────────────────────────────────────
//   // 📞 END CALL EVENTS SECTION
//   // ────────────────────────────────────────────────

//   /**
//    * ❌ Disconnect
//    */
//   socket.on("disconnect", () => {
//     let disconnectedUserId: string | undefined;

//     for (const [userId, id] of onlineUsers.entries()) {
//       if (id === socket.id) {
//         disconnectedUserId = userId;
//         onlineUsers.delete(userId);
//         break;
//       }
//     }

//     if (disconnectedUserId) {
//       console.log(`⚫ User ${disconnectedUserId} is offline`);
//       io.emit("userStatusUpdate", { userId: disconnectedUserId, status: "offline" });
//     }

//     console.log("❌ Socket disconnected:", socket.id);
//   });
// });

// const PORT = process.env.PORT || 4000;

// server.listen(PORT, () => {
//   console.log(`🚀 Socket server is running on port ${PORT}`);
// });

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🧠 Keep track of connected users (userId → socket.id)
const onlineUsers = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  /**
   * 👤 Register user online
   * Frontend should emit "userOnline" with the user's ID after auth/connect.
   */
  socket.on("userOnline", (userId: string) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.data.userId = userId; // store in socket data for reference
    console.log(`🟢 User ${userId} is online (socket ${socket.id})`);

    // Notify everyone of status change and send full list back to this socket
    io.emit("userStatusUpdate", { userId, status: "online" });
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("onlineUsers", onlineUserIds);
  });

  /**
   * Request full online users list
   */
  socket.on("getOnlineUsers", () => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("onlineUsers", onlineUserIds);
    console.log(`Sent onlineUsers to ${socket.id}:`, onlineUserIds);
  });

  /**
   * 🏠 Join a conversation room
   */
  socket.on("join", (conversationId: string) => {
    if (!conversationId) return;
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room ${conversationId}`);
  });

  /**
   * 💬 New message event
   */
  socket.on("message", (msg) => {
    const { conversationId, text, type, createdAt } = msg;
    if (!conversationId) return;

    io.to(conversationId).emit("message", msg);
    io.emit("newMessage", {
      conversationId,
      message: {
        text: text || "",
        createdAt: createdAt || new Date().toISOString(),
        type: type || "text",
      },
    });
  });

  /**
   * 🗑️ Message delete event
   */
  socket.on("deleteMessage", (data) => {
    const { conversationId, messageIds } = data;
    if (!conversationId || !Array.isArray(messageIds)) return;

    console.log(
      `🗑️ Deleting messages ${messageIds.join(", ")} from conversation ${conversationId}`
    );

    io.to(conversationId).emit("messageDeleted", { conversationId, messageIds });
  });

  // ────────────────────────────────────────────────
  // 📞 CALL & WEBRTC SIGNALING SECTION
  // ────────────────────────────────────────────────

  /**
   * 🟢 Call request: when user A calls user B
   * payload: { toUserId: string, fromUser: any, callType: 'voice'|'video' }
   */
  socket.on("call:request", ({ toUserId, fromUser, callType }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      console.log(`📞 Call request from ${fromUser?.id} to ${toUserId} (${callType})`);
      io.to(targetSocketId).emit("call:incoming", { fromUser, callType });
    } else {
      console.log(`⚠️ User ${toUserId} not online for call request`);
      socket.emit("call:unreachable", { toUserId });
    }
  });

  /**
   * ✅ Accept call
   * payload: { toUserId: string, metadata?: any }
   */
  socket.on("call:accept", ({ toUserId, metadata }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:accepted", { fromSocketId: socket.id, metadata });
      console.log(`✅ Call accepted by ${socket.data.userId} -> notify ${toUserId}`);
    }
  });

  /**
   * ❌ Reject call
   */
  socket.on("call:reject", ({ toUserId }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:rejected", { fromSocketId: socket.id });
      console.log(`🚫 Call rejected by ${socket.data.userId} -> notify ${toUserId}`);
    }
  });

  /**
   * 🔴 End call
   */
  socket.on("call:end", ({ toUserId }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ended", { fromSocketId: socket.id });
      console.log(`🔴 Call ended by ${socket.data.userId} -> notify ${toUserId}`);
    }
  });

  /**
   * --------------------------
   * WEBRTC SIGNALING CHANNELS
   * --------------------------
   *
   * We forward offer/answer/candidates to the target user's socket so both peers
   * can establish a direct peer-to-peer connection.
   *
   * Client payloads:
   * - "webrtc:offer" -> { toUserId, offer }
   * - "webrtc:answer" -> { toUserId, answer }
   * - "webrtc:candidate" -> { toUserId, candidate }
   */

  socket.on("webrtc:offer", ({ toUserId, offer }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc:offer", { fromSocketId: socket.id, offer });
      console.log(`webrtc:offer forwarded from ${socket.data.userId} to ${toUserId}`);
    } else {
      socket.emit("webrtc:error", { message: "Target not online", toUserId });
    }
  });

  socket.on("webrtc:answer", ({ toUserId, answer }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc:answer", { fromSocketId: socket.id, answer });
      console.log(`webrtc:answer forwarded from ${socket.data.userId} to ${toUserId}`);
    } else {
      socket.emit("webrtc:error", { message: "Target not online", toUserId });
    }
  });

  socket.on("webrtc:candidate", ({ toUserId, candidate }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc:candidate", { fromSocketId: socket.id, candidate });
      // candidate can be null sometimes; that's fine
    } else {
      socket.emit("webrtc:error", { message: "Target not online", toUserId });
    }
  });

  // ────────────────────────────────────────────────
  // 📞 END CALL & WEBRTC SIGNALING SECTION
  // ────────────────────────────────────────────────

  /**
   * ❌ Disconnect
   */
  socket.on("disconnect", () => {
    let disconnectedUserId: string | undefined;

    for (const [userId, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      console.log(`⚫ User ${disconnectedUserId} is offline`);
      io.emit("userStatusUpdate", { userId: disconnectedUserId, status: "offline" });
    }

    console.log("❌ Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Socket server is running on port ${PORT}`);
});
