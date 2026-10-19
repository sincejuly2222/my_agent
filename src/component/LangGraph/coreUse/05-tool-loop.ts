/**
 * Agent 工具循环（Model ↔ Tool Loop）
 *
 * 一句话核心定义：
 * 模型节点决定是否调用工具，工具节点执行并回填结果，两者通过条件边形成循环，
 * 直到模型不再调用工具或达到次数上限。
 *
 * 真实业务场景：
 * 运维值班助手收到告警：模型先调用「查询告警详情」工具，拿到结果后判断是否继续查询，
 * 循环结束给出定位结论，并用次数上限防止死循环。
 *
 * 新手常见误用：
 * 1. 没有次数/超时上限，模型反复调用同一个工具形成死循环，账单爆炸；
 * 2. 工具结果不回填成 ToolMessage，模型看不到工具输出，循环空转；
 * 3. 在工具节点里直接调用模型，破坏「模型节点 ↔ 工具节点」的单一职责划分。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { tool } from "langchain";
import { z } from "zod";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  remainingAttempts: Annotation<number>,
});

const queryAlert = tool(
  async ({ alertId }) => {
    // 真实场景：调用告警平台 / 监控系统 API
    return `告警 ${alertId}：payment-service QPS 超阈值，错误率 12%。`;
  },
  {
    name: "query_alert",
    description: "查询告警详情",
    schema: z.object({
      alertId: z.string().describe("告警 ID"),
    }),
  }
);

const toolsByName = { [queryAlert.name]: queryAlert };
const modelWithTools = llm.bindTools([queryAlert]);

async function modelNode(state: typeof StateAnnotation.State) {
  const res = await modelWithTools.invoke([
    new SystemMessage(
      "你是运维助手，用工具查询告警详情，查完给出结论，不要重复调用同一工具。"
    ),
    ...state.messages,
  ]);
  return { messages: [res] };
}

async function toolNode(state: typeof StateAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  const toolMessages: ToolMessage[] = [];
  for (const toolCall of last.tool_calls ?? []) {
    const matched = toolsByName[toolCall.name as keyof typeof toolsByName];
    if (matched) {
      toolMessages.push(
        new ToolMessage({
          content: String(await matched.invoke(toolCall)),
          tool_call_id: toolCall.id ?? "unknown",
        })
      );
    }
  }
  return {
    messages: toolMessages,
    remainingAttempts: state.remainingAttempts - 1,
  };
}

function route(state: typeof StateAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  if (last.tool_calls?.length && state.remainingAttempts > 0) {
    return "tools";
  }
  return END;
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("model", modelNode)
  .addNode("tools", toolNode)
  .addEdge(START, "model")
  .addConditionalEdges("model", route, { tools: "tools", [END]: END })
  .addEdge("tools", "model")
  .compile();

export const runToolLoopExample = async (): Promise<void> => {
  const res = await graph.invoke({
    messages: [
      new HumanMessage("payment-service 的告警 ID 是 123，帮我查一下并给结论。"),
    ],
    remainingAttempts: 4,
  });
  console.log("[tool-loop]", res.messages[res.messages.length - 1]);
};
