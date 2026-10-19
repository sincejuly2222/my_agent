/**
 * 子智能体委派（Subagents）
 *
 * 一句话核心定义：
 * 主 agent 用内置的 task 工具把复杂子任务委派给隔离上下文的子 agent，
 * 子 agent 独立完成后只把最终结论交还，主 agent 的上下文不被中间过程污染。
 *
 * 真实业务场景：
 * 竞品分析 agent 收到「分析 A、B、C 三家竞品」时，
 * 为每家竞品 spawn 一个专门做市场调研的子 agent，最后合并成对比报告。
 *
 * 新手常见误用：
 * 1. 把子 agent 当普通函数用，期望它能多轮来回——子 agent 是「一次性交报告」的；
 * 2. 子 agent 默认隔离上下文，忘了它看不到主对话，导致它反复问已知信息；
 * 3. 不限制子 agent 的工具/权限，子任务权限反而比主 agent 还大。
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

const getProductPrice = tool(
  async ({ product }) => `「${product}」官方售价 1299 元，近期最低 1099 元。`,
  {
    name: "get_product_price",
    description: "查询商品价格",
    schema: z.object({ product: z.string().describe("商品名") }),
  }
);

export const runSubagentsExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    tools: [getProductPrice],
    systemPrompt: "你是采购比价助手。",
    subagents: [
      {
        name: "price-analyst",
        description: "专门调查并汇总某件商品的市面价格。",
        systemPrompt: "你是价格分析师，调查给定商品的价格并给出结论。",
        tools: [getProductPrice],
      },
    ],
  });

  const result = await agent.invoke({
    messages: [
      { role: "user", content: "帮我调研一下「便携咖啡手冲壶」的价格。" },
    ],
  });
  console.log(
    "[subagents]",
    result.messages[result.messages.length - 1]?.content
  );
};
