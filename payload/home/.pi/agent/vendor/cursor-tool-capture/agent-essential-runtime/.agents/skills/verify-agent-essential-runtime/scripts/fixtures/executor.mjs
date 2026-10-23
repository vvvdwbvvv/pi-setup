#!/usr/bin/env node
import { appendFileSync } from 'node:fs';

const payload = JSON.parse(process.argv[2]);
const receipt = { pid: process.pid, cwd: process.cwd(), payload };
appendFileSync(process.env.VERIFY_EXECUTOR_RECEIPT, JSON.stringify(receipt) + '\n');
if (payload.prompt === 'fail fixture') {
  process.stderr.write('Fixture executor failure\n');
  process.exitCode = 7;
} else {
  process.stdout.write('Fixture executor completed\n');
}
