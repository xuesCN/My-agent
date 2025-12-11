import { tavily } from "@tavily/core";
import dotenv from "dotenv";

dotenv.config();

let tavilyClient;

function getTavilyClient() {
  if (tavilyClient) return tavilyClient;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY 未配置，无法使用搜索工具");
  }

  tavilyClient = tavily({ apiKey });
  return tavilyClient;
}

// 搜索工具
export async function searchTool(query) {
  try {
    // 处理不同的参数格式
    let searchQuery;
    if (typeof query === "object" && query !== null) {
      // 如果是对象，尝试获取 query 字段
      searchQuery = query.query || query.q || JSON.stringify(query);
    } else {
      // 如果是字符串，直接使用
      searchQuery = query;
    }

    // 添加输入验证
    if (
      !searchQuery ||
      typeof searchQuery !== "string" ||
      searchQuery.trim() === ""
    ) {
      return "搜索失败：请提供有效的搜索关键词";
    }

    console.log(`[搜索工具] 正在搜索: ${searchQuery}`);
    const res = await getTavilyClient().search(searchQuery, {
      includeAnswer: "advanced",
    });

    // 提取并格式化搜索结果
    const summary = res.answer || "未找到相关摘要信息";
    const results = res.results || [];

    // 构建更详细的结果
    let formattedResults = `搜索结果摘要：${summary}\n\n`;

    if (results.length > 0) {
      formattedResults += "相关资源：\n";
      results.slice(0, 3).forEach((item, index) => {
        formattedResults += `${index + 1}. 标题：${item.title || "无标题"}\n`;
        formattedResults += `   URL：${item.url || "无URL"}\n`;
        if (item.snippet) {
          formattedResults += `   摘要：${item.snippet}\n`;
        }
        formattedResults += "\n";
      });
    } else {
      formattedResults += "未找到相关搜索结果";
    }

    return formattedResults;
  } catch (error) {
    console.error("搜索工具错误:", error);
    return `搜索失败：${error.message || "未知错误"}`;
  }
}
