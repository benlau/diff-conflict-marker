import { MergeResult, ThreeWayMerger } from "./ThreeWayMerger";
import * as fastArrayDiff from "fast-array-diff";

class FastArrayDiffPatchMonad {
  data: fastArrayDiff.Patch<string>;

  constructor(data: fastArrayDiff.Patch<string>) {
    this.data = data;
  }

  next(index: number): fastArrayDiff.PatchItem<string> | null {
    const newIndex = index + 1;
    if (newIndex >= this.data.length) {
      return null;
    }
    return this.data[newIndex];
  }

  isReplace(index: number): boolean {
    const nextItem = this.next(index);
    const currentItem = this.data[index];
    return (
      currentItem.type === "remove" &&
      nextItem?.type === "add" &&
      currentItem.oldPos + currentItem.items.length === nextItem.oldPos
    );
  }
}

type DiffMarkerPatch = {
  steps: fastArrayDiff.Patch<string>;
  result: string;
};

export class DiffMarker {
  merger: ThreeWayMerger;

  constructor(merger: ThreeWayMerger) {
    this.merger = merger;
  }

  // Patch to add new lines to the input to prepare for adding conflict markers
  patchNewLines(original: string, modified: string): DiffMarkerPatch {
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");

    let steps = fastArrayDiff.getPatch(originalLines, modifiedLines);
    const monad = new FastArrayDiffPatchMonad(steps);

    const newSteps: fastArrayDiff.Patch<string> = [];
    let currentIndex = 0;
    let dNewPos = 0;

    while (currentIndex < steps.length) {
      const currentStep = steps[currentIndex];
      if (currentStep.type === "add") {
        newSteps.push({
          ...currentStep,
          newPos: currentStep.newPos + dNewPos,
          items: [""],
        });
        dNewPos -= currentStep.items.length - 1;
      } else if (monad.isReplace(currentIndex)) {
        const nextStep = monad.next(currentIndex);
        const dLength = nextStep!.items.length - currentStep.items.length;
        currentIndex++;
        dNewPos -= dLength;
      } else {
        // A simple remove
        dNewPos += currentStep.items.length;
      }
      currentIndex++;
    }

    const result = fastArrayDiff.applyPatch(originalLines, newSteps);

    return {
      steps: newSteps,
      result: result.join("\n"),
    };
  }

  mark(original: string, modified: string): MergeResult {
    const normalized = (input: string) => {
      if (input === "") {
        return "\n";
      }
      return input;
    };
    const common = this.merger.findCommon(original, modified).join("\n");

    const patchedOriginal = normalized(
      this.patchNewLines(original, modified).result,
    );
    const patchedModified = normalized(
      this.patchNewLines(modified, patchedOriginal).result,
    );

    return this.merger.merge(patchedOriginal, common, patchedModified);
  }
}
