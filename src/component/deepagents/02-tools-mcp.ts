/**
 * 自定义工具与 MCP（Tools / MCP）
 *
 * 一句话核心定义：
 * 通过 tools 参数接入业务能力（自定义函数或 MCP 服务器暴露的工具），
 * 模型根据工具的 name / description / schema 自主决定何时调用。
 *
 * 真实业务场景：
 * 会员服务助手用自定义工具查会员档案，用 MCP 连接 CRM / 数据库，
 * 把「查资料」这类能力标准化成模型可调用的接口。
 *
 * 新手常见误用：
 * 1. 工具的 description 写得含糊，模型不知道该不该调、参数怎么填；
 * 2. 有副作用工具（下单、发消息）不做幂等与审批，被模型重复调用；
 * 3. MCP 服务器工具名冲突时不加前缀/过滤，主 agent 的工具表一团乱。
 */
import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { tool } from "langchain";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const lookupCustomer = tool(
  async ({ phone }) => `会员 ${phone}：金卡，近 90 天下单 12 次。`,
  {
    name: "lookup_customer",
    description: "根据手机号查询会员信息",
    schema: z.object({ phone: z.string().describe("会员手机号") }),
  }
);

export const runToolsExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    tools: [lookupCustomer],
    systemPrompt: "你是会员服务助手。",
  });

  const result = await agent.invoke({
    messages: [
      { role: "user", content: "查一下 13800138000 这个会员的信息。" },
    ],
  });
  console.log("[tools]", result.messages[result.messages.length - 1]?.content);
};

// MCP：把外部 MCP 服务器暴露的工具直接喂给 deep agent（需要本地运行 MCP 服务器）
export const runMcpExample = async (): Promise<void> => {
  const client = new MultiServerMCPClient({
    crm: { transport: "http", url: "http://localhost:8000/mcp" },
  });
  const mcpTools = await client.getTools();

  const agent = await createDeepAgent({
    model: llm,
    tools: mcpTools,
    systemPrompt: "你是会员服务助手，可使用 CRM 工具。",
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "查一下会员 13800138000 的积分。" }],
  });
  console.log("[mcp]", result.messages[result.messages.length - 1]?.content);
};
