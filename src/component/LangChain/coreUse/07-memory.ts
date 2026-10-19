/**
 * 会话记忆（Message History / Memory）
 *
 * 一句话核心定义：
 * 在多次调用之间保存并加载对话历史，让模型「记得」前几轮说过的话，从而完成多轮对话。
 *
 * 真实业务场景：
 * 售后客服多轮会话：用户第一轮报订单号、第二轮描述问题、第三轮补充截图，
 * 模型必须跨轮关联上下文，才能给出连贯的答复。
 *
 * 新手常见误用：
 * 1. 手写数组管理历史，每轮把全部历史无脑拼接，长会话下 token 爆炸——要用 trimMessages 截断；
 * 2. sessionId 直接用用户明文手机号 / 身份证号等敏感信息，埋下隐私与合规隐患；
 * 3. 把记忆只存在内存里，服务重启或横向扩容后用户会话全部丢失——生产环境要接持久化存储。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runMemoryExample = async (): Promise<void> => {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是售后客服。根据与用户的历史对话回答当前问题。"],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);
  const chain = prompt.pipe(llm);

  // 每个 sessionId 一份独立历史；生产环境换成 Redis / 数据库等持久化实现
  const histories = new Map<string, InMemoryChatMessageHistory>();
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: (sessionId) => {
      let history = histories.get(sessionId);
      if (!history) {
        history = new InMemoryChatMessageHistory();
        histories.set(sessionId, history);
      }
      return history;
    },
    inputMessagesKey: "question",
    historyMessagesKey: "history",
  });

  const session = { configurable: { sessionId: "order-20261019-001" } };

  const first = await chainWithHistory.invoke(
    { question: "我的订单号是 A10086，包裹到哪了？" },
    session
  );
  console.log("[第一轮]", first.content);

  // 第二轮省略了订单号，靠历史记忆关联上下文
  const second = await chainWithHistory.invoke(
    { question: "那它什么时候能送到？" },
    session
  );
  console.log("[第二轮]", second.content);
};
