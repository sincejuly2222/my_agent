import "dotenv/config";
import { ChatOpenAI, } from "@langchain/openai";
import { HumanMessage, SystemMessage } from 'langchain';

const API_URL = process.env.BASE_URL!;
const API_KEY = process.env.API_KEY!;
// async function chat(content: string): Promise<any> {
//   const res = await fetch(`${API_URL}/v1/chat/completions`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${API_KEY}`,
//     },
//     body: JSON.stringify({
//       model: process.env.LLM_MODEL!,
//       messages: [{ role: "user", content: content }],
//     }),
//   });

//   const data = await res.json();
//   return data;
// }
const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

export const runBasicExample = async (): Promise<void> => {
  const res = await llm.invoke([
    new SystemMessage('你是一位耐心的前端开发导师，擅长使用类比解释技术概念。'),
    new HumanMessage('你好，请介绍一下你自己。')
  ]);

  console.log(res,"1111111");

  // const res = await chat("你好，请介绍一下你自己。");
  // const message = res.choices[0]?.message;
  // console.log(message, "111111111111111111111111111111111111111111111111111111");
  // console.log("回答：", message?.content);
  // console.log("推理：", message?.reasoning_content);
};
