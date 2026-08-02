import "dotenv/config";

import { HumanMessage } from "langchain";
import { agent } from "./agent.js";

export const invoke = async () => {
  for await (const [mode, chunk] of await agent.stream(
    [new HumanMessage("Add 3 and 4.")],
    { streamMode: ["updates", "custom"] },
  )) {
    for (const value of Object.values(chunk)) {
      const messages = Array.isArray(value) ? value : [value];
      for (const message of messages) {
        if (message?.content) {
          console.log(`[${mode}-${message.type}]: ${message.content}\n`);
        }
      }
    }
  }
};
