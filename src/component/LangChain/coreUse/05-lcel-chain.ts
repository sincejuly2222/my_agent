/**
 * LCEL 链式组合（LangChain Expression Language）
 *
 * 一句话核心定义：
 * 用「|」管道把 prompt → model → parser 等 Runnable 串成一条可复用、可流式、可追踪的链，
 * 并可用 RunnableParallel 并行执行多个分支。
 *
 * 真实业务场景：
 * 用户反馈分析流水线：一条原始评论进来，同时并行做「情感判断」和「关键词提取」，
 * 最终汇总成结构化结果，而不是串行调两次模型。
 *
 * 新手常见误用：
 * 1. 在链中间塞 RunnableLambda 做本应由输出解析器负责的清洗、格式转换；
 * 2. 需要「保留输入 + 增加字段」时不知道用 RunnablePassthrough.assign，导致中间结果丢失；
 * 3. 用 RunnableBranch 硬写复杂路由，分支一多就失控——这种场景应交给 LangGraph 的状态机。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableParallel } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const reviewSchema = z.object({
  sentiment: z.enum(["正面", "负面", "中性"]).describe("评论情感"),
  reasons: z.array(z.string()).describe("判断依据"),
});

export const runLcelExample = async (): Promise<void> => {
  // 1) 顺序链：prompt -> model -> JSON 解析器，直接产出结构化对象
  const analyzeChain = ChatPromptTemplate.fromMessages([
    ["system", "你是电商评论分析师，只输出 JSON。"],
    ["human", "评论：{review}"],
  ])
    .pipe(llm)
    .pipe(new JsonOutputParser<z.infer<typeof reviewSchema>>());

  // 2) 并行链：同一条输入，两个分支并发调用模型
  const parallelChain = RunnableParallel.from({
    sentiment: ChatPromptTemplate.fromMessages([
      ["system", "判断评论情感：正面 / 负面 / 中性，只输出一个词。"],
      ["human", "{review}"],
    ]).pipe(llm),
    keywords: ChatPromptTemplate.fromMessages([
      ["system", "提取评论关键词，用顿号分隔，只输出关键词。"],
      ["human", "{review}"],
    ]).pipe(llm),
  });

  const review = "物流很快，但包装破损，客服处理及时。";

  const structured = await analyzeChain.invoke({ review });
  console.log("[sequence]", structured);

  const parallel = await parallelChain.invoke({ review });
  console.log("[parallel]");
  console.log("  情感:", parallel.sentiment.content);
  console.log("  关键词:", parallel.keywords.content);
};
