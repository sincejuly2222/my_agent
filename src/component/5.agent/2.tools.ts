import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { tool, createAgent } from "langchain";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

const getWeather = tool(
  async (input) => {
    return `${input.location}天气很好，是晴天`;
  },
  {
    name: "get_weather",
    description: "获取给定地点的天气",
    schema: z.object({
      location: z.string().describe("要获取天气的地点"),
    }),
  },
);

const getEmail = tool(
  async (input) => {
    return `已经发送邮件给${input.from} `;
  },
  {
    name: "get_email",
    description: "发送邮件",
    schema: z.object({
      from: z.string().describe("邮件的收件人"),
    }),
  },
);

export const runBasicExample = async () => {
  const agent = createAgent({
    model: llm,
    tools: [getWeather, getEmail],
  });

  const res = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "请获取北京的天气情况,然后天气情况发送邮件给小明",
      },
    ],
  });
  console.log(res, "1111111");
};
