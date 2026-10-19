/**
 * 长期记忆（Memory / AGENTS.md）
 *
 * 一句话核心定义：
 * memory 在每次启动时加载 AGENTS.md 文件，把品牌语气、项目规范、用户偏好等
 * 长期稳定的上下文注入系统提示，跨会话保持一致。
 *
 * 真实业务场景：
 * 客服 agent 用 AGENTS.md 记住「先致歉、再给方案、最后确认」的回复规范
 * 和品牌语气，换了 100 个会话也不用每次重申。
 *
 * 新手常见误用：
 * 1. 把会频繁变化的内容（订单号、当前活动）写进 memory，既占上下文又过时；
 * 2. 以为 memory 会自动更新——它只是启动时加载，不是长期数据库；
 * 3. 路径写错导致文件静默加载失败，agent 行为悄悄变味。
 */
import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runMemoryExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt: "你是电商客服助手。",
    memory: [path.resolve(import.meta.dirname, "AGENTS.md")],
  });

  const result = await agent.invoke({
    messages: [
      { role: "user", content: "用户说你们的包裹又发错货了，怎么回？" },
    ],
  });
  console.log("[memory]", result.messages[result.messages.length - 1]?.content);
};
