import API from "./axios";

export const triggerDeploy = (projectId, data) => API.post(`/api/deploy/${projectId}`, data || {});
export const getDeployments = (projectId, params) => API.get(`/api/deploy/${projectId}`, { params });
export const getDeployment = (deploymentId) => API.get(`/api/deploy/detail/${deploymentId}`);
export const getDeploymentLogs = (deploymentId) => API.get(`/api/deploy/logs/${deploymentId}`);
export const stopDeployment = (deploymentId) => API.post(`/api/deploy/stop/${deploymentId}`);
export const getRunningDeployments = () => API.get("/api/deploy/running");
