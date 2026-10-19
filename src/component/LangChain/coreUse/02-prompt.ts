/**
 * 提示词模板（Prompt Template）
 *
 * 一句话核心定义：
 * 提示词模板把「固定指令」和「可变数据」分离，用占位符拼装消息序列，
 * 让同一套提示逻辑可以安全地复用于不同输入。
 *
 * 真实业务场景：
 * 跨境电商商品文案系统要为成百上千个 SKU 生成多语言卖点文案——
 * 模板固化品牌语气和输出约束，变量注入「商品名 / 卖点 / 目标语言」，而不是为每个 SKU 手写 prompt。
 *
 * 新手常见误用：
 * 1. 用字符串「+」把用户输入直接拼进 prompt，既容易格式错乱，又给提示注入（prompt injection）留了后门；
 * 2. 把 MessagesPlaceholder 放错位置，导致历史消息与最新问题顺序颠倒；
 * 3. 在模板里硬编码大段示例，应该用 few-shot 模板单独管理示例，让主模板保持干净。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runPromptExample = async (): Promise<void> => {
  const copywriterPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "你是跨境电商文案。语气遵循品牌调性：{tone}。只输出文案，不要解释。",
    ],
    // 历史对话占位：多轮场景下把之前的消息插入到这里
    new MessagesPlaceholder("history"),
    [
      "human",
      "为以下商品写{lang}卖点文案：商品名「{product}」，卖点：{sellingPoints}",
    ],
  ]);

  // 调试时可以先看模板渲染出来的真实消息，确认占位符都被正确填充
  const formatted = await copywriterPrompt.formatMessages({
    tone: "亲切但有高级感",
    lang: "英文",
    product: "便携咖啡手冲壶",
    sellingPoints: "可折叠、食品级不锈钢、30 秒出杯",
    history: [],
  });
  console.log("[formatted]", formatted);

  const chain = copywriterPrompt.pipe(llm);
  const res = await chain.invoke({
    tone: "亲切但有高级感",
    lang: "英文",
    product: "便携咖啡手冲壶",
    sellingPoints: "可折叠、食品级不锈钢、30 秒出杯",
    history: [],
  });
  console.log("[copy]", res.content);
};
