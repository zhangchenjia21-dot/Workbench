import { contextBridge, ipcRenderer } from "electron";
import type { DesktopAPI } from "../桌面界面/L3_外交层/桌面公开契约";
const api: DesktopAPI = {
  githubStatus: () => ipcRenderer.invoke("github:status"),
  loginGitHub: () => ipcRenderer.invoke("github:login"),
  projectSources: () => ipcRenderer.invoke("projects:view"),
  connectProject: (repository) =>
    ipcRenderer.invoke("projects:connect", repository),
  disconnectProject: (id) => ipcRenderer.invoke("projects:disconnect", id),
  refreshSource: (id) => ipcRenderer.invoke("projects:refresh", id),
  seeProjectUpdate: (id) => ipcRenderer.invoke("projects:seen", id),
  proposeProjectUpdate: (id, track) =>
    ipcRenderer.invoke("projects:propose", id, track),
  acceptProjectUpdate: (proposal) =>
    ipcRenderer.invoke("projects:accept", proposal),
  openGitHub: (url) => ipcRenderer.invoke("projects:open", url),
  saveSeries: (id, draft, clear) =>
    ipcRenderer.invoke("state:series", id, draft, clear),
  saveException: (id, key, value) =>
    ipcRenderer.invoke("state:exception", id, key, value),
  deleteSeries: (id) => ipcRenderer.invoke("state:delete-series", id),
  saveReminder: (id, draft) => ipcRenderer.invoke("state:reminder", id, draft),
  saveMemo: (id, draft) => ipcRenderer.invoke("state:memo", id, draft),
  saveUnscheduled: (id, draft) =>
    ipcRenderer.invoke("state:unscheduled", id, draft),
  deleteInformation: (kind, id) =>
    ipcRenderer.invoke("state:delete-information", kind, id),
  view: () => ipcRenderer.invoke("state:view"),
  saveTrack: (id, draft) => ipcRenderer.invoke("state:track", id, draft),
  saveItem: (id, draft) => ipcRenderer.invoke("state:item", id, draft),
  saveVector: (id, draft) => ipcRenderer.invoke("state:vector", id, draft),
  deleteItems: (date, ids) =>
    ipcRenderer.invoke("state:delete-items", date, ids),
  acknowledge: (date, source, flag) =>
    ipcRenderer.invoke("state:ack", date, source, flag),
  backup: () => ipcRenderer.invoke("state:backup"),
  restore: () => ipcRenderer.invoke("state:restore"),
};
contextBridge.exposeInMainWorld("workbench", api);
