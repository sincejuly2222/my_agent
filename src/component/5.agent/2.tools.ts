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

const getWeather = tool((input) => `${input.location}天气很好，是晴天`, {
  name: "get_weather",
  description: "获取给定地点的天气",
  schema: z.object({
    location: z.string().describe("要获取天气的地点"),
  }),
});

const invoke = async () => {
  const agent = createAgent({
    model: llm,
    tools: [getWeather],
  });

  const res = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "请告诉我北京的天气情况",
      },
    ],
  });
  console.log(res, "1111111");
};

export const runBasicExample = () => {
  invoke();
};
