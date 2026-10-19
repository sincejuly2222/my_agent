/**
 * 结构化输出（Structured Output）
 *
 * 一句话核心定义：
 * 用 zod schema 约束模型的输出结构，让模型直接返回可校验、可落库的类型化对象，
 * 而不是一段需要自己二次解析的文本。
 *
 * 真实业务场景：
 * 招聘系统批量解析候选人简历：把「姓名 / 工作年限 / 技能 / 最近公司」抽取成结构化字段入库，
 * 后续检索、筛选、报表都建立在稳定的数据结构上。
 *
 * 新手常见误用：
 * 1. 只在 prompt 里写「请返回 JSON」，再自己 JSON.parse——模型偶尔会夹带解释文字或 Markdown 代码围栏，解析直接炸；
 * 2. zod schema 与 prompt 里描述的结构不一致，模型无所适从；
 * 3. 字段不给 describe 或可选性（nullable / optional）标错，导致抽取结果字段缺失或强行编造。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const resumeSchema = z.object({
  name: z.string().describe("候选人姓名"),
  yearsOfExperience: z.number().int().min(0).describe("工作年限，整数"),
  skills: z.array(z.string()).describe("技能列表"),
  latestCompany: z.string().nullable().describe("最近一家公司，没有则返回 null"),
});

export const runStructuredOutputExample = async (): Promise<void> => {
  const structuredLlm = llm.withStructuredOutput(resumeSchema);

  const res = await structuredLlm.invoke(
    "张三，8 年经验，曾在字节跳动做后端开发，精通 Go 和 Kubernetes。"
  );
  // res 已经是类型化对象，可直接落库，无需手动 JSON.parse
  console.log("[structured]", res);
};
