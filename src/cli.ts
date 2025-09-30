#!/usr/bin/env node

import { program } from "commander";
import { FileService } from "./services/FileService";
import { GitService } from "./lib/GitService";
import { ThreeWayMerger } from "./algo/ThreeWayMerger";
import path from "path";
import { DiffMarker } from "./algo/DiffMarker";

const fileService = FileService.getInstance();
const gitService = GitService.getInstance();
const merger = new ThreeWayMerger();
const diffMarker = new DiffMarker(merger);

program
  .version("0.1.1")
  .description("A tool to diff a file and create merge conflict markers")
  .arguments("<file>")
  .option("-o, --orig <original_file>", "The original file to compare against")
  .option(
    "-d, --dry-run",
    "Print the diff to stdout without writing to the file",
  )
  .option("--backup", "Create a backup of the target file before modifying it")
  .action(async (file, options) => {
    const modifiedFilePath = path.resolve(file);
    if (!(await fileService.exists(modifiedFilePath))) {
      console.error(`File not found: ${modifiedFilePath}`);
      process.exit(1);
    }

    const stats = await fileService.stats(modifiedFilePath);
    if (stats.isDirectory) {
      console.error(`Cannot process a directory: ${modifiedFilePath}`);
      process.exit(1);
    }

    try {
      const modifiedContent = await fileService.readTextFile(modifiedFilePath);
      let originalContent: string;

      if (options.orig) {
        const originalFilePath = path.resolve(options.orig);
        if (!(await fileService.exists(originalFilePath))) {
          console.error(`Original file not found: ${originalFilePath}`);
          process.exit(1);
        }
        originalContent = await fileService.readTextFile(originalFilePath);
      } else {
        const gitRoot = await gitService.findGitRoot(modifiedFilePath);
        originalContent = await gitService.getLatestFileContent(
          gitRoot,
          modifiedFilePath,
        );
      }

      const result = diffMarker.mark(originalContent, modifiedContent);

      if (!result.hasConflicts) {
        console.log(`No differences found.`);
        return;
      }

      if (options.dryRun) {
        console.log(result.content);
      } else {
        if (options.backup) {
          await writeBackup(modifiedFilePath);
        }
        await fileService.writeTextFile(modifiedFilePath, result.content);
        console.log("Successfully added conflict markers to the file.");
      }
    } catch (error: any) {
      if (error.code === "NotFoundError" && error.caller === "git.findRoot") {
        console.error(
          "Could not find the .git directory. To compare with a local file, use the --orig flag.",
        );
      } else {
        console.error("An unexpected error occurred:", error);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);

async function writeBackup(file: string) {
  const backupPath = `${file}.bk`;
  if (await fileService.exists(backupPath)) {
    let i = 1;
    let nextBackupPath;
    while (true) {
      nextBackupPath = `${file}.bk-${String(i).padStart(3, "0")}`;
      if (!(await fileService.exists(nextBackupPath))) {
        break;
      }
      i++;
    }
    // Shift existing backups
    for (let j = i; j > 1; j--) {
      const currentPath = `${file}.bk-${String(j - 1).padStart(3, "0")}`;
      const nextPath = `${file}.bk-${String(j).padStart(3, "0")}`;
      await fileService.rename(currentPath, nextPath);
    }
    await fileService.rename(
      backupPath,
      `${file}.bk-${String(1).padStart(3, "0")}`,
    );
  }
  await fileService.copyFile(file, backupPath);
}
