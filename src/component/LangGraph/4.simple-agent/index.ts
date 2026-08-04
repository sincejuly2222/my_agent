import "dotenv/config";

import { agent } from "./agent.js";

export const invoke = async () => {
  // const messages = [
  //     {
  //         role: 'user',
  //         content: 'Add 3 and 4.'
  //     }
  // ]
  const result = await agent.invoke({
    messages: [],
    times: 3,
    url: "https://www.miaomaedu.com",
  });
  console.log(result,"Result:");
};
