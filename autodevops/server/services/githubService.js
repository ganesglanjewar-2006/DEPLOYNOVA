// ═══════════════════════════════════════════════════
// 🚀 DeployNova — GitHub Service
// ═══════════════════════════════════════════════════
const axios = require("axios");

const GITHUB_API = "https://api.github.com";

/**
 * Fetch all repos for a user using their personal access token.
 */
async function getUserRepos(githubToken) {
  const response = await axios.get(`${GITHUB_API}/user/repos`, {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
    },
    params: {
      sort: "updated",
      per_page: 100,
      type: "owner",
    },
  });

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    cloneUrl: repo.clone_url,
    language: repo.language,
    defaultBranch: repo.default_branch,
    isPrivate: repo.private,
    updatedAt: repo.updated_at,
    stargazersCount: repo.stargazers_count,
  }));
}

/**
 * Fetch details of a single repo.
 */
async function getRepoDetails(githubToken, owner, repo) {
  const response = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  return {
    id: response.data.id,
    name: response.data.name,
    fullName: response.data.full_name,
    description: response.data.description,
    url: response.data.html_url,
    cloneUrl: response.data.clone_url,
    language: response.data.language,
    defaultBranch: response.data.default_branch,
    isPrivate: response.data.private,
    topics: response.data.topics,
  };
}

/**
 * Fetch branches for a repo.
 */
async function getRepoBranches(githubToken, owner, repo) {
  const response = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}/branches`, {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
    },
    params: { per_page: 100 },
  });

  return response.data.map((branch) => ({
    name: branch.name,
    sha: branch.commit.sha,
    isProtected: branch.protected,
  }));
}

module.exports = {
  getUserRepos,
  getRepoDetails,
  getRepoBranches,
};
