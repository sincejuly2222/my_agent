import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";




const llm = new ChatOpenAI({
    model: process.env.LLM_MODEL!,
    apiKey: process.env.API_KEY!,
    configuration: {            
        baseURL: process.env.BASE_URL!,
    }
})

const PersonInfo = z.object({
    dom: z.object().describe("描述dom的json")
})

const agent = createAgent({
    model: llm,
    tools: [],
    responseFormat: PersonInfo,
})

const imagePath = path.resolve(process.cwd(), "public/miaoma-logo.png");
const url =
  "data:image/png;base64," + fs.readFileSync(imagePath).toString("base64");
export const runBasicExample = async () => {
    const res = await agent.invoke({
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url
                        }
                    },
                    {
                        type: "text",
                        text: "帮我看看图片里面有什么，请使用中文描述，我现在想要基于这个图片开发 HTML，你给我一个符合 HTML DOM 格式"
                    }
                ]
            },
        ],
    })
    console.log(res, "1111111");
}