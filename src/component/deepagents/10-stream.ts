/**
 * 流式输出（Streaming）
 *
 * 一句话核心定义：
 * 用 streamMode 选择观察内容——messages 看模型逐 token 输出、updates 看状态变化，
 * deep agents 还额外提供 stream.subagents 拿到每个子任务的独立句柄。
 *
 * 真实业务场景：
 * 前端实时渲染：messages 模式做打字机，updates 模式驱动进度条，
 * subagents 模式展示「每个子任务分别进行到哪了」。
 *
 * 新手常见误用：
 * 1. 只开一个 streamMode 却想同时拿 token 和进度，应传数组一次开多个；
 * 2. 把 messages 模式的 chunk 当字符串，它实际是 [消息, 元数据] 元组；
 * 3. 自定义事件用 console.log 而不是 writer，custom 模式收不到。
 */
import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runStreamExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt: "你是简洁的助手。",
  });

  const stream = await agent.stream(
    { messages: [{ role: "user", content: "用三句话介绍 deepagents。" }] },
    { streamMode: ["messages", "updates"] }
  );

  for await (const [mode, chunk] of stream) {
    if (mode === "messages") {
      const [message] = chunk;
      const text =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      process.stdout.write(text);
    } else {
      console.log("\n[updates]", JSON.stringify(chunk));
    }
  }
  console.log();
};
