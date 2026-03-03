import { promises as fs } from "node:fs";
import path from "node:path";
import { compareNormalizedPaths } from "../../lib/fs-utils.js";
import { isCodeFile, isTestFilePath, normalizeToPosix, toProjectRelativePath } from "./path-utils.js";
const ignoredDirs = new Set(["node_modules", ".git", "dist", ".data", ".workspace"]);
export async function collectProductionFiles(projectRoot) {
    const root = path.resolve(projectRoot);
    const sourceRoot = path.join(root, "src");
    const files = [];
    async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries.sort((left, right) => compareNormalizedPaths(left.name, right.name))) {
            if (ignoredDirs.has(entry.name)) {
                continue;
            }
            const absolute = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolute);
                continue;
            }
            if (!isCodeFile(absolute)) {
                continue;
            }
            const relative = normalizeToPosix(toProjectRelativePath(root, absolute));
            if (isTestFilePath(relative)) {
                continue;
            }
            files.push({
                absolutePath: path.resolve(absolute),
                relativePath: relative
            });
        }
    }
    try {
        await walk(sourceRoot);
    }
    catch (error) {
        const maybeErr = error;
        if (maybeErr && maybeErr.code === "ENOENT") {
            return [];
        }
        throw error;
    }
    files.sort((a, b) => compareNormalizedPaths(a.relativePath, b.relativePath));
    return files;
}
