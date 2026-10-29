import { assembleApplication } from "./src/assembly.ts";

export default {
  assemble: assembleApplication,
  title: "SnapBack",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/SnapBack.md", import.meta.url),
      new URL("./design/compositions/TaskCreation.md", import.meta.url),
      new URL("./design/compositions/TaskManagement.md", import.meta.url),
    ],
  },
};
