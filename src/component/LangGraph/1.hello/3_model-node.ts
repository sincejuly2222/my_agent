import { task } from "@langchain/langgraph";
import { BaseMessage, SystemMessage } from "langchain";
import { modelWithTools } from "./2_model.js";

export const callLLM = task(
  { name: "callLLM" },
  async (messages: BaseMessage[]) => {
    return await modelWithTools.invoke([
      new SystemMessage("你负责使用提供的工具完成算术运算，并给出最终答案。"),
      ...messages,
    ]);
  },
);
