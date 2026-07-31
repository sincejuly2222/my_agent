import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "langchain";
import fs from "node:fs";
import path from "node:path";
import z from "zod";

const llm = new ChatOpenAI({
  model: process.env.LLM_MODEL!,
  apiKey: process.env.API_KEY!,
  configuration: {
    baseURL: process.env.BASE_URL!,
  },
});

type HtmlDomNode = {
  tag: string;
  attributes: Record<string, string>;
  text: string;
  children: HtmlDomNode[];
};

const htmlDomNodeSchema: z.ZodType<HtmlDomNode> = z.lazy(() =>
  z.object({
    tag: z.string(),
    attributes: z.record(z.string()),
    text: z.string(),
    children: z.array(htmlDomNodeSchema),
  }),
);

const schema = z.object({
  description: z.string(),
  dom: htmlDomNodeSchema,
});

const invoke = async (myImgSrc: string): Promise<string> => {
  const imagePath = path.resolve(import.meta.dirname, "..", myImgSrc);
  const url =
    "data:image/png;base64," + fs.readFileSync(imagePath).toString("base64");
  const res = await llm.invoke([
    new HumanMessage([
      {
        type: "image_url",
        image_url: {
          url: url,
        },
      },
      {
        type: "text",
        text: `分析图片内容并使用中文描述。我需要根据图片开发 HTML，请只返回 JSON，不要返回 Markdown、代码围栏或解释文字。

JSON 必须严格符合下面的结构：
{
  "description": "图片的中文描述",
  "dom": {
    "tag": "HTML 标签名，例如 div、img、span",
    "attributes": {
      "class": "类名",
      "style": "CSS 内联样式"
    },
    "text": "节点文本，没有文本时使用空字符串",
    "children": []
  }
}

要求：
1. dom 必须是可以递归嵌套的 HTML DOM 节点。
2. 每个节点都必须包含 tag、attributes、text、children。
3. attributes 的所有值必须是字符串。
4. 根据图片的布局、颜色、文字和视觉层级生成 DOM。
5. 图片资源地址使用 /miaoma-logo.png。`,
      },
    ]),
  ]);

  if (typeof res.content !== "string") {
    throw new Error("The model did not return text content.");
  }

  return res.content;
};

export const runStructuredOutputExample = async (
  myImgSrc: string
): Promise<void> => {
  const res = await invoke(myImgSrc);
  console.log("Raw response:", res);

  try {
    const json: unknown = JSON.parse(res);
    const parsedData = schema.parse(json);
    console.log("Parsed data:", parsedData);
  } catch (error) {
    console.error("Failed to parse the response:", error);
  }
};
