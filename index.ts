// server/index.ts  (or wherever your socket server lives)
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

/* --------------------------------------------------------------
   Keep track of connected users: userId → socket.id
   -------------------------------------------------------------- */
const onlineUsers = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* --------------------------------------------------------------
     USER ONLINE / OFFLINE
     -------------------------------------------------------------- */
  socket.on("userOnline", (userId: string) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.data.userId = userId;
    console.log(`User ${userId} is online (socket ${socket.id})`);

    io.emit("userStatusUpdate", { userId, status: "online" });
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  /* --------------------------------------------------------------
     CHAT / ROOMS
     -------------------------------------------------------------- */
  socket.on("join", (conversationId: string) => {
    if (!conversationId) return;
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room ${conversationId}`);
  });

  socket.on("message", (msg) => {
    const { conversationId } = msg;
    if (!conversationId) return;
    io.to(conversationId).emit("message", msg);
    io.emit("newMessage", {
      conversationId,
      message: {
        text: msg.text ?? "",
        createdAt: msg.createdAt ?? new Date().toISOString(),
        type: msg.type ?? "text",
      },
    });
  });

  socket.on("deleteMessage", ({ conversationId, messageIds }) => {
    if (!conversationId || !Array.isArray(messageIds)) return;
    io.to(conversationId).emit("messageDeleted", { conversationId, messageIds });
  });

  /* --------------------------------------------------------------
     CALL & WEBRTC SIGNALING
     -------------------------------------------------------------- */

  /* 1. CALL REQUEST – forward the SDP offer */
  socket.on(
    "call:request",
    ({ toUserId, fromUser, callType, offer }: {
      toUserId: string;
      fromUser: any;
      callType: "voice" | "video";
      offer?: RTCSessionDescriptionInit;
    }) => {
      const target = onlineUsers.get(toUserId);
      if (target) {
        console.log(
          `Call request ${fromUser?.id} → ${toUserId} (${callType})`
        );
        io.to(target).emit("call:incoming", {
          fromUser,
          callType,
          offer, // <-- THIS IS THE MISSING PIECE
        });
      } else {
        console.warn(`User ${toUserId} not online`);
        socket.emit("call:unreachable", { toUserId });
      }
    }
  );

  /* 2. CALL ACCEPTED / REJECTED / ENDED (UI only) */
  socket.on("call:accept", ({ toUserId }) => {
    const target = onlineUsers.get(toUserId);
    if (target) {
      io.to(target).emit("call:accepted");
    }
  });

  socket.on("call:reject", ({ toUserId }) => {
    const target = onlineUsers.get(toUserId);
    if (target) io.to(target).emit("call:rejected");
  });

  socket.on("call:end", ({ toUserId }) => {
    const target = onlineUsers.get(toUserId);
    if (target) io.to(target).emit("call:ended");
  });

  /* --------------------------------------------------------------
     WEBRTC SIGNALING CHANNELS (offer / answer / candidate)
     -------------------------------------------------------------- */
  socket.on("webrtc:offer", ({ toUserId, offer }) => {
    const target = onlineUsers.get(toUserId);
    if (target) {
      io.to(target).emit("webrtc:offer", { fromSocketId: socket.id, offer });
    } else {
      socket.emit("webrtc:error", { message: "Target not online", toUserId });
    }
  });

  socket.on("webrtc:answer", ({ toUserId, answer }) => {
    const target = onlineUsers.get(toUserId);
    if (target) {
      io.to(target).emit("webrtc:answer", { fromSocketId: socket.id, answer });
    } else {
      socket.emit("webrtc:error", { message: "Target not online", toUserId });
    }
  });

  socket.on("webrtc:candidate", ({ toUserId, candidate }) => {
    const target = onlineUsers.get(toUserId);
    if (target) {
      io.to(target).emit("webrtc:candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    } else {
      socket.emit("webrtc:error", { message: "Target not online", toUserId });
    }
  });

  /* --------------------------------------------------------------
     DISCONNECT
     -------------------------------------------------------------- */
  socket.on("disconnect", () => {
    let userId: string | undefined;
    for (const [id, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        userId = id;
        onlineUsers.delete(id);
        break;
      }
    }
    if (userId) {
      console.log(`User ${userId} is offline`);
      io.emit("userStatusUpdate", { userId, status: "offline" });
    }
    console.log("Socket disconnected:", socket.id);
  });
});

/* --------------------------------------------------------------
   START SERVER
   -------------------------------------------------------------- */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});