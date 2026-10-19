/**
 * 检索增强生成（Retrieval-Augmented Generation，RAG）
 *
 * 一句话核心定义：
 * 先把问题在外部知识库里检索出最相关的片段，再把片段作为上下文交给模型作答，
 * 解决私有知识、时效性和「幻觉」问题。
 *
 * 真实业务场景：
 * 公司内部知识库问答（HR 制度、运维手册、产品文档），
 * 用户问「年假怎么申请」时，先从制度文档里检索相关条款，再基于条款回答，而不是让模型瞎编。
 *
 * 新手常见误用：
 * 1. 把整本手册塞进上下文，超过模型上下文窗口或浪费 token——要先分块、再检索；
 * 2. 检索出的片段不放进 prompt 就直接让模型回答，等于没做 RAG；
 * 3. 文档不分块、不标元数据（来源、章节），检索结果无法溯源，排障困难。
 *
 * 注意：本示例用 OpenAIEmbeddings 做向量检索，要求 BASE_URL 指向的服务支持 embedding 接口；
 * 生产环境请用 pgvector、Chroma 等真正的向量库，并预先把文档向量算好，不要每次现算。
 */
import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseRetriever } from "@langchain/core/retrievers";
import type { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "langchain";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const bi = b[i] ?? 0;
    dot += a[i]! * bi;
    normA += a[i]! * a[i]!;
    normB += bi * bi;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// 一个最小的内存向量检索器：生产环境请替换为真实向量库
class InMemoryCosineRetriever extends BaseRetriever {
  lc_namespace = ["coreUse", "rag"];

  constructor(
    private readonly embeddings: OpenAIEmbeddings,
    private readonly docVectors: number[][],
    private readonly docs: Document[]
  ) {
    super();
  }

  async _getRelevantDocuments(
    query: string,
    _callbacks?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const queryVector = await this.embeddings.embedQuery(query);
    return this.docs
      .map((doc, i) => ({
        doc,
        score: cosineSimilarity(queryVector, this.docVectors[i] ?? []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.doc);
  }
}

async function buildKnowledgeBase(): Promise<InMemoryCosineRetriever> {
  const docs = [
    new Document({
      pageContent:
        "员工年假：入职满一年后每年享有 5 天年假，需提前 3 个工作日在 OA 系统提交申请，由直属主管审批。",
      metadata: { source: "hr-请假制度.md" },
    }),
    new Document({
      pageContent:
        "病假：员工因病无法出勤时，应于当日上午 9 点前通知直属主管，并在返岗后 48 小时内补交医院证明。",
      metadata: { source: "hr-请假制度.md" },
    }),
    new Document({
      pageContent:
        "报销流程：差旅费用在出差结束后 30 天内提交报销单，并附发票原件，财务审核周期为 5 个工作日。",
      metadata: { source: "finance-报销制度.md" },
    }),
  ];

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.API_KEY!,
    configuration: { baseURL: process.env.BASE_URL! },
  });
  const docVectors = await embeddings.embedDocuments(
    docs.map((doc) => doc.pageContent)
  );
  return new InMemoryCosineRetriever(embeddings, docVectors, docs);
}

export const runRagExample = async (): Promise<void> => {
  const retriever = await buildKnowledgeBase();
  const question = "年假怎么申请？";

  const docs = await retriever.invoke(question);
  const context = docs.map((doc) => doc.pageContent).join("\n---\n");

  const ragChain = ChatPromptTemplate.fromMessages([
    [
      "system",
      "你是公司内部知识库助手。只根据以下资料回答，资料没有的内容就明说不知道，不要编造。\n\n资料：\n{context}",
    ],
    ["human", "{question}"],
  ]).pipe(llm);

  const res = await ragChain.invoke({ context, question });
  console.log("[retrieved docs]", docs.map((doc) => doc.metadata.source));
  console.log("[rag answer]", res.content);
};
