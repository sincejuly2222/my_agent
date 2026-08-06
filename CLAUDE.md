# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个**学习型项目**，用 TypeScript（ESM）演示如何用 LangChain 和 LangGraph 构建 LLM Agent。所有示例通过统一的 OpenAI 兼容接口调用模型（baseURL 指向本地或第三方推理服务），因此可自由切换不同模型。代码注释、示例文案均为中文。

## 常用命令

```bash
pnpm dev          # 用 tsx watch 开发运行（热重载 src/index.ts）
pnpm build        # 用 tsup 打包到 dist/（--external dotenv）
pnpm start        # 运行编译产物 node dist/index.js
pnpm typecheck    # tsc --noEmit 类型检查
```

没有测试框架，验证方式就是 `pnpm dev` 直接跑当前激活的示例并观察输出。

## 环境变量

示例依赖项目根目录的 `.env`（已被 gitignore，提交前不要引入）：

- `LLM_MODEL` / `API_KEY` / `BASE_URL` —— 模型标识、密钥、OpenAI 兼容的 baseURL，全局类型声明在 `gobal.d.ts` 中
- `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` —— LangSmith 链路追踪

## 架构与结构

**入口：`src/index.ts`** —— 不是应用本身，而是一个"启动器"：用注释切换当前要演示的示例，取消注释对应的 `invoke()` / `runBasicExample()` 调用即可运行该示例。所有示例文件都从 `.js` 后缀导入（ESM + nodenext 模式）。

**两大学习分区，都在 `src/component/` 下：**

1. **`LangChain/`** —— LangChain 基础能力
   - `1.basic.ts`（基础对话）、`2.image.ts`（图片输入）、`3.structed-output.ts`（结构化输出）、`4.tool.ts`（工具调用）
   - `5.agent/` —— 用 `createAgent()`（langchain 包）搭建完整 agent，`my_agent.ts` 演示了 `tool()` + `zod` schema + 多模式流式输出（`streamMode: ["messages", "updates", "custom"]`）

2. **`LangGraph/`** —— 图状态机编排 agent（核心学习内容，按编号递增难度）
   - `1.hello/` —— `entrypoint()` 函数式 API + `addMessages` reducer，手动 `while` 循环驱动工具调用，拆分为 model 节点 / tool 节点
   - `2.graph-flow/` —— `StateGraph` + `Annotation.Root` 定义状态，条件边（`addConditionalEdges`）按正则判断路由
   - `3.paraller-flow/` —— 并行流
   - `4.simple-agent/` —— 最完整的 `StateGraph` 示例：`Annotation` 状态 + `modelNode`/`fetchTool` 节点 + `shouldContinue` 条件路由，形成循环图，展示了 tool 绑定、ToolMessage 回填、次数递减的完整 agent 模式

**统一模式**：每个示例目录都有一个 `agent.ts`（定义 agent/图）+ `index.ts`（导出 `invoke()` 运行函数，默认 export）。新增示例遵循此结构即可。

**LLM 统一初始化方式**（各文件重复但保持一致的写法）：

```ts
const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});
```
