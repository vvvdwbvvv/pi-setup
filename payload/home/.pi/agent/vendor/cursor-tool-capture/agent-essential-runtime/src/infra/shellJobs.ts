import { readFileSync, writeFileSync, mkdirSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../core/types.js";

export interface ShellJobRecord {
  shellId: string;
  pid: number;
  outputPath: string;
  startedAt: number;
  completed: boolean;
  exitCode?: number;
  output: string;
}

function jobsPath(ctx: RuntimeContext): string {
  return join(ctx.stateDir, "shell-jobs.json");
}

function readJobs(ctx: RuntimeContext): Record<string, ShellJobRecord> {
  try {
    return JSON.parse(readFileSync(jobsPath(ctx), "utf8")) as Record<
      string,
      ShellJobRecord
    >;
  } catch {
    return {};
  }
}

function writeJobs(ctx: RuntimeContext, jobs: Record<string, ShellJobRecord>): void {
  mkdirSync(ctx.stateDir, { recursive: true });
  writeFileSync(jobsPath(ctx), `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
}

const running = new Map<string, ChildProcessWithoutNullStreams>();

export function registerShellJob(
  ctx: RuntimeContext,
  command: string,
  args: string[],
  cwd: string,
): string {
  const shellId = randomUUID();
  const child = spawn(command, args, { cwd, shell: false });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  const record: ShellJobRecord = {
    shellId,
    pid: child.pid ?? -1,
    outputPath: join(ctx.stateDir, `job-${shellId}.log`),
    startedAt: Date.now(),
    completed: false,
    output: "",
  };
  const jobs = readJobs(ctx);
  jobs[shellId] = record;
  writeJobs(ctx, jobs);
  running.set(shellId, child);
  child.on("close", (code) => {
    record.completed = true;
    record.exitCode = code ?? undefined;
    record.output = output;
    writeFileSync(record.outputPath, output, "utf8");
    const updated = readJobs(ctx);
    updated[shellId] = record;
    writeJobs(ctx, updated);
    running.delete(shellId);
  });
  return shellId;
}

export function getShellJob(
  ctx: RuntimeContext,
  shellId: string,
): ShellJobRecord | undefined {
  const jobs = readJobs(ctx);
  const job = jobs[shellId];
  if (!job) {
    return undefined;
  }
  if (!job.completed && running.has(shellId)) {
    const proc = running.get(shellId);
    if (proc && !job.output) {
      job.output = readPartialLog(job.outputPath);
    }
  }
  return job;
}

function readPartialLog(path: string): string {
  try {
    const fd = openSync(path, "r");
    const buf = Buffer.alloc(65536);
    const n = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    return buf.subarray(0, n).toString("utf8");
  } catch {
    return "";
  }
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
