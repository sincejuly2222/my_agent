import { addMessages, entrypoint } from "@langchain/langgraph";
import { type BaseMessage } from "@langchain/core/messages";
import { callLLM } from "./3_model-node.js";
import { callTool } from "./4_tool-node.js";

export const agent: ReturnType<
  typeof entrypoint<BaseMessage[], Promise<BaseMessage[]>>
> = entrypoint({ name: "agent" }, async (messages: BaseMessage[]) => {
  let modelResponse = await callLLM(messages);

  while (modelResponse.tool_calls?.length) {
    messages = addMessages(messages, [modelResponse]);

    const toolResults = await Promise.all(
      modelResponse.tool_calls.map((toolCall) => callTool(toolCall)),
    );

    messages = addMessages(messages, toolResults);
    modelResponse = await callLLM(messages);
  }

  return addMessages(messages, [modelResponse]);
});
