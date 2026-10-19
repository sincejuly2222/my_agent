/**
 * 图、节点与边（StateGraph / Node / Edge）
 *
 * 一句话核心定义：
 * 图由「节点（处理逻辑）」和「边（执行顺序）」组成，START 标记入口、END 标记出口，
 * LangGraph 按边的连接自动调度节点执行。
 *
 * 真实业务场景：
 * 电商下单流程：订单校验 → 风控检查 → 创建订单，每一步是一个节点，
 * 数据通过共享状态在节点间传递，而不是靠函数层层 return。
 *
 * 新手常见误用：
 * 1. 忘记把最后一步连到 END，图永远不结束；
 * 2. 节点函数直接修改入参 state 而不是「返回要更新的字段」，导致状态根本没被写入；
 * 3. 在节点里做与状态无关的耗时操作（比如写库），却不知道节点返回值才是图与外界沟通的唯一方式。
 */
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  orderId: Annotation<string>,
  riskScore: Annotation<number>,
  orderStatus: Annotation<string>,
});

export const graph = new StateGraph(StateAnnotation)
  .addNode("validateOrder", (state: typeof StateAnnotation.State) => ({
    orderStatus: "已校验",
  }))
  .addNode("riskCheck", (state: typeof StateAnnotation.State) => ({
    riskScore: 23,
  }))
  .addNode("placeOrder", (state: typeof StateAnnotation.State) => ({
    orderStatus: "已下单",
  }))
  .addEdge(START, "validateOrder")
  .addEdge("validateOrder", "riskCheck")
  .addEdge("riskCheck", "placeOrder")
  .addEdge("placeOrder", END)
  .compile();

export const runGraphFlowExample = async (): Promise<void> => {
  const res = await graph.invoke({ orderId: "SO-20261019-001" });
  console.log("[graph-flow]", res);
};
