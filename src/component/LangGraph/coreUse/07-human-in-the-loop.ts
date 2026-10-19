/**
 * 人机协作中断（Human-in-the-loop / interrupt）
 *
 * 一句话核心定义：
 * 节点里调用 interrupt 会暂停整张图并把控制权交还外部，
 * 等人工用 Command({ resume }) 传入决定后再从暂停处继续执行。
 *
 * 真实业务场景：
 * 退款审批：金额超过 5000 元时暂停，等待人工「同意/拒绝」，
 * 人工决策后图继续走最终处理节点，高风险操作必须有人把关。
 *
 * 新手常见误用：
 * 1. 图没挂 checkpointer 就调用 interrupt，直接报「缺 checkpointer」；
 * 2. 用 try/catch 把 interrupt 抛出的 GraphInterrupt 吞掉，导致恢复逻辑错乱；
 * 3. 恢复时忘记传同一个 thread_id，等于在另一个会话里盲目 resume。
 */
import {
  Annotation,
  Command,
  interrupt,
  MemorySaver,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  refundAmount: Annotation<number>,
  approved: Annotation<boolean>,
  decision: Annotation<string>,
});

async function reviewNode(state: typeof StateAnnotation.State) {
  if (state.refundAmount > 5000) {
    // 暂停并把审批请求交给外部；恢复时拿到人工返回的 { approved }
    const approval = interrupt<{ message: string }, { approved: boolean }>({
      message: `退款 ${state.refundAmount} 元需要人工审批`,
    });
    return { approved: approval.approved };
  }
  return { approved: true };
}

function finalizeNode(state: typeof StateAnnotation.State) {
  return { decision: state.approved ? "退款通过" : "退款拒绝" };
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("review", reviewNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "review")
  .addEdge("review", "finalize")
  .addEdge("finalize", END)
  .compile({ checkpointer: new MemorySaver() });

export const runHilExample = async (): Promise<void> => {
  const config = { configurable: { thread_id: "refund-001" } };

  // 第一次运行：在 review 节点触发 interrupt 暂停
  const paused = await graph.invoke({ refundAmount: 8000 }, config);
  console.log("[hitl] 暂停状态:", paused);

  // 人工审批通过后，用 Command({ resume }) 继续执行
  const resumed = await graph.invoke(
    new Command({ resume: { approved: true } }),
    config
  );
  console.log("[hitl] 继续后结果:", resumed);
};
