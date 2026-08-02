import { task } from "@langchain/langgraph";
import type { ToolCall } from "@langchain/core/messages/tool";
import { toolsByName } from "./1_tools.js";

export const callTool = task({ name: "callTool" }, async (toolCall: ToolCall) => {
  const tool = toolsByName[toolCall.name as keyof typeof toolsByName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  return await tool.invoke(toolCall);
});
