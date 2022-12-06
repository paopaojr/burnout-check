import fetch from "node-fetch";
import { WorkingHours } from "working-hours";
import url from "url";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function getAllCommits({ since, until, author }) {
  const query = new url.URLSearchParams({
    since,
    until,
    author,
    per_page: 100,
  });
  const response = await fetch(
    "https://api.github.com/repos/Brikl/shop-server/commits?" +
      query.toString(),
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    }
  );

  return response.json();
}

function getPRsFromCommits(commits) {
  return commits
    .map((c) => c.commit.message.split("\n")[0])
    .map((m) => m.replace(/.*\(#(\d*?)\).*/m, "$1"));
}

async function getPRsCommits(prNumber) {
  const response = await fetch(
    "https://api.github.com/repos/Brikl/shop-server/pulls/" +
      prNumber +
      "/commits?per_page=100",
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    }
  );

  return response.json();
}

async function run() {
  const author = "avepha"; // UtopiaBeam wiput1999 avepha paopaojr
  const since = "2022-10-01";
  const until = "2022-10-31";

  var wh = new WorkingHours([
    false,
    "07:30-17:00",
    "07:30-17:00",
    "07:30-17:00",
    "07:30-17:00",
    "07:30-17:00",
    false,
  ]);

  const allCommits = await getAllCommits({
    since,
    until,
    author,
  });

  const prs = getPRsFromCommits(allCommits);
  const prsCommits = await Promise.all(prs.map(getPRsCommits));

  const prsCommitsByUser = prsCommits
    .flat()
    .filter((c) => c.author?.login === author);

  console.log(
    `PR commits by author ${author} since ${since} -> until ${until}: ${prsCommitsByUser.length}`
  );

  const prsOvertimeCommitsByUser = prsCommitsByUser.filter((c) => {
    const createdAt = new Date(c.commit.author.date);

    return !wh.test(createdAt);
  });

  console.log(
    `PR overtime commits by author ${author}: ${prsOvertimeCommitsByUser.length}`,
    ` - percentage: ${(
      (prsOvertimeCommitsByUser.length / prsCommitsByUser.length) *
      100
    ).toFixed(2)}%`,
    prsOvertimeCommitsByUser.map(({ commit }) => {
      const createdAt = new Date(commit.author.date);

      return {
        title: commit.message,
        url: commit.url,
        createdAt: `${createdAt.toLocaleDateString()}, ${createdAt.toLocaleTimeString()}`,
      };
    })
  );
}

run();
