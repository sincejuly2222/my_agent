/**
 * 工具调用（Tool Calling）
 *
 * 一句话核心定义：
 * 把外部能力（查数据库、调 API、发消息）包装成带 name / description / schema 的工具，
 * 让模型自主决定「何时调用、传什么参数」，再用返回结果继续生成回答。
 *
 * 真实业务场景：
 * 差旅报销助手收到「查一下 10 月 25 日上海飞北京的航班」，
 * 模型判断需要调用航班查询工具，生成结构化参数，拿到结果后再组织成自然语言答复。
 *
 * 新手常见误用：
 * 1. 拿到模型的 tool_calls 后不回填 ToolMessage 就继续对话——模型不知道工具返回了什么，链路断掉；
 * 2. 工具的 description 写得太弱，模型不知道该不该调、参数怎么填；
 * 3. 有副作用的工具（下单、发消息）不做幂等与确认，被模型重复调用造成事故。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { tool, ToolMessage, HumanMessage, type BaseMessage } from "langchain";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

// 模拟外部服务：真实场景这里是调用航司 / OTA 的 API 或查数据库
const searchFlights = tool(
  async ({ from, to, date }) => {
    return JSON.stringify([
      { flightNo: "MU5101", from, to, date, price: 1280 },
      { flightNo: "HO1252", from, to, date, price: 990 },
    ]);
  },
  {
    name: "search_flights",
    description: "查询指定日期两地之间的航班与价格。",
    schema: z.object({
      from: z.string().describe("出发城市"),
      to: z.string().describe("到达城市"),
      date: z.string().describe("出发日期，格式 YYYY-MM-DD"),
    }),
  }
);

const tools = [searchFlights];
const modelWithTools = llm.bindTools(tools);

export const runToolCallingExample = async (): Promise<void> => {
  const messages: BaseMessage[] = [
    new HumanMessage("帮我查 10 月 25 日上海到北京的航班。"),
  ];

  const first = await modelWithTools.invoke(messages);

  // 模型没有选择调用工具时，直接返回答案
  if (!first.tool_calls || first.tool_calls.length === 0) {
    console.log("[direct]", first.content);
    return;
  }

  for (const toolCall of first.tool_calls) {
    const matched = tools.find((t) => t.name === toolCall.name);
    if (!matched) continue;
    const raw = await matched.invoke(toolCall);
    // 关键：把工具结果作为 ToolMessage 回填，模型才知道工具返回了什么
    messages.push(
      new ToolMessage({
        content: String(raw),
        tool_call_id: toolCall.id ?? "unknown",
      })
    );
  }

  const second = await modelWithTools.invoke(messages);
  console.log("[final]", second.content);
};
