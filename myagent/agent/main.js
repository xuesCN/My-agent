import { agent } from "./graph.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";

dotenv.config();

const rl = readline.createInterface({ input, output });

// 对话历史管理
let conversationHistory = [];

// 导出的函数，供服务器调用
/**
 * 运行 Agent，处理用户消息（流式版本）
 * @param {string} message 用户消息
 * @param {Array} history 历史对话记录
 * @returns {AsyncGenerator<string, void, unknown>} 流式响应的异步迭代器
 */
export async function* runAgentStream(message, history = []) {
  // 将历史记录转换为 messages 格式
  const formattedHistory = history.map((h) => ({
    role: h.role,
    content: h.content,
  }));

  // 添加用户的最新消息
  const messages = [...formattedHistory, { role: "user", content: message }];

  try {
    // 使用 agent.stream 进行流式调用
    const stream = await agent.stream({ messages });

    // 遍历流式响应
    for await (const chunk of stream) {
      // 优先处理finalAnswer（这是最干净的结果）
      if (chunk.main?.finalAnswer) {
        const answer = chunk.main.finalAnswer;
        // 将finalAnswer分块发送，实现打字机效果
        for (let i = 0; i < answer.length; i++) {
          // 每个字符单独yield，或者可以调整为每几个字符yield一次
          yield answer[i];
          // 可以添加一个很小的延迟，让打字效果更明显
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        continue; // 处理完毕，继续下一个chunk
      }

      // 统一处理所有可能的messages格式
      let messages = [];
      if (chunk.messages && Array.isArray(chunk.messages)) {
        messages = chunk.messages;
      } else if (chunk.main?.messages && Array.isArray(chunk.main.messages)) {
        messages = chunk.main.messages;
      }

      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (
          lastMessage.role === "assistant" &&
          lastMessage.content &&
          !lastMessage.tool_calls
        ) {
          yield lastMessage.content;
          continue; // 处理完毕，继续下一个chunk
        }
      }

      // 处理直接的助手消息格式（如果前面的条件都不匹配）
      if (chunk.role === "assistant" && chunk.content && !chunk.tool_calls) {
        yield chunk.content;
        continue; // 处理完毕，继续下一个chunk
      }

      // 处理工具调用（可选显示）
      if ((chunk.tool_calls || chunk.main?.tool_calls) && !chunk.content) {
        const toolCalls = chunk.tool_calls || chunk.main.tool_calls;
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
          const toolCall = toolCalls[0];
          if (toolCall.function?.name === "search") {
            // 解析搜索参数
            let searchQuery;
            try {
              const args = JSON.parse(toolCall.function?.arguments || "{}");
              searchQuery = args.query || args.q || "";
            } catch (e) {
              searchQuery = toolCall.function?.arguments || "";
            }
            // 发送搜索状态信息到前端
            yield `[search_status] 正在搜索: ${searchQuery}`;
          } else {
            yield `[工具调用] ${toolCall.function?.name}`;
          }
          continue;
        }
      }
    }
  } catch (error) {
    yield `抱歉，处理您的请求时发生了错误：${error.message}`;
  }
}

/**
 * 运行 Agent，处理用户消息（非流式版本，保持向后兼容）
 * @param {string} message 用户消息
 * @param {Array} history 历史对话记录
 * @returns {Promise<string>} Agent 响应
 */
export async function runAgent(message, history = []) {
  let result = "";
  for await (const chunk of runAgentStream(message, history)) {
    result += chunk;
  }
  return result;
}

// 主交互循环
async function main() {
  console.log("欢迎使用 AI 助手！输入 'quit' 退出。");

  try {
    while (true) {
      const userInput = await rl.question("\n你：");

      if (userInput.toLowerCase() === "quit") {
        break;
      }

      // 更新对话历史
      conversationHistory.push({ role: "user", content: userInput });

      // 限制历史记录数量
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(
          conversationHistory.length - 20
        );
      }

      try {
        // 运行 agent（使用我们已经修复过的runAgent函数）
        const aiResponse = await runAgent(
          userInput,
          conversationHistory.slice(0, -1)
        );

        // 显示AI的回复
        console.log(`\nAI： ${aiResponse}`);

        // 更新对话历史
        conversationHistory.push({
          role: "assistant",
          content: aiResponse,
        });
      } catch (error) {
        const errorMessage = `抱歉，处理请求时发生错误：${error.message}`;
        console.log(`\nAI： ${errorMessage}`);
        conversationHistory.push({
          role: "assistant",
          content: errorMessage,
        });
      }
    }
  } catch (error) {
    console.error("发生未预期的错误：", error);
  }

  rl.close();
  console.log("已退出。");
}

// 仅在直接运行此文件时启动交互式界面，避免被服务器 import 时阻塞
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
