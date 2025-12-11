import { llm as baseLlm } from "./llm.js";
import { searchTool } from "./tools.js";
import { DynamicTool } from "@langchain/core/tools";

// 将工具包装为LangChain DynamicTool格式
const search = new DynamicTool({
  name: "search",
  description: "搜索互联网上的实时信息",
  func: searchTool,
});

// 可用工具列表
export const tools = [search];

// 创建一个新的LLM实例并绑定工具
const llm = baseLlm.bindTools(tools);

// Main节点：处理用户输入并决定是否调用工具
export async function mainNode(state) {
  const { messages } = state;

  // 检查最后一条消息是否已经是AI的回答，如果是，则跳过重复处理
  const lastMessage = messages[messages.length - 1];
  if (
    lastMessage &&
    lastMessage.role === "assistant" &&
    !lastMessage.tool_calls
  ) {
    // 已经有AI的直接回答，无需重复处理
    return {
      ...state,
      finalAnswer: lastMessage.content || "",
    };
  }

  const response = await llm.invoke(messages);

  // 如果有工具调用请求
  if (response.tool_calls && response.tool_calls.length > 0) {
    return {
      ...state,
      messages: [...messages, response],
    };
  }
  // 直接回答
  else {
    let finalAnswer = "";

    if (response.content) {
      finalAnswer = response.content;
    }

    return {
      ...state,
      messages: [...messages, response],
      finalAnswer,
    };
  }
}

// Tool节点：执行工具调用
export async function toolNode(state) {
  const { messages } = state;

  // 获取最后一条消息中的工具调用
  const lastMessage = messages[messages.length - 1];
  const toolCalls = lastMessage.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    return state;
  }

  const toolResults = [];

  // 执行所有工具调用
  for (const toolCall of toolCalls) {
    // 正确解析工具调用信息（注意结构：toolCall.function.name 和 toolCall.function.arguments）
    const toolName = toolCall.function?.name;
    const toolArgsStr = toolCall.function?.arguments;

    // 查找对应的工具
    const tool = tools.find((t) => t.name === toolName);
    if (!tool || !toolName) {
      toolResults.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolName || "unknown",
        content: `Tool "${toolName || "unknown"}" not found.`,
      });
      continue;
    }

    // 执行工具并获取结果
    let toolResult;
    try {
      // 解析参数
      let args;
      try {
        args = JSON.parse(toolArgsStr);
      } catch (parseError) {
        // 如果解析失败，尝试直接使用原始字符串
        args = toolArgsStr;
      }

      console.log(`[${toolName}工具] 执行调用，参数:`, args);

      // 根据工具类型决定如何调用
      if (toolName === "search") {
        // 对于搜索工具，如果参数是对象，提取query字段
        const searchQuery =
          typeof args === "object" && args.query ? args.query : args;
        console.log(`[${toolName}工具] 提取的查询词:`, searchQuery);
        toolResult = await tool.invoke(searchQuery);
      } else {
        // 其他工具直接传递参数
        toolResult = await tool.invoke(args);
      }

      console.log(`[${toolName}工具结果]`, toolResult);
    } catch (error) {
      console.error(`[${toolName}工具错误]`, error);
      toolResult = `工具调用失败: ${error.message}`;
    }

    // 格式化工具结果
    toolResults.push({
      tool_call_id: toolCall.id,
      role: "tool",
      name: toolName,
      content: toolResult,
    });
  }

  return {
    ...state,
    messages: [...messages, ...toolResults],
  };
}

// 决定是否需要调用工具的条件函数
export function shouldUseTools(state) {
  const { messages } = state;
  if (!messages || messages.length === 0) {
    return false;
  }
  const lastMessage = messages[messages.length - 1];

  // 确保最后一条消息是AI助手的回复，且包含有效的工具调用
  return !!(
    lastMessage &&
    lastMessage.role === "assistant" &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0 &&
    // 检查是否有至少一个工具调用的工具存在于工具列表中
    lastMessage.tool_calls.some(
      (toolCall) =>
        toolCall.function?.name &&
        tools.find((t) => t.name === toolCall.function.name)
    )
  );
}
