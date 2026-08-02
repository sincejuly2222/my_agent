import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

//图状态
const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  joke: Annotation<string>,
  finalJoke: Annotation<string>,
  improvedJoke: Annotation<string>,
});

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

//生成初始笑话
async function generateJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`请生成一个关于${state.topic}的笑话`);
  return {
    joke: msg.content,
  };
}

//通过llm 改进笑话
async function improveJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`使这个笑话更有兴趣，${state.joke}`);
  return {
    improvedJoke: msg.content,
  };
}

async function polishJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(
    `添加一个历史典故到这个笑话，${state.improvedJoke}`,
  );
  return {
    finalJoke: msg.content,
  };
}

//检查笑话是否有好玩的点
function checkPunchline(state: typeof StateAnnotation.State) {
  // 同时识别英文和中文的问号、感叹号。
  if (/[?!？！]/.test(state.joke)) {
    return "pass";
  }
  return "fail";
}

export const agent = new StateGraph(StateAnnotation)
  .addNode("generateJoke", generateJoke)
  .addNode("improveJoke", improveJoke)
  .addNode("polishJoke", polishJoke)
  .addEdge("__start__", "generateJoke")
  .addConditionalEdges("generateJoke", checkPunchline, {
    pass: "improveJoke",
    fail: "__end__",
  })
  .addEdge("improveJoke", "polishJoke")
  .addEdge("polishJoke", "__end__")
  .compile();
