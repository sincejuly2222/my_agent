import "dotenv/config";
import { agent } from "./agent.js";

export const invoke = async()=>{
     const res = await agent.invoke({ topic: 'cats' })
     console.log(res.combinedOutput,"1111111111111111111")
}
