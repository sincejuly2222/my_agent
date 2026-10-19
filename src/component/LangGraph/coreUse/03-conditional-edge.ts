/**
 * 条件边路由（Conditional Edges）
 *
 * 一句话核心定义：
 * addConditionalEdges 根据节点的当前状态值动态决定「下一步去哪个节点」，
 * 让图具备分支能力，而不是一条路走到底。
 *
 * 真实业务场景：
 * 退款审核流程：金额小于 200 自动通过，金额超过 5000 或账号过新转人工复核，
 * 其余情况自动拒绝——同一张图按输入数据走出完全不同的路径。
 *
 * 新手常见误用：
 * 1. 路由函数返回的字符串与路由映射表的 key 对不上，节点永远走不到；
 * 2. 在路由函数里做网络请求 / 模型调用，条件边本应是一个「纯函数」；
 * 3. 分支忘了各自连到 END，只给其中一条写了出口，造成悬空节点。
 */
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  refundAmount: Annotation<number>,
  accountAgeDays: Annotation<number>,
  decision: Annotation<string>,
});

function routeRefund(state: typeof StateAnnotation.State) {
  if (state.refundAmount > 5000 || state.accountAgeDays < 30) {
    return "manualReview";
  }
  if (state.refundAmount <= 200) {
    return "autoApprove";
  }
  return "autoReject";
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("autoApprove", (state: typeof StateAnnotation.State) => ({
    decision: "自动通过",
  }))
  .addNode("manualReview", (state: typeof StateAnnotation.State) => ({
    decision: "转人工复核",
  }))
  .addNode("autoReject", (state: typeof StateAnnotation.State) => ({
    decision: "自动拒绝",
  }))
  .addConditionalEdges(START, routeRefund, {
    autoApprove: "autoApprove",
    manualReview: "manualReview",
    autoReject: "autoReject",
  })
  .addEdge("autoApprove", END)
  .addEdge("manualReview", END)
  .addEdge("autoReject", END)
  .compile();

export const runConditionalEdgeExample = async (): Promise<void> => {
  const lowRisk = await graph.invoke({
    refundAmount: 80,
    accountAgeDays: 365,
  });
  console.log("[conditional] 小额老账号:", lowRisk.decision);

  const highRisk = await graph.invoke({
    refundAmount: 8000,
    accountAgeDays: 365,
  });
  console.log("[conditional] 大额退款:", highRisk.decision);
};
