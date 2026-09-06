/** renderer 可用的纯只读日历入口，不加载 SQLite 或主进程生命周期。输入为 IPC snapshot，输出为临时投影。 */
export { expandOccurrences } from "../L1_器件层/循环展开器";
export { addDays, weekday } from "../L0_公理层/状态契约";
