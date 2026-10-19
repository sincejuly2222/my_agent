/**
 * 文件权限（Permissions）
 *
 * 一句话核心定义：
 * 用声明式规则（operations / paths / allow / deny）限制 agent 能读写哪些路径，
 * 规则按声明顺序匹配、先命中先生效。
 *
 * 真实业务场景：
 * 代码 agent 只能读写 /workspace/，禁止触碰 .env、密钥文件和系统目录，
 * 防止模型越权读取敏感信息或误删配置。
 *
 * 新手常见误用：
 * 1. 默认是「宽松」策略，不配规则等于全放开；
 * 2. 规则顺序写反——deny 被前面的 allow 抢先命中，形同虚设；
 * 3. 忘了子 agent 会继承父级权限，给高权限 agent 派生了越权的子 agent。
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

export const runPermissionsExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt: "你是代码助手。",
    backend: new FilesystemBackend({
      rootDir: path.resolve(import.meta.dirname, "workspace"),
    }),
    permissions: [
      { operations: ["write"], paths: ["/workspace/**"] },
      { operations: ["read"], paths: ["/**"] },
      { operations: ["read"], paths: ["/secrets/**"], mode: "deny" },
    ],
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "在 workspace 下创建 hello.ts，内容是一句问候。",
      },
    ],
  });
  console.log(
    "[permissions]",
    result.messages[result.messages.length - 1]?.content
  );
};
