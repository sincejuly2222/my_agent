import "dotenv/config";

import { createAgent, SystemMessage, HumanMessage } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

export const runBasicExample = async () => {
  const agent = createAgent({
    model: llm,
  });

  const res = await agent.invoke({
    messages: [
      new SystemMessage(
        "你是一位耐心的前端开发导师，擅长使用类比解释技术概念。",
      ),
      new HumanMessage("你好，请介绍一下你自己。"),
    ],
  });

  console.log(res, "1111111");
};
