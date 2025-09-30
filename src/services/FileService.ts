import { promises as fs, constants } from "fs";

type FileStats = {
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
  readable: boolean;
  writable: boolean;
  executable: boolean;
  lastAccessTime: Date;
};

export class FileService {
  private static instance: FileService;

  constructor() {}

  async readTextFile(path: string): Promise<string> {
    try {
      return await fs.readFile(path, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to read file ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    try {
      await fs.writeFile(path, content, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to write file ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async stats(path: string): Promise<FileStats> {
    try {
      const stats = await fs.stat(path);
      return {
        readable: (stats.mode & constants.S_IRUSR) !== 0,
        writable: (stats.mode & constants.S_IWUSR) !== 0,
        executable: (stats.mode & constants.S_IXUSR) !== 0,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink(),
        lastAccessTime: stats.atime,
      };
    } catch (error) {
      throw new Error(
        `Failed to get stats for ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async mkdir(path: string, recursive: boolean = false): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: recursive });
    } catch (error) {
      throw new Error(
        `Failed to create directory ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async touch(path: string): Promise<void> {
    try {
      if (await this.exists(path)) {
        await fs.utimes(path, new Date(), new Date());
        return;
      }

      await fs.writeFile(path, "");
    } catch (error) {
      throw new Error(
        `Failed to touch file ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async copyFile(from: string, to: string): Promise<void> {
    try {
      await fs.copyFile(from, to);
    } catch (error) {
      throw new Error(
        `Failed to copy file from ${from} to ${to}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async rename(from: string, to: string): Promise<void> {
    try {
      await fs.rename(from, to);
    } catch (error) {
      throw new Error(
        `Failed to rename file from ${from} to ${to}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }
}
