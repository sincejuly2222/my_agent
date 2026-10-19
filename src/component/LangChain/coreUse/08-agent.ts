/**
 * Agent（智能体）
 *
 * 一句话核心定义：
 * createAgent 把「模型 + 工具 + 系统提示 + 中间件」组合成一个能自主规划、多步调用工具、
 * 直至完成目标的智能体。
 *
 * 真实业务场景：
 * 运维值班助手收到「支付服务 QPS 突然飙升」的告警后，
 * 自主决定先查监控指标、再看错误日志，最后给出定位结论和处理建议，而不是每步都要人喂。
 *
 * 新手常见误用：
 * 1. 把一整个复杂业务全塞进单个巨型 agent，缺少状态编排——这种场景应交给 LangGraph；
 * 2. 工具缺 schema / 描述，模型不知道该不该调、参数怎么填，乱调一通；
 * 3. 不设工具调用次数上限、超时或人工确认，agent 陷入死循环或执行了不可逆操作。
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

const queryMetric = tool(
  async ({ service, metric }) => {
    // 真实场景：调用 Prometheus / Grafana 的 API
    return `${service} 的 ${metric} 当前为 98%，较基线上升 42%。`;
  },
  {
    name: "query_metric",
    description: "查询指定服务的监控指标。",
    schema: z.object({
      service: z.string().describe("服务名，如 payment-service"),
      metric: z.string().describe("指标名，如 qps、error_rate、p99_latency"),
    }),
  }
);

const fetchLogs = tool(
  async ({ service, minutes }) => {
    // 真实场景：从日志平台拉取最近 N 分钟的 error 日志
    return `${service} 最近 ${minutes} 分钟出现大量 "connection timeout" 错误，集中在调用订单下游。`;
  },
  {
    name: "fetch_logs",
    description: "拉取指定服务最近若干分钟的错误日志摘要。",
    schema: z.object({
      service: z.string().describe("服务名"),
      minutes: z.number().int().positive().describe("时间窗口，单位分钟"),
    }),
  }
);

export const runAgentExample = async (): Promise<void> => {
  const agent = createAgent({
    model: llm,
    tools: [queryMetric, fetchLogs],
    systemPrompt:
      "你是运维值班助手。收到告警后先查指标、再看日志，最后给出定位结论和处理建议。",
  });

  const stream = await agent.stream(
    {
      messages: [
        { role: "user", content: "支付服务 QPS 突然飙升，帮我定位一下。" },
      ],
    },
    { streamMode: ["messages", "updates"] }
  );

  for await (const [mode, chunk] of stream) {
    if (mode === "messages") {
      // messages 模式下的 chunk 是 [消息, 元数据] 元组
      const [message] = chunk;
      const text =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      console.log("[msg]", text);
    } else {
      console.log("[update]", JSON.stringify(chunk, null, 2));
    }
  }
};
