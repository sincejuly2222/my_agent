import "dotenv/config";

import { createAgent } from "langchain";

import { ChatOpenAI } from "@langchain/openai";

import fs from "node:fs";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});
const imagePath = path.resolve(process.cwd(), "public/miaoma-logo.png");
const url =
  "data:image/png;base64," + fs.readFileSync(imagePath).toString("base64");

export const runBasicExample = async () => {
  const agent = createAgent({
    model: llm,
  });

  const res = await agent.invoke({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url,
            },
          },
          {
            type: "text",
            text: "Hello, how are you? describe image,get heyi email",
          },
        ],
      },
    ],
  });

  console.log(res, "dayin res");
};
