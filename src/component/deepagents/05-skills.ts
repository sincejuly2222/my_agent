/**
 * 技能（Skills / SKILL.md）
 *
 * 一句话核心定义：
 * 技能是按 SKILL.md 组织的专业知识包，agent 启动时只读元信息（name/description），
 * 需要时才加载正文，用「渐进披露」在省钱和懂行之间取平衡。
 *
 * 真实业务场景：
 * 客服 agent 内置「退款政策」「物流查询」「发票开具」等多个技能，
 * 用户问到退款时才加载退款技能正文，而不是把所有手册一次性塞进上下文。
 *
 * 新手常见误用：
 * 1. 把技能当成「永远加载的说明文档」，丢掉了渐进披露省 token 的核心价值；
 * 2. SKILL.md 的 description 写得太泛，模型判断不出何时该加载；
 * 3. 技能路径与 backend 根目录对不上，导致技能静默加载失败。
 */
import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runSkillsExample = async (): Promise<void> => {
  // rootDir 指向本目录，skills 在 skills/ 子目录下，路径相对 backend 根
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt: "你是电商客服助手，按需加载技能回答问题。",
    backend: new FilesystemBackend({
      rootDir: path.resolve(import.meta.dirname),
    }),
    skills: ["/skills/"],
  });

  const result = await agent.invoke({
    messages: [
      { role: "user", content: "我刚买的衣服想退货，你们退款政策是什么？" },
    ],
  });
  console.log("[skills]", result.messages[result.messages.length - 1]?.content);
};
