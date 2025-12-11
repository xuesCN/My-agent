import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.ARK_API_KEY;
if (!apiKey) {
  throw new Error("缺少 ARK_API_KEY，无法调用模型");
}

const model = process.env.ARK_MODEL_ID || "doubao-seed-1-6-251015";
const baseURL =
  process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";

// 使用原始OpenAI SDK
const openai = new OpenAI({
  apiKey,
  baseURL,
});

// 创建一个适配器，将原始OpenAI SDK包装成LangChain需要的接口
export const llm = {
  async invoke(messages, options = {}) {
    // 转换消息格式
    const formattedMessages = messages.map((msg) => {
      const formattedMsg = {
        role: msg.role,
        content: msg.content,
      };

      // 保留工具调用信息
      if (msg.tool_calls) {
        formattedMsg.tool_calls = msg.tool_calls;
      }

      // 保留工具调用结果的tool_call_id
      if (msg.role === "tool" && msg.tool_call_id) {
        formattedMsg.tool_call_id = msg.tool_call_id;
      }

      return formattedMsg;
    });

    // 构建请求参数
    const requestParams = {
      model,
      messages: formattedMessages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
    };

    // 只有当工具存在时才添加工具参数
    if (options.tools && options.tools.length > 0) {
      // 转换工具格式为豆包API期望的格式
      requestParams.tools = options.tools.map((tool) => ({
        // 确保工具包含type参数（豆包API要求）
        type: "function",
        // 确保工具包含function参数
        function: {
          name: tool.name || tool.function?.name || "",
          description: tool.description || tool.function?.description || "",
          parameters: tool.parameters || tool.function?.parameters || {},
        },
      }));

      if (options.toolChoice) {
        requestParams.tool_choice = options.toolChoice;
      }
    }

    // 发送请求
    const response = await openai.chat.completions.create(requestParams);

    return {
      content: response.choices[0].message.content,
      role: "assistant",
      tool_calls: response.choices[0].message.tool_calls,
    };
  },

  async stream(messages, options = {}) {
    // 转换消息格式
    const formattedMessages = messages.map((msg) => {
      const formattedMsg = {
        role: msg.role,
        content: msg.content,
      };

      // 保留工具调用信息
      if (msg.tool_calls) {
        formattedMsg.tool_calls = msg.tool_calls;
      }

      // 保留工具调用结果的tool_call_id
      if (msg.role === "tool" && msg.tool_call_id) {
        formattedMsg.tool_call_id = msg.tool_call_id;
      }

      return formattedMsg;
    });

    // 构建请求参数
    const requestParams = {
      model,
      messages: formattedMessages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: true, // 启用流式传输
    };

    // 只有当工具存在时才添加工具参数
    if (options.tools && options.tools.length > 0) {
      // 转换工具格式为豆包API期望的格式
      requestParams.tools = options.tools.map((tool) => ({
        // 确保工具包含type参数（豆包API要求）
        type: "function",
        // 确保工具包含function参数
        function: {
          name: tool.name || tool.function?.name || "",
          description: tool.description || tool.function?.description || "",
          parameters: tool.parameters || tool.function?.parameters || {},
        },
      }));

      if (options.toolChoice) {
        requestParams.tool_choice = options.toolChoice;
      }
    }

    // 发送流式请求
    const response = await openai.chat.completions.create(requestParams);

    // 返回异步迭代器
    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of response) {
          // 处理工具调用情况
          if (chunk.choices[0].delta.tool_calls) {
            yield {
              role: "assistant",
              tool_calls: chunk.choices[0].delta.tool_calls,
              content: "",
            };
          }
          // 处理普通文本响应
          else if (chunk.choices[0].delta.content) {
            yield {
              role: "assistant",
              content: chunk.choices[0].delta.content,
            };
          }
        }
      },
    };
  },

  bindTools(tools) {
    // 包装工具绑定功能，保存原始llm对象的引用
    const self = this;
    return {
      async invoke(messages, options = {}) {
        return self.invoke(messages, { ...options, tools: tools });
      },

      async stream(messages, options = {}) {
        return self.stream(messages, { ...options, tools: tools });
      },

      // 确保bindTools方法在新对象上也可用
      bindTools(newTools) {
        return self.bindTools(newTools);
      },
    };
  },
};
