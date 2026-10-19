/**
 * 模型调用（Model I/O）
 *
 * 一句话核心定义：
 * LangChain 把「调用大模型」统一成三种接口——invoke（一次性）、stream（分块流式）、
 * batch（并发批量），并把 system / human / ai / tool 等不同角色建模成 Message 对象，而不是裸字符串。
 *
 * 真实业务场景：
 * 电商客服工单系统每天夜里要对当天产生的大量买家差评做「情绪 + 问题分类」，
 * 离线批处理用 batch 并发跑；白天实时对话用 stream 做打字机式回复，降低用户等待焦虑。
 *
 * 新手常见误用：
 * 1. 把系统提示和用户输入用字符串「+」拼进同一个 user 消息，而不是拆成 SystemMessage / HumanMessage；
 * 2. 用串行循环处理独立任务，或直接无限并发；独立任务用 batch 并限制并发，依赖上一步的任务仍需串行；
 * 3. 直接假设 res.content 一定是 string——多模态或部分模型返回的是 ContentBlock 数组。
 * 4. 把 stream 的 chunk 当成完整回答或单个 token；chunk 是增量块，可能没有文本；
 * 5. 以为 TypeScript 的 ! 会验证环境变量，或 batch 一条失败就丢掉其他结果。
 *
 * 运行：项目根目录 pnpm build && pnpm start；也支持在 dist 下 node index.js。
 * 根目录 .env 配置 API_KEY、LLM_MODEL；BASE_URL 为可选的兼容服务地址。
 * 本例会发起真实模型请求并可能产生费用。batch 是客户端并发调用，并非服务商的离线 Batch API。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessageChunk } from "@langchain/core/messages";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runModelIoExample = async (): Promise<void> => {
  // 1) invoke：一次调用，适合简单问答 / 分类 / 抽取
  // 误用：把规则和用户数据拼成一条字符串。正确：用角色区分职责。
  // 角色分离有助于表达指令层级，但不能保证防住提示注入。
  const single = await llm.invoke([
    new SystemMessage("你是电商客服质检员，回答要简短。"),
    new HumanMessage("这条差评的情绪是什么：衣服洗一次就起球了，太失望。"),
  ]);
  // text 会提取文本块；需要图片、工具调用等信息时应检查 content / tool_calls。
  // 不要用 String(content) 或把整个数组 JSON 化后当成用户可读的回答。
  console.log("[invoke]", single.text || "（模型未返回文本，请检查 content）");
  if (single.usage_metadata) console.log("[usage]", single.usage_metadata);

  // 2) stream：分块输出。chunk 不保证等于一个 token，也可能只携带元数据。
  // 使用 concat 汇总完整消息，保留文本之外的元数据，而不是只保存最后一个 chunk。
  let fullMessage: AIMessageChunk | undefined;
  try {
    const stream = await llm.stream([
      new SystemMessage("你是跨境电商客服，回答简短、清晰。"),
      new HumanMessage("用三句话介绍跨境物流的清关流程。"),
    ]);
    process.stdout.write("[stream] ");
    for await (const chunk of stream) {
      fullMessage = fullMessage ? fullMessage.concat(chunk) : chunk;
      if (chunk.text) process.stdout.write(chunk.text);
    }
  } catch (error) {
    // 流开始之后也可能断开；已输出内容属于部分结果，不能当成成功回答。
    console.error("\n[stream] 流式调用失败，已输出内容可能不完整。累计文本长度：", fullMessage?.text.length ?? 0);
    throw error;
  } finally {
    console.log();
  }
  console.log("[stream 完整文本]", fullMessage?.text || "（无文本）");

  // 3) batch：独立任务限制并发，避免无限 Promise.all 请求导致限流。
  // maxConcurrency 是同时在途的请求数，不是每分钟配额；仍需遵守服务商限额。
  const reviews = [
    "物流太慢，等了十天。",
    "客服态度很差，半天不回。",
    "尺码偏小，建议买大一码。",
  ];
  const results = await llm.batch(
    reviews.map((review) => [
      new SystemMessage("把这条差评分类为：物流 / 服务 / 商品，只输出一个词。"),
      new HumanMessage(review),
    ]),
    { maxConcurrency: 2 },
    { returnExceptions: true }
  );
  // 结果与输入顺序一致，不按完成先后排序；单条异常不会丢掉其他成功结果。
  // 提示词不能保证分类合法，因此对输出再做校验；复杂结构可用 withStructuredOutput。
  const categories = new Set(["物流", "服务", "商品"]);
  let failed = 0;
  results.forEach((result, index) => {
    const review = reviews[index];
    if (result instanceof Error) {
      failed++;
      console.error("[batch 失败]", { review, error: result.message });
      return;
    }
    const category = result.text.trim();
    if (!categories.has(category)) {
      failed++;
      console.error("[batch 待复核]", { review, output: category });
      return;
    }
    console.log("[batch 成功]", { review, category });
  });
  if (failed > 0) throw new Error(`批量任务有 ${failed} 条失败或输出不符合分类要求，请按日志复核。`);
};
