import Fastify, { type FastifyRequest } from "fastify";
import type { Endpoints } from "@octokit/types";
import { type RouteGenericInterface } from "fastify/types/route";

// this is a mock server to simulate the GitHub API,
// it's not a complete implementation, only the parts used in the app

type Issue =
  Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"][0];

type Comment =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"]["response"]["data"][0];

const comments: Record<string, Comment[]> = {};
const issues: Issue[] = [];

let counter = 1;

const app = Fastify({
  logger: false,
});

type IssueRequest<T extends RouteGenericInterface = RouteGenericInterface> =
  FastifyRequest<
    T & {
      Params: {
        owner: string[];
        repo: string[];
        issue_number: string[] | string;
      };
    }
  >;

const mockUser = {
  login: "test",
  id: 1,
  avatar_url: "https://i.pravatar.cc/128",
  name: "Test User",
  email: "test@example.com",
} as Endpoints["GET /user"]["response"]["data"];

app.get("/", async () => "Hello, world!");

app.get("/user", async () => mockUser);

app.get(
  "/repos/:owner/:repo/issues",
  (
    req: FastifyRequest<{
      Querystring: {
        state?: "open" | "closed";
        limit?: string;
        page?: string;
      };
    }>,
  ) => {
    let result = issues;

    if (req.query?.state)
      result = result.filter((i) => i.state === req.query.state);

    if (req.query?.limit) {
      const page = Number(req.query.page ?? 1);

      const start = (page - 1) * Number(req.query.limit);

      result = result.slice(start, start + Number(req.query.limit));
    }

    return result;
  },
);

app.get(
  "/repos/:owner/:repo/issues/:issue_number",
  async (req: IssueRequest, res) => {
    const issue = issues.find((i) => i.number === getIssueNumber(req));

    if (!issue)
      return res.status(404).send({
        message: "Issue not found",
      });

    return issue;
  },
);

app.post(
  "/repos/:owner/:repo/issues",
  async (
    req: IssueRequest<{
      Body: {
        title: string;
        body: string;
      };
    }>,
  ) => {
    const issue = {
      title: req.body.title,
      body: req.body.body,
      id: counter++,
      number: counter++,
      node_id: "",
      url: "",
      repository_url: "",
      labels_url: "",
      comments_url: "",
      events_url: "",
      html_url: "",
      user: mockUser,
      state: "open",
      labels: [],
      assignee: null,
      milestone: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      locked: false,
      updated_at: new Date().toISOString(),
      closed_by: null,
      comments: 0,
      author_association: "CONTRIBUTOR",
    } satisfies Issue;

    issues.push(issue);
    comments[issue.id] = [];

    return issue;
  },
);

app.patch(
  "/repos/:owner/:repo/issues/:issue_number",
  async (
    req: IssueRequest<{
      Body: Partial<Issue>;
    }>,
  ) => {
    const issue = issues.find((i) => i.number === getIssueNumber(req));

    if (!issue)
      return {
        message: "Issue not found",
      };

    Object.assign(issue, req.body);

    issues[issues.findIndex((i) => i.number === issue.number)] = issue;

    return issue;
  },
);

app.get(
  "/repos/:owner/:repo/issues/:issue_number/comments",
  async (req: IssueRequest) => comments[req.params.issue_number[0] ?? 1] ?? [],
);

app.post(
  "/repos/:owner/:repo/issues/:issue_number/comments",
  async (
    req: IssueRequest<{
      Body: string;
    }>,
  ) => {
    comments[getIssueNumber(req)] ??= [];

    const comment = {
      id: counter++,
      body: req.body,
      user: mockUser,
      node_id: "",
      created_at: new Date().toISOString(),
      html_url: "",
      updated_at: new Date().toISOString(),
      url: "",
      issue_url: "",
      author_association: "CONTRIBUTOR",
    } satisfies Comment;

    comments[getIssueNumber(req)]?.push(comment);

    return comment;
  },
);

await app.listen({
  port: 3001,
});

function getIssueNumber(req: IssueRequest) {
  if (Array.isArray(req.params.issue_number)) {
    if (!req.params.issue_number[0]) throw new Error("Issue number not found");

    return Number(req.params.issue_number[0]);
  }

  return Number(req.params.issue_number);
}
