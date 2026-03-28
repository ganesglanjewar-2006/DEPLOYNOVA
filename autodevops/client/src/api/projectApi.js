import API from "./axios";

export const createProject = (data) => API.post("/api/projects", data);
export const getProjects = (params) => API.get("/api/projects", { params });
export const getProject = (id) => API.get(`/api/projects/${id}`);
export const updateProject = (id, data) => API.put(`/api/projects/${id}`, data);
export const deleteProject = (id) => API.delete(`/api/projects/${id}`);
