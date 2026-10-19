# LangChain 核心使用方法（coreUse）

本目录把 LangChain 的核心能力按「模型 I/O → 提示词 → 结构化输出 → 工具 → 链 → 检索 → 记忆 → Agent」这条主线拆成独立文件，每个文件都遵循同一种讲法：

1. **一句话核心定义** —— 先讲清这个概念到底是什么；
2. **真实业务场景举例** —— 用生产环境里会遇到的例子，而不是「计数器」这类玩具；
3. **新手常见误用方式** —— 踩坑点，提前避开。

## 文件地图

| 文件 | 核心概念 | 一句话说明 |
| --- | --- | --- |
| `index.ts` | Agent 最小示例 | 用 `createAgent()` 跑通一个最简 agent（既有入口示例） |
| `01-model.ts` | 模型调用（Model I/O） | `invoke` / `stream` / `batch` 三种调用方式与消息对象 |
| `02-prompt.ts` | 提示词模板 | 用模板把固定指令与可变数据分离 |
| `03-structured-output.ts` | 结构化输出 | 用 zod schema 约束模型返回可落库的类型化对象 |
| `04-tool-calling.ts` | 工具调用 | 把外部能力包装成工具，模型自主决定调用并回填结果 |
| `05-lcel-chain.ts` | LCEL 链式组合 | 用 `|` 管道把 prompt → model → parser 串成可复用链路 |
| `06-rag.ts` | 检索增强生成（RAG） | 先检索私有知识，再基于检索结果作答 |
| `07-memory.ts` | 会话记忆 | 跨多次调用保存 / 加载对话历史 |
| `08-agent.ts` | Agent | `createAgent()` 让模型带工具自主多步规划 |

## 统一约定

- 所有文件都通过 `ChatOpenAI` + OpenAI 兼容接口调用模型，`baseURL` 指向本地或第三方推理服务，模型可自由切换；
- 每个文件都导出独立的运行函数（如 `runModelIoExample`），在 `src/index.ts` 里取消对应 import 和调用即可运行；
- 模型初始化统一为下面这段（保持各文件一致）：

```ts
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});
```

## 建议学习顺序

`01-model` → `02-prompt` → `03-structured-output` → `05-lcel-chain` → `04-tool-calling` → `08-agent` → `06-rag` → `07-memory`。

前四步是「基础积木」，LCEL 是把积木串起来的方式，tool 与 agent 是让模型具备行动能力的关键，RAG 和 memory 则分别解决「知识」和「状态」两大工程问题。
