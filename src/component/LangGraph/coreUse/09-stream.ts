/**
 * 流式输出（Streaming）
 *
 * 一句话核心定义：
 * 用 streamMode 选择要观察的内容——updates 看每个节点的状态变化、
 * messages 看模型逐 token 输出、custom 看节点用 writer 主动推送的自定义事件。
 *
 * 真实业务场景：
 * 前端实时渲染：messages 模式做打字机效果，updates 模式驱动进度条，
 * custom 模式推送「正在检索/正在生成」这类业务状态给用户。
 *
 * 新手常见误用：
 * 1. 只用一个 streamMode，却想同时拿到 token 和节点进度——需要传数组一次性开启多个模式；
 * 2. 把 messages 模式的 chunk 直接当字符串用，它实际是 [消息, 元数据] 元组；
 * 3. 自定义事件用 console.log 而不是 writer，custom 模式永远收不到。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, StateGraph, START, END, writer } from "@langchain/langgraph";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  text: Annotation<string>,
});

async function generateNode(state: typeof StateAnnotation.State) {
  let full = "";
  const stream = await llm.stream(`用一句话介绍${state.topic}（30 字以内）。`);
  for await (const chunk of stream) {
    if (typeof chunk.content === "string") {
      full += chunk.content;
      // 主动推送自定义事件，供 streamMode: "custom" 消费
      writer({ token: chunk.content });
    }
  }
  return { text: full };
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("generate", generateNode)
  .addEdge(START, "generate")
  .addEdge("generate", END)
  .compile();

export const runStreamExample = async (): Promise<void> => {
  const stream = await graph.stream(
    { topic: "LangGraph" },
    { streamMode: ["updates", "messages", "custom"] }
  );

  for await (const [mode, chunk] of stream) {
    if (mode === "custom") {
      console.log("[custom]", JSON.stringify(chunk));
    } else if (mode === "updates") {
      console.log("[updates]", JSON.stringify(chunk));
    } else {
      console.log("[messages]", JSON.stringify(chunk));
    }
  }
};
