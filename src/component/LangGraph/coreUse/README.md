# LangGraph 核心使用方法（coreUse）

本目录把 LangGraph 的核心能力按「状态 → 图结构 → 条件路由 → 并行 → Agent 循环 → 持久化 → 人机协作 → Command → 流式」这条主线拆成独立文件，每个文件都遵循同一种讲法：

1. **一句话核心定义** —— 先讲清这个概念到底是什么；
2. **真实业务场景举例** —— 用生产环境里会遇到的例子，而不是「计数器」这类玩具；
3. **新手常见误用方式** —— 踩坑点，提前避开。

## 文件地图

| 文件 | 核心概念 | 一句话说明 |
| --- | --- | --- |
| `01-state.ts` | 状态与 Reducer | 状态是贯穿整张图的共享数据，reducer 决定更新如何合并 |
| `02-graph-flow.ts` | 图、节点与边 | `StateGraph` + `addNode` + `addEdge` + `START/END` |
| `03-conditional-edge.ts` | 条件边路由 | `addConditionalEdges` 按状态值分流到不同节点 |
| `04-parallel.ts` | 动态并行（Send） | `Send` 按数据条数动态 fan-out，再 fan-in 聚合（map-reduce） |
| `05-tool-loop.ts` | Agent 工具循环 | 模型节点 ↔ 工具节点循环，带次数上限守卫 |
| `06-checkpoint.ts` | 断点持久化 | `MemorySaver` + `thread_id` 保存/恢复会话状态 |
| `07-human-in-the-loop.ts` | 人机协作中断 | `interrupt` 暂停 + `Command({ resume })` 恢复 |
| `08-command.ts` | Command 路由 | `Command` 同时更新状态并路由到多个节点 |
| `09-stream.ts` | 流式输出 | `streamMode` 的 updates / messages / custom 三种模式 |

## 与已有示例的关系

`LangGraph/` 下的 `1.hello`、`2.graph-flow`、`3.paraller-flow`、`4.simple-agent` 是按编号递增难度的「阶梯式」示例；本 `coreUse/` 是「系统性」参考，按概念独立成文件，便于按需查阅和复用。其中 `05-tool-loop` 与 `4.simple-agent` 主题相近，但这里聚焦「循环 + 次数守卫」这一通用模式。

## 使用约定

- 每个文件导出独立的运行函数（如 `runStateExample`），在 `src/index.ts` 里取消对应 import 和调用即可运行；
- 只有需要调用大模型的示例（`05`、`09`）初始化 `ChatOpenAI`，其余是纯图结构演示，不依赖模型；
- 所有相对导入都带 `.js` 后缀（ESM + nodenext 要求）。

## 建议学习顺序

`01-state` → `02-graph-flow` → `03-conditional-edge` → `04-parallel` → `05-tool-loop` → `06-checkpoint` → `07-human-in-the-loop` → `08-command` → `09-stream`。

前四步是「图的静态骨架」，`05` 是让模型具备行动能力的核心循环，`06`/`07` 解决「状态持久化」与「人工介入」，`08`/`09` 是更精细的路由与可观测性。
