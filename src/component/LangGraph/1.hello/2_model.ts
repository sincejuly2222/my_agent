import { tools } from "./1_tools.js"
import { ChatOpenAI } from "@langchain/openai"

const apiKey = process.env.API_KEY

if (!apiKey) {
    throw new Error("Missing API_KEY. Add it to the project .env file.")
}

const llm = new ChatOpenAI({
    model: process.env.LLM_MODEL!,
    apiKey,
    configuration: {
        baseURL: process.env.BASE_URL
    }
})

export const modelWithTools = llm.bindTools(tools)
