import { DiffMarker } from "../../src/algo/DiffMarker";
import { ThreeWayMerger } from "../../src/algo/ThreeWayMerger";
import * as fs from "fs";
import * as path from "path";
import dedent from "dedent";

describe("DiffMarker", () => {
  let merger: ThreeWayMerger;
  let diffMarker: DiffMarker;

  beforeEach(() => {
    merger = new ThreeWayMerger();
    diffMarker = new DiffMarker(merger);
  });

  describe("patchNewLines", () => {
    it("patchNewLines should handle addition", () => {
      const original = "line1";

      const modified = dedent`
        line1
        line2
        line3`;

      const patch = diffMarker.patchNewLines(original, modified);

      expect(patch).toEqual({
        steps: [{ items: [""], newPos: 1, oldPos: 1, type: "add" }],
        result: dedent`line1\n`,
      });
    });

    it("patch should handle addition from empty", () => {
      const original = dedent``;
      const modified = dedent`
        line1
        line2
        line3`;
      const patch = diffMarker.patchNewLines(original, modified);
      expect(patch).toEqual({
        steps: [],
        result: dedent``,
      });
    });

    it("patchNewLines should handle addition from single line", () => {
      const original = dedent`   `;
      const modified = dedent`
        line1
        line2
        line3`;
      const patch = diffMarker.patchNewLines(original, modified);
      expect(patch).toEqual({
        steps: [],
        result: dedent`   `,
      });
    });

    it("patchLines should handle multiple lines addition", () => {
      const original = dedent`
        line1
        line2
        line3
        line4
        line5
        line6`;
      const modified = dedent`
        line1
        line2
        line3
        a
        b
        line4
        c
        line5
        line6`;
      const patch = diffMarker.patchNewLines(original, modified);
      expect(patch).toEqual({
        steps: [
          { items: [""], newPos: 3, oldPos: 3, type: "add" },
          { items: [""], newPos: 5, oldPos: 4, type: "add" },
        ],
        result: dedent`
          line1
          line2
          line3
          
          line4
          
          line5
          line6`,
      });
    });

    it("should handle replacement with addition", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = dedent`
        line1
        line2 modified
        line3
        line4`;

      const patch = diffMarker.patchNewLines(original, modified);

      expect(patch).toEqual({
        steps: [{ items: [""], newPos: 3, oldPos: 3, type: "add" }],
        result: dedent`line1\nline2\nline3\n`,
      });
    });

    it("patchLines should handle multiple replacement", () => {
      const original = dedent`
        line1
        line2
        line3
        line4
        line5
        line6`;
      const modified = dedent`
        line1
        a
        b
        line3
        c
        line6`;
      const patch = diffMarker.patchNewLines(original, modified);
      // Replacement don't modify the original
      expect(patch).toEqual({
        steps: [],
        result: dedent`
          line1
          line2
          line3
          line4
          line5
          line6`,
      });
    });

    it("patch should handle deletion", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = dedent`
        line1
        line3`;

      const patch = diffMarker.patchNewLines(original, modified);

      expect(patch).toEqual({
        steps: [],
        result: dedent`
          line1
          line2
          line3`,
      });
    });

    it("patch should handle delete all", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = "";

      const patch = diffMarker.patchNewLines(original, modified);

      expect(patch).toEqual({
        steps: [],
        result: dedent`
          line1
          line2
          line3`,
      });
    });

    it("patchNewLines should handle deletion and addition", () => {
      const original = dedent`
        line1
        line2
        line3
        line4`;

      const modified = dedent`
        line1
        line4
        line5`;

      const patch = diffMarker.patchNewLines(original, modified);

      expect(patch).toEqual({
        steps: [{ items: [""], newPos: 4, oldPos: 4, type: "add" }],
        result: dedent`line1\nline2\nline3\nline4\n`,
      });
    });

    it("patch should handle reordered lines", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = dedent`
        line3
        line1
        line2`;

      const patch = diffMarker.patchNewLines(original, modified);

      expect(patch).toEqual({
        steps: [{ items: [""], newPos: 0, oldPos: 0, type: "add" }],
        result: dedent`\nline1\nline2\nline3`,
      });
    });
  });

  describe("mark", () => {
    it("should return content without conflicts when original and modified are identical", () => {
      const content = dedent`
        line1
        line2
        line3`;

      const result = diffMarker.mark(content, content);

      expect(result.content).toBe(content);
      expect(result.hasConflicts).toBe(false);
    });

    it("mark should handle simple line additions", () => {
      const original = dedent`line1`;

      const modified = dedent`
        line1
        line2`;

      const result = diffMarker.mark(original, modified);

      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          line1
          <<<<<<<
          
          =======
          line2
          >>>>>>>`,
      );
    });

    it("mark should handle simple line deletions", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = dedent`
        line1
        line3`;

      const result = diffMarker.mark(original, modified);

      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          line1
          <<<<<<<
          line2
          =======
          
          >>>>>>>
          line3`,
      );
    });

    it("should handle simple line modifications", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = dedent`
        line1
        line2 modified
        line3`;

      const result = diffMarker.mark(original, modified);

      expect(result.hasConflicts).toBe(true);
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
    });

    it("should handle empty original content", () => {
      const original = "";
      const modified = dedent`
        line1
        line2`;

      const result = diffMarker.mark(original, modified);

      expect(result.hasConflicts).toBe(true);

      expect(result.content).toBe(
        dedent`
          <<<<<<<
          
          
          =======
          line1
          line2
          >>>>>>>`,
      );
    });

    it("should handle empty modified content", () => {
      const original = dedent`
        line1
        line2`;
      const modified = "";

      const result = diffMarker.mark(original, modified);

      expect(result.hasConflicts).toBe(true);
      expect(result.content).toBe(
        dedent`
          <<<<<<<
          line1
          line2
          =======
          
          
          >>>>>>>`,
      );
    });

    it("should handle both empty inputs", () => {
      const result = diffMarker.mark("", "");

      expect(result.content).toBe("\n");
      expect(result.hasConflicts).toBe(false);
    });

    it("mark should handle reordered lines", () => {
      const original = dedent`
        line1
        line2
        line3`;

      const modified = dedent`
        line3
        line1
        line2`;

      const result = diffMarker.mark(original, modified);

      // The result should contain conflict markers since lines are reordered
      expect(result.hasConflicts).toBe(true);
      expect(result.content).toEqual(dedent`
        <<<<<<<

        =======
        line3
        >>>>>>>
        line1
        line2
        <<<<<<<
        line3
        =======
        
        >>>>>>>
      `);
    });

    it("mark should handle duplicate lines addition", () => {
      const original = dedent`
        line1
        line2
        line1`;

      const modified = dedent`
        line1
        line2
        line1
        line3`;

      const result = diffMarker.mark(original, modified);

      expect(result.hasConflicts).toBe(true);

      expect(result.content).toEqual(dedent`
        line1
        line2
        line1
        <<<<<<<
        
        =======
        line3
        >>>>>>>
      `);
    });
  });

  describe("snapshot tests", () => {
    const snapshotDir = path.join(__dirname, "snapshot", "diffmarker");

    const r1Files = fs
      .readdirSync(snapshotDir)
      .filter((file) => file.endsWith(".r1.txt"))
      .map((file) => file.replace(".r1.txt", ""));

    r1Files.forEach((testName) => {
      it(`should handle ${testName} snapshot test`, () => {
        const r1Path = path.join(snapshotDir, `${testName}.r1.txt`);
        const r2Path = path.join(snapshotDir, `${testName}.r2.txt`);

        const r1Content = fs.readFileSync(r1Path, "utf-8");
        const r2Content = fs.readFileSync(r2Path, "utf-8");

        const markSnapshotPath = path.join(snapshotDir, `${testName}.snap.txt`);
        const result = diffMarker.mark(r1Content, r2Content);
        expect(result.content).toMatchSpecificSnapshot(markSnapshotPath);
      });
    });
  });
});
