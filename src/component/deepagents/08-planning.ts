/**
 * 任务规划（Planning / todoListMiddleware）
 *
 * 一句话核心定义：
 * todoListMiddleware 给 agent 增加一个 write_todos 工具，让它维护带状态的任务清单，
 * 把「长任务拆成可追踪的步骤」变成 agent 自己的行为。
 *
 * 真实业务场景：
 * 发布上线的 agent 把「跑测试 → 构建镜像 → 灰度发布 → 验证」写进 todo，
 * 前端还能实时读到 todo 状态驱动进度条。
 *
 * 新手常见误用：
 * 1. 所有任务都开 todo，短问答也强制规划，徒增 token 和延迟；
 * 2. 把 todo 当成强约束，以为模型一定会按清单执行——它只是「提醒」，不是硬性编排；
 * 3. 忘了 todo 状态在 agent state 里，不配 checkpointer 时跨调用不会保留。
 */
import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { todoListMiddleware, type AgentMiddleware } from "langchain";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runPlanningExample = async (): Promise<void> => {
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt: "你是发布上线助手，复杂任务先规划再执行。",
    // todoListMiddleware 的类型与 deepagents 的 middleware 泛型尚未完全对齐，
    // 在 exactOptionalPropertyTypes 下需做一次断言；运行期行为不受影响。
    middleware: [todoListMiddleware() as unknown as AgentMiddleware],
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "帮我规划一次「跑测试 → 构建 → 灰度发布」的上线流程。",
      },
    ],
  });

  console.log(
    "[planning]",
    result.messages[result.messages.length - 1]?.content
  );
  // todos 由 middleware 注入到 agent state，因断言未并入返回类型，这里显式取出
  const todos = (result as { todos?: unknown }).todos;
  console.log("[planning] todos:", JSON.stringify(todos ?? null));
};
