/**
 * 创建与调用（createDeepAgent）
 *
 * 一句话核心定义：
 * createDeepAgent 一次调用就把「文件系统、摘要、子智能体、人工审批」等能力装配好，
 * 返回一个开箱即用的深度 agent，只需传入模型、工具和系统提示。
 *
 * 真实业务场景：
 * 电商客服助手需要查订单、写处理记录、必要时转人工——用 createDeepAgent 一行装配，
 * 不用再从零拼工具循环。
 *
 * 新手常见误用：
 * 1. 忘记 await——createDeepAgent 是异步函数，不 await 拿到的是 Promise；
 * 2. 把「模型支持 tool calling」当成可选项，深度 agent 强依赖工具调用；
 * 3. 以为传了 tools 就会移除内置文件工具，实际只是追加，内置文件系统默认都在。
 */
import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const getOrderStatus = tool(
  async ({ orderId }) => `订单 ${orderId} 已发货，预计明天送达。`,
  {
    name: "get_order_status",
    description: "查询订单的物流状态",
    schema: z.object({ orderId: z.string().describe("订单号") }),
  }
);

export const runCreateAgentExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    tools: [getOrderStatus],
    systemPrompt: "你是电商客服助手。",
  });

  const result = await agent.invoke({
    messages: [
      { role: "user", content: "帮我查一下订单 A10086 的物流状态。" },
    ],
  });

  console.log(
    "[create-agent]",
    result.messages[result.messages.length - 1]?.content
  );
};
