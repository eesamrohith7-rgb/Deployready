import { describe, expect, it } from "vitest";
import { deriveSecurityIssues } from "@/lib/webaudit/scanners/_security-rules";
import { riskFromIssues, scoreFromIssues } from "@/lib/webaudit/score";

const allGood = {
  isHttps: true,
  certDaysRemaining: 90,
  hstsPresent: true,
  cspPresent: true,
  xctoPresent: true,
  xfoOrFramesAncestorsPresent: true,
  referrerPresent: true,
  permissionsPresent: true,
  exposedPaths: [] as string[],
};

describe("deriveSecurityIssues", () => {
  it("no issues for a fully hardened site", () => {
    expect(deriveSecurityIssues(allGood)).toEqual([]);
  });

  it("HTTP raises critical sec-https", () => {
    const issues = deriveSecurityIssues({ ...allGood, isHttps: false });
    expect(issues.find((i) => i.id === "sec-https")?.severity).toBe("critical");
  });

  it("near expiry raises critical sec-ssl-expiry", () => {
    const issues = deriveSecurityIssues({ ...allGood, certDaysRemaining: 5 });
    expect(issues.find((i) => i.id === "sec-ssl-expiry")?.severity).toBe("critical");
  });

  it("exposed .env raises critical sec-exposed", () => {
    const issues = deriveSecurityIssues({ ...allGood, exposedPaths: ["/.env"] });
    expect(issues.find((i) => i.id === "sec-exposed")?.severity).toBe("critical");
  });

  it("risk escalates with multiple criticals", () => {
    const issues = deriveSecurityIssues({ ...allGood, isHttps: false, exposedPaths: ["/.env"] });
    expect(riskFromIssues(issues)).toBe("critical");
    expect(scoreFromIssues(issues)).toBeLessThan(60);
  });

  it("missing headers but HTTPS still healthy is medium-ish, not critical", () => {
    const issues = deriveSecurityIssues({
      ...allGood,
      hstsPresent: false,
      cspPresent: false,
      xctoPresent: false,
    });
    expect(riskFromIssues(issues)).toBe("medium");
  });
});
