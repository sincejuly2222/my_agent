import "dotenv/config"

import { createAgent } from "langchain"
import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"

const llm = new ChatOpenAI({
    model: process.env.LLM_MODEL!,
    apiKey: process.env. API_KEY!,
    configuration: {
        baseURL: process.env.BASE_URL!
    }
})

const PersonInfo = z.object({
    name: z.string().describe("人物姓名"),
    age: z.number().describe("人物年龄")
})
const agent = createAgent({
    model: llm,
    responseFormat :PersonInfo
})

export const runBasicExample = async ()=>{
    const stream = await agent.stream(
        {
          messages: [{ 
            role: "user", 
            content: "我是合一，我今年18岁" 
        }],
        },
        {
          streamMode: "values",
        },
      );

      for await (const chunk of stream) {
        console.log(chunk, "打印流式数据")
      }
}
