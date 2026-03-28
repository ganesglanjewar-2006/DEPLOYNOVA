import API from "./axios";

export const registerUser = (data) => API.post("/api/auth/register", data);
export const loginUser = (data) => API.post("/api/auth/login", data);
export const getMe = () => API.get("/api/auth/me");
export const updateGithubToken = (data) => API.put("/api/auth/github-token", data);
