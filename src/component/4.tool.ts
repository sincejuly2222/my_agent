import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
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

const tools = [getWeather];
const modelWithTools = llm.bindTools(tools);

export const runToolExample = async () => {
  const res = await modelWithTools.invoke("请帮我获取北京的天气");
  console.log(res, "1111111111");

  if (res.tool_calls) {
    // Handle tool calls
    for (const toolCall of res.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const toolResult = await tool.invoke(toolCall);
        console.log(`Tool ${tool.name} returned:`, toolResult);
      } else {
        console.error(`Tool ${toolCall.name} not found.`);
      }
    }
  }
};
