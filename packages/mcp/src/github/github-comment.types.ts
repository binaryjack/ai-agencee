export interface GitHubComment {
  id: number;
  body: string;
  user: { login: string; type: string };
}
