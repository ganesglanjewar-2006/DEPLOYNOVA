import API from "./axios";

export const listGithubRepos = () => API.get("/api/github/repos");
export const getRepoDetails = (owner, repo) => API.get(`/api/github/repos/${owner}/${repo}`);
