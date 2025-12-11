import { StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { mainNode, toolNode, shouldUseTools } from "./nodes.js";

// 定义 AgentState 类型 - 简化版本，不再需要状态码
const AgentState = z.object({
  messages: z.array(
    z.object({
      role: z.string(),
      content: z.string(),
      // 支持工具调用相关字段
      tool_calls: z.array(z.any()).optional(),
      tool_call_id: z.string().optional(),
      name: z.string().optional(),
    })
  ),
  finalAnswer: z.string().optional(),
});

// 创建 StateGraph
const workflow = new StateGraph(AgentState)
  // 添加节点
  .addNode("main", mainNode)
  .addNode("tool", toolNode)
  // 设置入口点
  .addEdge("__start__", "main")
  // 添加条件边：如果需要工具调用则执行tool节点，否则结束
  .addConditionalEdges("main", shouldUseTools, {
    true: "tool",
    false: "__end__",
  })
  // 从工具节点返回main节点，让LLM处理工具结果
  .addEdge("tool", "main");

// 编译 workflow
export const agent = workflow.compile();
