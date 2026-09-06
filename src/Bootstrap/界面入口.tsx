import React from "react";
import { createRoot } from "react-dom/client";
import { WorkbenchView } from "../桌面界面/L3_外交层/工作台页面";
import "../桌面界面/L3_外交层/工作台样式.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkbenchView />
  </React.StrictMode>,
);
