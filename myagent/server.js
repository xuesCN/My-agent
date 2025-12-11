import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { runAgentStream } from "./agent/main.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// 健康检查路由
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// 静态文件（前端页面）
app.use(express.static(path.join(__dirname, "public")));

// 启动HTTP服务器
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// 创建WebSocket服务器
const wss = new WebSocketServer({ server });

// 处理WebSocket连接
wss.on("connection", (ws) => {
  console.log("New client connected");

  // 发送欢迎消息
  ws.send(
    JSON.stringify({
      type: "welcome",
      message: "Welcome to AI Assistant WebSocket Server",
    })
  );

  // 处理客户端消息
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      // 处理不同类型的消息
      switch (data.type) {
        case "message": {
          // 处理用户消息，调用AI助手
          const { content } = data;

          // 先发送开始消息
          ws.send(
            JSON.stringify({
              type: "start",
              conversationId: data.conversationId,
            })
          );

          // 使用真实流式响应，传递历史对话记录
          const history = data.history || [];
          for await (const chunk of runAgentStream(content, history)) {
            ws.send(
              JSON.stringify({
                type: "chunk",
                content: chunk,
              })
            );
          }

          // 发送完成消息
          ws.send(
            JSON.stringify({
              type: "complete",
            })
          );
          break;
        }

        default:
          console.log("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error processing message:", error);

      // 发送错误消息
      ws.send(
        JSON.stringify({
          type: "error",
          message: error.message,
        })
      );
    }
  });

  // 处理连接关闭
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  // 处理错误
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

console.log("WebSocket server is running");
