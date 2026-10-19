/**
 * 虚拟文件系统（Filesystem）
 *
 * 一句话核心定义：
 * deep agents 内置一套文件工具（write_file / read_file / edit_file / ls / grep 等），
 * 让模型把大块中间结果「卸载」到文件，而不是全部堆在上下文里。
 *
 * 真实业务场景：
 * 调研助手搜到几十条结果，先把每条写入 research/*.md，最后再读回汇总成报告，
 * 避免长任务把上下文窗口撑爆。
 *
 * 新手常见误用：
 * 1. 以为文件系统只为了「读文档」，其实它更是长任务的上下文管理工具；
 * 2. 用 FilesystemBackend 直连项目根目录，agent 可能误改真实文件——先限定 rootDir；
 * 3. 生产环境还在用 StateBackend（内存态），一重启文件全丢，应换持久化 backend。
 */
import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import path from "node:path";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: { baseURL: process.env.BASE_URL! },
});

export const runFilesystemExample = async (): Promise<void> => {
  // 用磁盘后端，限定工作区目录，避免 agent 误触项目文件
  const agent = await createDeepAgent({
    model: llm,
    systemPrompt:
      "你是调研助手。把阶段性结论写入文件，再从文件汇总最终报告。",
    backend: new FilesystemBackend({
      rootDir: path.resolve(import.meta.dirname, "workspace"),
    }),
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "调研 LangGraph 的三个核心概念，把调研笔记写入 research.md，再输出一段总结。",
      },
    ],
  });

  console.log(
    "[filesystem]",
    result.messages[result.messages.length - 1]?.content
  );
};
