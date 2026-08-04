import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";
import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";

// 需求：让大模型帮我请求给定次数
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  url: Annotation<string>,
  times: Annotation<number>,
});

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

// 定义工具
const fetchTool = tool(
  async ({ url }) => {
    const res = await fetch(url);
    return await res.text();
  },
  {
    name: "fetch",
    description: "从url获取内容",
    schema: z.object({
      url: z.string().describe("要获取内容的url"),
    }),
  },
);

// 绑定工具到 LLM，让模型能决定调用 fetch 工具
const llmWithTools = llm.bindTools([fetchTool]);

// 模型节点：LLM 接收指令，决定是否调用工具
async function modelNode(state: typeof StateAnnotation.State) {
  const response = await llmWithTools.invoke([
    new HumanMessage(
      `请使用fetch工具获取 ${state.url} 的内容。还剩 ${state.times} 次请求。`,
    ),
  ]);
  return { messages: [response] };
}

// 工具节点：执行 LLM 请求的工具调用
const fetchToolNode = async (state: typeof StateAnnotation.State) => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls ?? [];

  const toolMessages: ToolMessage[] = [];
  for (const toolCall of toolCalls) {
    if (toolCall.name === "fetch" && toolCall.id) {
      const result = await fetchTool.invoke(toolCall);
      console.log(result, "fetch 结果");
      toolMessages.push(
        new ToolMessage({
          content:
            typeof result === "string" ? result : JSON.stringify(result),
          tool_call_id: toolCall.id,
        }),
      );
    }
  }

  return {
    messages: toolMessages,
    times: state.times - 1,
  };
};

// 判断节点：检查是否有待执行的工具调用，且次数未用完
const shouldContinue = (state: typeof StateAnnotation.State) => {
  console.log(`🚀 ~ shouldContinue ~ state.times`, state.times);
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // 如果模型调用了工具且还有剩余次数，进入工具节点
  if (lastMessage.tool_calls?.length && state.times > 0) {
    return "fetchTool";
  }
  return "__end__";
};

// 定义 agent 图
export const agent = new StateGraph(StateAnnotation)
  .addNode("modelNode", modelNode)
  .addNode("fetchTool", fetchToolNode)
  .addEdge("__start__", "modelNode")
  .addConditionalEdges("modelNode", shouldContinue, {
    fetchTool: "fetchTool",
    __end__: "__end__",
  })
  .addEdge("fetchTool", "modelNode")
  .compile();

