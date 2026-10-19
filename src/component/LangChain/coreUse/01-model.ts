/**
 * 模型调用（Model I/O）
 *
 * 一句话核心定义：
 * LangChain 把「调用大模型」统一成三种接口——invoke（一次性）、stream（逐 token 流式）、
 * batch（并发批量），并把 system / human / ai / tool 等不同角色建模成 Message 对象，而不是裸字符串。
 *
 * 真实业务场景：
 * 电商客服工单系统每天夜里要对当天产生的大量买家差评做「情绪 + 问题分类」，
 * 离线批处理用 batch 并发跑；白天实时对话用 stream 做打字机式回复，降低用户等待焦虑。
 *
 * 新手常见误用：
 * 1. 把系统提示和用户输入用字符串「+」拼进同一个 user 消息，而不是拆成 SystemMessage / HumanMessage；
 * 2. 在 for 循环里一个个 await invoke，而不是用 batch 并发（慢，且容易撞上服务端限流）；
 * 3. 直接假设 res.content 一定是 string——多模态或部分模型返回的是 ContentBlock 数组。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "langchain";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runModelIoExample = async (): Promise<void> => {
  // 1) invoke：一次调用，适合简单问答 / 分类 / 抽取
  const single = await llm.invoke([
    new SystemMessage("你是电商客服质检员，回答要简短。"),
    new HumanMessage("这条差评的情绪是什么：衣服洗一次就起球了，太失望。"),
  ]);
  console.log("[invoke]", single.content);

  // 2) stream：逐 token 输出，适合前端打字机 / 长文生成
  const stream = await llm.stream("用三句话介绍跨境物流的清关流程。");
  for await (const chunk of stream) {
    process.stdout.write(
      typeof chunk.content === "string"
        ? chunk.content
        : JSON.stringify(chunk.content)
    );
  }
  console.log();

  // 3) batch：并发批量，适合离线批处理
  const reviews = [
    "物流太慢，等了十天。",
    "客服态度很差，半天不回。",
    "尺码偏小，建议买大一码。",
  ];
  const batch = await llm.batch(
    reviews.map((review) => [
      new SystemMessage("把这条差评分类为：物流 / 服务 / 商品，只输出一个词。"),
      new HumanMessage(review),
    ])
  );
  console.log("[batch]", batch.map((msg) => msg.content));
};
