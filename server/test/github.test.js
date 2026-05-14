const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const github = require("../src/services/github");

describe("parseGithubUrl", () => {
  test("accepts a canonical https URL", () => {
    const r = github.parseGithubUrl("https://github.com/owner/repo");
    assert.equal(r.owner, "owner");
    assert.equal(r.name, "repo");
    assert.equal(r.normalizedUrl, "https://github.com/owner/repo");
  });

  test("strips a trailing slash", () => {
    const r = github.parseGithubUrl("https://github.com/owner/repo/");
    assert.equal(r.normalizedUrl, "https://github.com/owner/repo");
  });

  test("strips a .git suffix", () => {
    const r = github.parseGithubUrl("https://github.com/owner/repo.git");
    assert.equal(r.normalizedUrl, "https://github.com/owner/repo");
  });

  test("normalizes http:// to https://", () => {
    const r = github.parseGithubUrl("http://github.com/owner/repo");
    assert.equal(r.normalizedUrl, "https://github.com/owner/repo");
  });

  test("strips /tree/<branch>/... paths", () => {
    const r = github.parseGithubUrl("https://github.com/owner/repo/tree/main/src");
    assert.equal(r.normalizedUrl, "https://github.com/owner/repo");
  });

  test("strips /blob/<branch>/... paths", () => {
    const r = github.parseGithubUrl(
      "https://github.com/owner/repo/blob/main/README.md"
    );
    assert.equal(r.normalizedUrl, "https://github.com/owner/repo");
  });

  test("allows dashes and dots in owner/name", () => {
    const r = github.parseGithubUrl("https://github.com/owner-1/repo.name");
    assert.equal(r.owner, "owner-1");
    assert.equal(r.name, "repo.name");
  });

  test("rejects non-strings", () => {
    assert.throws(() => github.parseGithubUrl(null), /must be a string/i);
    assert.throws(() => github.parseGithubUrl(undefined), /must be a string/i);
    assert.throws(() => github.parseGithubUrl(123), /must be a string/i);
  });

  test("rejects non-URLs", () => {
    assert.throws(
      () => github.parseGithubUrl("not-a-url"),
      /Only public GitHub repo URLs/i
    );
  });

  test("rejects non-github hosts", () => {
    assert.throws(
      () => github.parseGithubUrl("https://gitlab.com/owner/repo"),
      /Only public GitHub repo URLs/i
    );
    assert.throws(
      () => github.parseGithubUrl("https://bitbucket.org/owner/repo"),
      /Only public GitHub repo URLs/i
    );
  });
});

describe("buildGithubFileUrl", () => {
  test("produces a line-range deep link", () => {
    const url = github.buildGithubFileUrl({
      owner: "tj",
      name: "commander.js",
      branch: "master",
      filePath: "lib/command.js",
      startLine: 10,
      endLine: 35,
    });
    assert.equal(
      url,
      "https://github.com/tj/commander.js/blob/master/lib/command.js#L10-L35"
    );
  });

  test("uses a single-line anchor when startLine == endLine", () => {
    const url = github.buildGithubFileUrl({
      owner: "tj",
      name: "commander.js",
      branch: "master",
      filePath: "lib/command.js",
      startLine: 42,
      endLine: 42,
    });
    assert.equal(
      url,
      "https://github.com/tj/commander.js/blob/master/lib/command.js#L42"
    );
  });

  test("falls back to no anchor when no lines are provided", () => {
    const url = github.buildGithubFileUrl({
      owner: "tj",
      name: "commander.js",
      branch: "master",
      filePath: "README.md",
    });
    assert.equal(
      url,
      "https://github.com/tj/commander.js/blob/master/README.md"
    );
  });
});
