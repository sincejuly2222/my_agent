/**
 * 状态定义（State / Annotation）
 *
 * 一句话核心定义：
 * 状态是贯穿整张图的「共享数据容器」，每个节点读取它、返回部分更新，
 * 由 reducer 决定这些更新如何合并（覆盖还是追加）。
 *
 * 真实业务场景：
 * 多轮客服机器人把「消息列表」作为状态：模型节点追加新消息、工具节点追加工具结果，
 * 任何节点都能读到完整上下文，消息只增不覆盖。
 *
 * 新手常见误用：
 * 1. 列表类字段不用 reducer 而用默认的覆盖语义，并行节点互相把对方的结果冲掉；
 * 2. 状态里塞进不可序列化的对象（数据库连接、函数），一启用持久化/断点续跑就报错；
 * 3. 字段既需要默认值又忘记写 default，首次运行时拿到 undefined 引发隐性 bug。
 */
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  // 覆盖式：后写入的覆盖先前的（默认语义）
  summary: Annotation<string>,
  // 追加式：reducer 把新旧内容拼接起来
  report: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

export const graph = new StateGraph(StateAnnotation)
  .addNode("collectA", (state: typeof StateAnnotation.State) => ({
    report: ["指标A已采集"],
  }))
  .addNode("collectB", (state: typeof StateAnnotation.State) => ({
    report: ["指标B已采集"],
    summary: "采集完成",
  }))
  .addEdge(START, "collectA")
  .addEdge("collectA", "collectB")
  .addEdge("collectB", END)
  .compile();

export const runStateExample = async (): Promise<void> => {
  const res = await graph.invoke({ report: [] });
  // report 是追加式：两个节点写入的两条都被保留
  console.log("[state] report:", res.report);
  console.log("[state] summary:", res.summary);
};
