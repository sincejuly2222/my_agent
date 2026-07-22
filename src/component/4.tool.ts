import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  ToolMessage,
  tool,
  type AIMessage,
  type BaseMessage,
} from "langchain";
import { z } from "zod/v4";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

// tool() 把普通函数包装成模型可理解、可调用的工具。
// schema 不仅负责运行时校验，也会告诉模型应该生成哪些参数。
const getWeather = tool(
  ({ location }) => `${location}天气很好，晴，气温 26°C。`,
  {
    name: "get_weather",
    description: "查询指定地点当前的天气；当用户询问天气时调用",
    schema: z.object({
      location: z.string().min(1).describe("城市或地区名称，例如：北京"),
    }),
  },
);

const getEmail = tool(
  async ({ from }) => {
    // 实际项目中可以在这里调用邮件服务、数据库或其他外部接口。
    await Promise.resolve();
    return `${from} 发来了一封邮件，主题是「下周项目计划」。`;
  },
  {
    name: "get_email",
    description: "按发件人查询最近收到的邮件；当用户询问邮件时调用",
    schema: z.object({
      from: z.string().min(1).describe("发件人姓名或邮箱地址"),
    }),
  },
);

const tools = [getWeather, getEmail];
const modelWithTools = llm.bindTools(tools);
type ModelToolCall = NonNullable<AIMessage["tool_calls"]>[number];

/** 执行模型生成的一次工具调用，并始终返回 ToolMessage。 */
const executeToolCall = async (toolCall: ModelToolCall): Promise<ToolMessage> => {
  // 按 name 路由到本地函数。传入完整 ToolCall 时，LangChain 会执行
  // schema 校验，并把结果自动包装成带 tool_call_id 的 ToolMessage。
  switch (toolCall.name) {
    case getWeather.name:
      return getWeather.invoke(toolCall);
    case getEmail.name:
      return getEmail.invoke(toolCall);
  }

  if (!toolCall.id) {
    throw new Error(`未知工具 ${toolCall.name}，并且工具调用缺少 id。`);
  }

  return new ToolMessage({
    content: `找不到名为 ${toolCall.name} 的工具。`,
    tool_call_id: toolCall.id,
    status: "error",
  });
};

/**
 * 完整的工具调用循环：
 * 用户问题 -> 模型选择工具 -> 本地执行工具 -> 模型根据结果组织最终答案。
 */
export const runToolExample = async (
  question = "北京天气怎么样？另外帮我看看 Alice 有没有发邮件。",
): Promise<void> => {
  const messages: BaseMessage[] = [new HumanMessage(question)];
  const maxToolRounds = 5;

  for (let round = 0; round < maxToolRounds; round += 1) {
    const aiMessage = await modelWithTools.invoke(messages);
    messages.push(aiMessage);

    const toolCalls = aiMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      console.log("最终回答：", aiMessage.content);
      return;
    }

    console.log(
      "模型请求调用工具：",
      toolCalls.map(({ name, args }) => ({ name, args })),
    );

    // 一次响应可能包含多个互不依赖的工具调用，可以并行执行。
    const toolMessages = await Promise.all(toolCalls.map(executeToolCall));
    messages.push(...toolMessages);

    console.log(
      "工具执行结果：",
      toolMessages.map(({ name, content }) => ({ name, content })),
    );
  }

  throw new Error(`工具调用超过 ${maxToolRounds} 轮，已停止以避免无限循环。`);
};
