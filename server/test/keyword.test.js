const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { extractKeywordCandidate } = require("../src/routes/chat");

describe("extractKeywordCandidate", () => {
  test("backticked tokens win", () => {
    assert.equal(
      extractKeywordCandidate("Where is `parseAsync` defined?"),
      "parseAsync"
    );
  });

  test("backticked phrases preserve content", () => {
    // Backtick captures whatever the user wrote between the ticks.
    assert.equal(
      extractKeywordCandidate("Show me `MyClass.foo`"),
      "MyClass.foo"
    );
  });

  test("camelCase identifiers are extracted (parseAsync)", () => {
    assert.equal(
      extractKeywordCandidate("How does the parseAsync method work?"),
      "parseAsync"
    );
  });

  test("camelCase wins over the leading question word", () => {
    // Was the original bug: "How" used to be returned as a keyword.
    assert.equal(
      extractKeywordCandidate("How does getUserData behave?"),
      "getUserData"
    );
  });

  test("snake_case identifiers are extracted", () => {
    assert.equal(
      extractKeywordCandidate("What does parse_args return?"),
      "parse_args"
    );
  });

  test("PascalCase with multiple capitals is extracted", () => {
    assert.equal(
      extractKeywordCandidate("What is HTTPServer?"),
      "HTTPServer"
    );
  });

  test("plain English question words are NOT treated as identifiers", () => {
    // No camelCase, snake_case, or PascalCase candidates here.
    assert.equal(
      extractKeywordCandidate("How does authentication work?"),
      null
    );
    assert.equal(
      extractKeywordCandidate("Where is the main entry point?"),
      null
    );
  });

  test("stop words are filtered from PascalCase matches", () => {
    // "How" matches PascalCase shape but is a stop word.
    assert.equal(extractKeywordCandidate("How are tests run?"), null);
    assert.equal(extractKeywordCandidate("What is happening?"), null);
  });

  test("returns null on empty input", () => {
    assert.equal(extractKeywordCandidate(""), null);
  });

  test("first identifier wins when multiple are present", () => {
    // We only need one keyword per query for the hybrid filter; the first
    // is good enough.
    assert.equal(
      extractKeywordCandidate("Compare parseAsync vs parseSync."),
      "parseAsync"
    );
  });
});
