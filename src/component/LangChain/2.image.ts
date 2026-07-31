import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "langchain";
import fs from "node:fs";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

export const runImageExample = async (myImgSrc: string): Promise<void> => {
  const imagePath = path.resolve(process.cwd(), myImgSrc);
  const url =
    "data:image/png;base64," + fs.readFileSync(imagePath).toString("base64");
  const res = await llm.invoke([
    new HumanMessage([
      {
        type: "image_url",
        image_url: {
          url: url,
        },
      },
      {
        type: "text",
        text: "请问这张图片里有什么？",
      },
    ]),
  ]);
  console.log(res.content, "111111111");

  console.log("回答：", res.content);
  console.log("推理：", res.additional_kwargs.reasoning_content);
};
