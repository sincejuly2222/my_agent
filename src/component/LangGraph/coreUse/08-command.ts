/**
 * Command 路由与状态更新（Command）
 *
 * 一句话核心定义：
 * Command 让一个节点「返回一段状态更新，并显式指定下一步跳转到哪里」，
 * 一次完成多目标路由 + 状态写入，比条件边更精确。
 *
 * 真实业务场景：
 * 客服工单处理：模型判断「需要同时通知用户并关闭工单」，
 * 用 Command 的 goto 同时跳转到通知节点和关闭节点，并顺手更新工单状态。
 *
 * 新手常见误用：
 * 1. 在普通节点 return 一个对象时误用 Command，导致状态更新不生效；
 * 2. goto 指向不存在的节点名，运行时才报错；
 * 3. 能用品面条件边表达的路由也硬上 Command，代码反而更难读。
 */
import { Annotation, Command, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  ticketStatus: Annotation<string>,
  notified: Annotation<boolean>,
  log: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

function decideNode(state: typeof StateAnnotation.State) {
  // 返回 Command：同时路由到 notify 和 closeTicket，并更新状态
  return new Command({
    goto: ["notify", "closeTicket"],
    update: { ticketStatus: "处理中", log: ["决策：多目标路由"] },
  });
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("decide", decideNode)
  .addNode("notify", (state: typeof StateAnnotation.State) => ({
    notified: true,
    log: ["已通知用户"],
  }))
  .addNode("closeTicket", (state: typeof StateAnnotation.State) => ({
    ticketStatus: "已关闭",
    log: ["工单关闭"],
  }))
  .addEdge(START, "decide")
  .addEdge("notify", END)
  .addEdge("closeTicket", END)
  .compile();

export const runCommandExample = async (): Promise<void> => {
  const res = await graph.invoke({});
  console.log("[command] ticketStatus:", res.ticketStatus);
  console.log("[command] notified:", res.notified);
  console.log("[command] log:", res.log);
};
