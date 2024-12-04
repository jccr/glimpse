import { test, expect, describe } from "bun:test";
import {
  isNumeric,
  checkNonNumeric,
  checkColumnConsistency,
  checkStatisticalVariance,
  hasHeaders,
} from "./csvHeaderHeuristics";

describe("CSV Header Heuristics", () => {
  test("isNumeric detects numeric values correctly", () => {
    expect(isNumeric("123")).toBe(true);
    expect(isNumeric("123.45")).toBe(true);
    expect(isNumeric("abc")).toBe(false);
    expect(isNumeric("")).toBe(false);
  });

  test("checkNonNumeric identifies non-numeric rows", () => {
    const row = ["Name", "Age", "Address"];
    expect(checkNonNumeric(row)).toBe(true);

    const numericRow = ["1", "2", "3"];
    expect(checkNonNumeric(numericRow)).toBe(false);
  });
  test("checkColumnConsistency detects column type inconsistency", () => {
    const firstRow = ["Name", "Age"];
    const secondRow = ["1", "2"];
    expect(checkColumnConsistency(firstRow, secondRow)).toBe(true);

    const consistentRow = ["John", "Doe"];
    expect(checkColumnConsistency(firstRow, consistentRow)).toBe(false);
  });

  test("checkStatisticalVariance detects variance in data types", () => {
    const firstRow = ["Name", "Age"];
    const sampleRows = [
      ["1", "25"],
      ["2", "30"],
      ["3", "35"],
    ];
    expect(checkStatisticalVariance(firstRow, sampleRows)).toBe(true);

    const consistentSampleRows = [
      ["Alice", "Bob"],
      ["Charlie", "David"],
      ["Eve", "Frank"],
    ];
    expect(checkStatisticalVariance(firstRow, consistentSampleRows)).toBe(
      false,
    );
  });

  describe("CSV Header Heuristics Integration", () => {
    test("CSV with headers", () => {
      const header = ["ID", "Age"];
      const sampleRows = [
        ["1", "25"],
        ["2", "30"],
        ["3", "35"],
      ];
      expect(checkNonNumeric(header)).toBe(true);
      expect(checkColumnConsistency(header, sampleRows[0])).toBe(true);
      expect(checkStatisticalVariance(header, sampleRows)).toBe(true);

      expect(hasHeaders(header, sampleRows)).toBe(true);
    });

    test("CSV without headers", () => {
      const nonHeader = ["0", "1"];
      const sampleRows = [
        ["1", "25"],
        ["2", "30"],
        ["3", "35"],
      ];
      expect(checkNonNumeric(nonHeader)).toBe(false);
      expect(checkColumnConsistency(nonHeader, sampleRows[0])).toBe(false);
      expect(checkStatisticalVariance(nonHeader, sampleRows)).toBe(false);

      expect(hasHeaders(nonHeader, sampleRows)).toBe(false);
    });
  });
});
