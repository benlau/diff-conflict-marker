import { ThreeWayMerger } from "../../src/algo/ThreeWayMerger";
import dedent from "dedent";

describe("ThereWayMerger", () => {
  let merger: ThreeWayMerger;

  beforeEach(() => {
    merger = new ThreeWayMerger();
  });

  describe("merge", () => {
    it("should return right content if left is undefined", () => {
      const right = "right content";
      const result = merger.merge(undefined, "base", right);
      expect(result.content).toBe(right);
      expect(result.hasConflicts).toBe(false);
    });

    it("should perform two-way merge if base is undefined", () => {
      const left = dedent`
        line1
        line2
        line3`;
      const right = dedent`
        line1
        line2 modified
        line3`;
      const result = merger.merge(left, undefined, right);
      expect(result.content).toBe(
        dedent`
          line1
          <<<<<<<
          line2
          =======
          line2 modified
          >>>>>>>
          line3`,
      );
      expect(result.hasConflicts).toBe(true);
    });

    it("should handle non-conflicting changes", () => {
      const base = dedent`
        line1
        line2
        line3`;
      const left = dedent`
        line1
        line2
        line3`;
      const right = dedent`
        line1
        line2
        line3
        line4 from right`;
      const result = merger.merge(left, base, right);
      expect(result.content).toBe(
        dedent`
          line1
          line2
          line3
          line4 from right`,
      );
      expect(result.hasConflicts).toBe(false);
    });

    it("should handle simple conflicts", () => {
      const base = dedent`
        line1
        line2
        line3`;
      const left = dedent`
        line1
        line2 modified by left
        line3`;
      const right = dedent`
        line1
        line2 modified by right
        line3`;
      const result = merger.merge(left, base, right);
      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          line1
          <<<<<<<
          line2 modified by left
          =======
          line2 modified by right
          >>>>>>>
          line3`,
      );
    });

    it("should handle complex conflicts", () => {
      const base = dedent`
        line1
        line2
        line3
        line4`;
      const left = dedent`
        line1 modified
        line2
        line3
        line4 from left`;
      const right = dedent`
        line1
        line2 modified
        line3
        line4 from right`;
      const result = merger.merge(left, base, right);
      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          <<<<<<<
          line1 modified
          line2
          =======
          line1
          line2 modified
          >>>>>>>
          line3
          <<<<<<<
          line4 from left
          =======
          line4 from right
          >>>>>>>`,
      );
    });

    it("should handle multi-line conflicts", () => {
      const base = dedent`
        line1
        line2
        line3
        line4`;
      const left = dedent`
        line1
        line2
        line3 modified by left
        line4 modified by left`;
      const right = dedent`
        line1
        line2
        line3 modified by right
        line4 modified by right`;
      const result = merger.merge(left, base, right);
      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          line1
          line2
          <<<<<<<
          line3 modified by left
          line4 modified by left
          =======
          line3 modified by right
          line4 modified by right
          >>>>>>>`,
      );
    });

    it("should use findCommon as base when base is undefined and common lines exist", () => {
      const left = dedent`
        line1
        line2
        line3
        line4 from left
        line5 from left`;
      const right = dedent`
        line1
        line2
        line3
        line4 from right
        line6 from right`;
      const result = merger.merge(left, undefined, right);
      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          line1
          line2
          line3
          <<<<<<<
          line4 from left
          line5 from left
          =======
          line4 from right
          line6 from right
          >>>>>>>`,
      );
    });
  });

  describe("findCommon", () => {
    it("should return empty array for empty inputs", () => {
      const result = merger.findCommon("", "");
      expect(result).toEqual([]);
    });

    it("should return empty array when one input is empty", () => {
      const result1 = merger.findCommon(
        dedent`
        line1
        line2`,
        "",
      );
      const result2 = merger.findCommon(
        "",
        dedent`
        line1
        line2`,
      );
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it("should find common lines between two inputs", () => {
      const input1 = dedent`
        line1
        line2
        line3
        line4`;
      const input2 = dedent`
        line2
        line3
        line5
        line6`;
      const result = merger.findCommon(input1, input2);
      expect(result).toEqual(["line2", "line3"]);
    });

    it("should handle inputs with no common lines", () => {
      const input1 = dedent`
        line1
        line2
        line3`;
      const input2 = dedent`
        line4
        line5
        line6`;
      const result = merger.findCommon(input1, input2);
      expect(result).toEqual([]);
    });

    it("should handle inputs with all lines common", () => {
      const input1 = dedent`
        line1
        line2
        line3`;
      const input2 = dedent`
        line1
        line2
        line3`;
      const result = merger.findCommon(input1, input2);
      expect(result).toEqual(["line1", "line2", "line3"]);
    });

    it("should handle inputs with duplicate lines", () => {
      const input1 = dedent`
        line1
        line2
        line1
        line3`;
      const input2 = dedent`
        line2
        line1
        line4`;
      const result = merger.findCommon(input1, input2);
      // LCS: line2 appears first in both arrays, then line1
      expect(result).toEqual(["line2", "line1"]);
    });

    it("should handle inputs with different line orders", () => {
      const input1 = dedent`
        line1
        line2
        line3
        line4`;
      const input2 = dedent`
        line4
        line3
        line2
        line1`;
      const result = merger.findCommon(input1, input2);
      // LCS: Only 'line2' maintains relative order in both arrays
      expect(result).toEqual(["line2"]);
    });

    it("should handle inputs with whitespace differences", () => {
      const input1 = dedent`
        line1
          line2  
        line3`;
      const input2 = dedent`
        line1
        line2
        line3`;
      const result = merger.findCommon(input1, input2);
      expect(result).toEqual(["line1", "line3"]);
    });
  });
});
