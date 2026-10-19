/**
 * 断点持久化（Checkpointer / thread_id）
 *
 * 一句话核心定义：
 * 给图挂上 checkpointer 后，每次执行结束的状态会被保存，
 * 用 thread_id 标识会话，即可跨多次调用恢复状态、实现多轮对话与断点续跑。
 *
 * 真实业务场景：
 * 售后客服机器人按 thread_id 隔离不同用户：同一用户连续追问时状态自动累积，
 * 服务重启后还能从上次的 checkpoint 继续，而不是重新开始。
 *
 * 新手常见误用：
 * 1. 忘记传 configurable.thread_id，不同调用被当成同一会话，状态串了；
 * 2. 用 MemorySaver 上生产——内存存储在重启/扩容后全丢，应换数据库等持久化实现；
 * 3. 以为 invoke 会「自动续聊」，实际必须显式带同一个 thread_id 才会复用历史状态。
 */
import {
  Annotation,
  MemorySaver,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

async function echoNode(state: typeof StateAnnotation.State) {
  const last = state.messages[state.messages.length - 1];
  const text =
    last && typeof last.content === "string" ? last.content : "（无内容）";
  return {
    messages: [
      new AIMessage(`已记录：${text}（本会话第 ${state.messages.length} 条）`),
    ],
  };
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("echo", echoNode)
  .addEdge(START, "echo")
  .addEdge("echo", END)
  .compile({ checkpointer: new MemorySaver() });

export const runCheckpointExample = async (): Promise<void> => {
  const config = { configurable: { thread_id: "support-10086" } };

  await graph.invoke(
    { messages: [new HumanMessage("我的订单到哪了？")] },
    config
  );
  await graph.invoke(
    { messages: [new HumanMessage("那它什么时候能送到？")] },
    config
  );

  const state = await graph.getState(config);
  console.log("[checkpoint] 持久化的消息数:", state.values.messages.length);

  // 另一个 thread_id 是全新会话，互不影响
  const otherState = await graph.getState({
    configurable: { thread_id: "support-20000" },
  });
  console.log("[checkpoint] 新会话消息数:", otherState.values.messages.length);
};
