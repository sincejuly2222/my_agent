import { Annotation, InMemoryStore, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";

//需求，让大模型帮我请求给定次数
const store = new InMemoryStore();

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

//定义工具
const fetchTool = tool(
  async ({ url }) => {
    const res = await fetch(url);
    return await res.text();
  },
  {
    name: "fetch",
    description: "从url获取内容",
    schema: z.object({
      url: z.string().describe("要获取内容的url"),
    }),
  },
);

//工具节点
const fetchToolNode = async (state: typeof StateAnnotation.state) => {
  const res = await fetchTool.invoke({ url: state.url });
  console.log(res, "dayin res");
  return {
    times: state.times - 1,
  };
};
