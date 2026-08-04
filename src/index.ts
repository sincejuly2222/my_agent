// import { runBasicExample } from "./component/1.basic.js"; 
// import { runImageExample } from "./component/2.image.js";
// import { runStructuredOutputExample } from "./component/3.structed-output.js";
// import { runToolExample } from "./component/4.tool.js";
// import { runBasicExample } from "./component/5.agent/1.bacsicImg.js";
// import { runBasicExample } from "./component/5.agent/my_agent";
import { invoke } from "./component/LangGraph/4.simple-agent/index.js";

invoke().catch((error: unknown) => {
  console.error("Failed to run the image example:", error);
  process.exitCode = 1;
});
// runBasicExample().catch((error: unknown) => {
//   console.error("Failed to run the image example:", error);
//   process.exitCode = 1;
// });

// runToolExample().catch((error: unknown) => {
//   console.error("Failed to run the tool example:", error);
//   process.exitCode = 1;
// });

// runBasicExample()
// .catch((error: unknown) => {
//   console.error("Failed to run the basic example:", error);
//   process.exitCode = 1;
// });
// runImageExample("public/miaoma-logo.png").catch((error: unknown) => {
//   console.error("Failed to run the image example:", error);
//   process.exitCode = 1;
// });
