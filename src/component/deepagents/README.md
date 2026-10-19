# Deep Agents 核心使用方法（deepagents）

本目录把 deepagents 的核心能力按「创建 → 工具 → 文件系统 → 权限 → 技能 → 记忆 → 子智能体 → 规划 → 人工审批 → 流式」这条主线拆成独立文件，每个文件都遵循同一种讲法：

1. **一句话核心定义** —— 先讲清这个概念到底是什么；
2. **真实业务场景举例** —— 用生产环境里会遇到的例子，而不是「计数器」这类玩具；
3. **新手常见误用方式** —— 踩坑点，提前避开。

## 文件地图

| 文件 | 核心概念 | 一句话说明 |
| --- | --- | --- |
| `01-create-agent.ts` | 创建与调用 | `createDeepAgent` 开箱即用地装配完整 harness |
| `02-tools-mcp.ts` | 自定义工具与 MCP | 接入业务工具和 MCP 服务器 |
| `03-filesystem.ts` | 虚拟文件系统 | 用文件卸载大量上下文，避免撑爆 token |
| `04-permissions.ts` | 文件权限 | 声明式控制 agent 能读写的路径 |
| `05-skills.ts` | 技能（SKILL.md） | 按需渐进加载专业知识 |
| `06-memory.ts` | 长期记忆（AGENTS.md） | 跨会话记住品牌语气、规范与偏好 |
| `07-subagents.ts` | 子智能体委派 | 把重活隔离给子 agent，只回收结论 |
| `08-planning.ts` | 任务规划 | `todoListMiddleware` 让 agent 维护任务清单 |
| `09-human-in-the-loop.ts` | 人工审批 | `interruptOn` 在敏感工具调用前暂停 |
| `10-stream.ts` | 流式输出 | 观察 token、工具调用与子 agent 进度 |

## 配套示例资产

- `AGENTS.md` —— `06-memory.ts` 使用的长期记忆样例；
- `skills/refund-policy/SKILL.md` —— `05-skills.ts` 使用的技能样例。

## 与 LangChain / LangGraph 的关系

deepagents 是「agent harness」：它把你在 `LangGraph/coreUse` 里手写的工具循环、人机协作、上下文管理、文件系统等能力预装好。LangChain 提供积木，LangGraph 提供运行时，deepagents 提供成品外壳。

## 使用约定

- `createDeepAgent` 是**异步函数**，必须 `await`；
- 每个文件导出独立的运行函数（如 `runCreateAgentExample`），在 `src/index.ts` 里取消对应 import 和调用即可运行；
- 所有示例都通过统一的 `ChatOpenAI` + OpenAI 兼容接口调用模型；
- 所有相对导入都带 `.js` 后缀（ESM + nodenext 要求）。

## 建议学习顺序

`01-create-agent` → `02-tools-mcp` → `03-filesystem` → `04-permissions` → `05-skills` → `06-memory` → `07-subagents` → `08-planning` → `09-human-in-the-loop` → `10-stream`。

前两步是「接数据与工具」，`03`/`04` 是执行环境与安全边界，`05`/`06` 是知识管理，`07`/`08` 是分解与规划，`09`/`10` 是控制与可观测性。
