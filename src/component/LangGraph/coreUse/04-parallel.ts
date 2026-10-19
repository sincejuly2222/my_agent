/**
 * 动态并行（Send / map-reduce）
 *
 * 一句话核心定义：
 * 用 Send 从条件边里动态派发「同一节点、不同数据」的多个任务并行执行，
 * 结果通过 reducer 聚合回主状态，实现 map-reduce 式的动态 fan-out / fan-in。
 *
 * 真实业务场景：
 * 舆情监控系统收到一批客户评论，数量不固定：对每条评论 fan-out 到同一个「分析」节点并行处理，
 * 全部完成后统一汇总成一份舆情报告。
 *
 * 新手常见误用：
 * 1. 用固定三个节点模拟「并行」，数据条数一变就失效——动态并行应改用 Send；
 * 2. 聚合字段没配追加式 reducer，并发结果互相覆盖，最后只剩一条；
 * 3. 在 Send 的任务里写共享外部状态（全局变量），并发执行时出现竞态。
 */
import { Annotation, Send, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  reviews: Annotation<string[]>,
  analyses: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

// 动态 fan-out：每条评论派发一个 Send 到 analyzeOne
function fanOut(state: typeof StateAnnotation.State) {
  return state.reviews.map(
    (review) => new Send("analyzeOne", { reviews: [review] })
  );
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("analyzeOne", (state: typeof StateAnnotation.State) => ({
    analyses: [`${state.reviews[0] ?? "未知评论"} → 负面，涉及物流`],
  }))
  .addNode("summarize", (state: typeof StateAnnotation.State) => ({
    analyses: [`汇总：共分析 ${state.analyses.length} 条评论`],
  }))
  .addConditionalEdges(START, fanOut)
  .addEdge("analyzeOne", "summarize")
  .addEdge("summarize", END)
  .compile();

export const runParallelExample = async (): Promise<void> => {
  const res = await graph.invoke({
    reviews: [
      "物流太慢，等了十天。",
      "包装破损，客服不回。",
      "尺码偏小，建议买大一码。",
    ],
  });
  console.log("[parallel]", res.analyses);
};
