import "dotenv/config"

import { ChatOpenAI } from "@langchain/openai"
import { createAgent, tool } from "langchain"
import { z } from "zod"

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration:{
    baseURL: process.env.BASE_URL!
  }
})

const getWeater = tool(async(input)=>{
  return `${input.location},天气超级炎热，最高气温达到了39摄氏度`
},
{
  name:"get_weater",
  description: "获取给定地点的天气",
  schema: z.object().describe("要获取天气的地点")
})

const Info = z.object({
  name: z.string().describe("框架名称"),
  detail: z.string().describe("框架介绍"),
  location: z.string().describe("获取天气的地点"),
  weather: z.string().describe("天气情况")
})

const agent = createAgent({
  model: llm,
  tools:[getWeater],
  responseFormat : Info
})

export const runBasicExample = async()=>{
  const res = await agent.stream(
    {
      messages: [
        {
          role: "user",
          content: "请介绍一下 LangChain,然后获取一下今天北京和太原的天气"
        }
      ]
    },
    //组合模式
    {
      streamMode: ["messages", "updates", "custom"]
    }
  )

  for await (const [mode, chunk] of res) {
    switch (mode) {
      case "messages":
        console.log("===== Token =====")
        console.log(chunk)
        break
      case "updates":
        console.log("===== Agent 更新 =====")
        console.log(chunk)
        break
      case "custom":
        console.log("===== Tool 自定义信息 =====")
        console.log(chunk)
        break
    }
  }
}

// 待学习  agent可视化工具：
// https://smith.langchain.com/o/a4cb7cb7-b84d-4fe7-922e-4ffc3439b8b3/projects/p/9dab313f-d9a1-4c89-ae32-53701437641b?onboarding=my_agent&timeModel=%7B%22duration%22%3A%221d%22%7D