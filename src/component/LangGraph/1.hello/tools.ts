import { tool } from "langchain";
import z  from "zod";

//定义工具
const  add = tool(async({a,b})=>{
    return a + b
},
{
    name:"add",
    description:"计算俩个数的和",
    schema: z.object({
        a: z.number().describe("其中一个数"),
        b: z.number().describe("其中第二个数")
    })
})