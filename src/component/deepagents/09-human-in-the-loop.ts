/**
 * 人工审批（Human-in-the-loop / interruptOn）
 *
 * 一句话核心定义：
 * interruptOn 指定在哪些工具调用前暂停，把「是否继续、怎么改」交给人工，
 * 审批通过后再用 Command({ resume }) 恢复执行。
 *
 * 真实业务场景：
 * 代码 agent 每次 edit_file 前都暂停，让人先批准修改，
 * 防止 agent 未经确认就批量改坏仓库。
 *
 * 新手常见误用：
 * 1. 配了 interruptOn 却不挂 checkpointer，运行时直接报缺检查点；
 * 2. 对所有工具都加审批，把 agent 卡成半自动，体验和效率都崩；
 * 3. 恢复时忘了传同一个 thread_id，等于在别的会话里盲目 resume。
 */
import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver, Command } from "@langchain/langgraph";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runHitlExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt: "你是代码助手。",
    backend: new FilesystemBackend({
      rootDir: path.resolve(import.meta.dirname, "workspace"),
    }),
    checkpointer: new MemorySaver(),
    // 每次 edit_file 前暂停，等人工批准
    interruptOn: { edit_file: true },
  });

  const config = { configurable: { thread_id: "code-agent-001" } };

  // 第一次运行：会在 edit_file 前暂停，等待人工审批
  const paused = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: "修改 workspace/app.ts，把日志级别改成 debug。",
        },
      ],
    },
    config
  );
  console.log("[hitl] 已暂停，等待审批。");

  // 人工批准后恢复执行（resume 的具体取值取决于工具与配置）
  const resumed = await agent.invoke(new Command({ resume: "approve" }), config);
  console.log(
    "[hitl] 恢复后：",
    resumed.messages[resumed.messages.length - 1]?.content
  );
};
