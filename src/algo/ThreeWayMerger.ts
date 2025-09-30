import * as diff3 from "node-diff3";
import * as fastArrayDiff from "fast-array-diff";

// Define types for node-diff3 merge result
type Diff3Conflict = {
  a: string[]; // left version
  o: string[]; // base version
  b: string[]; // right version
};

type Diff3Result = {
  result: (string | Diff3Conflict)[];
  conflict: boolean;
};

export interface MergeResult {
  content: string;
  hasConflicts: boolean;
}

export class ThreeWayMerger {
  constructor() {
    // No initialization needed
  }

  /**
   * Merges three versions of a file using three-way merge algorithm
   * @param left - The left version of the file (can be undefined)
   * @param common - The base version of the file (can be undefined)
   * @param right - The right version of the file (required)
   * @returns MergeResult containing the merged content and conflict information
   * @throws Error if right is undefined
   */
  merge(
    left: string | undefined,
    base: string | undefined,
    right: string,
  ): MergeResult {
    // If left is undefined, use right as the result
    if (!left) {
      return { content: right, hasConflicts: false };
    }

    const common =
      base == null ? this.findCommon(left, right).join("\n") : base;

    // Perform three-way merge using node-diff3
    const result = diff3.merge(
      left.split("\n"),
      common.split("\n"),
      right.split("\n"),
    ) as Diff3Result;

    if (!result.conflict) {
      return {
        content: result.result.join("\n"),
        hasConflicts: false,
      };
    }

    // Process conflicts
    const mergedLines: string[] = [];

    for (const chunk of result.result) {
      if (typeof chunk === "string") {
        mergedLines.push(chunk);
      } else {
        // This is a conflict chunk
        const conflictChunk = chunk as Diff3Conflict;
        const { a, b } = conflictChunk;

        mergedLines.push("<<<<<<< LEFT");
        mergedLines.push(...a);
        mergedLines.push("=======");
        mergedLines.push(...b);
        mergedLines.push(">>>>>>> RIGHT");
      }
    }

    return {
      content: mergedLines.join("\n"),
      hasConflicts: true,
    };
  }

  /**
   * Finds common lines between two inputs, preserving duplicates and order
   * @param input1 - The first input string
   * @param input2 - The second input string
   * @returns Array of common lines found in both inputs
   */
  findCommon(input1: string, input2: string): string[] {
    if (!input1 || !input2) {
      return [];
    }

    const lines1 = input1.split("\n");
    const lines2 = input2.split("\n");

    // Use fast-array-diff to find the longest common subsequence
    // This gives us the LCS which represents the common elements in order
    return fastArrayDiff.same(lines1, lines2);
  }
}
