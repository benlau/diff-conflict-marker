import git from "isomorphic-git";
import fs from "fs";
import path from "path";

export class GitService {
  private static instance: GitService;

  private constructor() {}

  public static getInstance(): GitService {
    if (!GitService.instance) {
      GitService.instance = new GitService();
    }
    return GitService.instance;
  }

  public async findGitRoot(startPath: string): Promise<string> {
    const dir = await git.findRoot({
      fs,
      filepath: startPath,
    });
    return dir;
  }

  // Get the latest content of the file from the git index or HEAD
  public async getLatestFileContent(
    gitRootPath: string,
    filePath: string,
  ): Promise<string> {
    const gitdir = path.join(gitRootPath, ".git");
    const relativePath = path.relative(gitRootPath, filePath);

    const contents = await git.walk({
      fs,
      dir: gitRootPath,
      gitdir,
      trees: [git.STAGE()],
      map: async function (filepath, [stage]) {
        if (filepath === relativePath) {
          if (stage) {
            const oid = await stage.oid();
            const { blob } = await git.readBlob({
              fs,
              dir: gitRootPath,
              gitdir,
              oid,
            });
            return Buffer.from(blob).toString("utf8");
          }
        }
      },
    });

    const fileContent = contents.find((content: any) => content !== undefined);
    if (!fileContent) {
      throw new Error("Could not find the specified file in the git index.");
    }
    return fileContent || null;
  }
}
