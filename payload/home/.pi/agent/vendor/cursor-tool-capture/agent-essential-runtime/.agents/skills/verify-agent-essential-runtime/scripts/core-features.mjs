import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const coreFeatures = {
  doctor: { toolIds: [] },
  discovery: { toolIds: [] },
  todos: {
    toolIds: ['TodoWrite'],
    async run(ctx) {
      const initial = [{ id: 'first', content: 'Inspect runtime', status: 'pending' }, { id: 'second', content: 'Capture proof', status: 'pending' }];
      await ctx.call('TodoWrite', { merge: false, todos: initial });
      assert.deepEqual(ctx.stored('todos.json'), initial);
      ctx.save('todos-before.json', initial);
      const updates = [{ ...initial[0], status: 'completed' }, { id: 'third', content: 'Retain evidence', status: 'in_progress' }];
      const merged = await ctx.call('TodoWrite', { merge: true, todos: updates });
      const expected = [updates[0], initial[1], updates[1]];
      assert.deepEqual(merged.todos, expected);
      assert.deepEqual(ctx.stored('todos.json'), expected);
      await ctx.call('TodoWrite', { merge: false, todos: [initial[0]] }, 'validation_error');
      assert.deepEqual(ctx.stored('todos.json'), expected);
    },
  },
  delete: {
    toolIds: ['Delete'],
    async run(ctx) {
      const victim = join(ctx.workspace, 'delete-me.txt');
      const outside = join(ctx.scratch, 'outside.txt');
      writeFileSync(victim, 'disposable fixture');
      writeFileSync(outside, 'must survive denied deletion');
      ctx.save('delete-before.json', { victim, contents: readFileSync(victim, 'utf8'), outside, outsideContents: readFileSync(outside, 'utf8') });
      await ctx.call('Delete', { path: victim });
      assert.equal(existsSync(victim), false);
      await ctx.call('Delete', { path: victim }, 'not_found');
      await ctx.call('Delete', { path: outside }, 'security_denied');
      assert.equal(readFileSync(outside, 'utf8'), 'must survive denied deletion');
      ctx.save('delete-after.json', { victimExists: existsSync(victim), outsideContents: readFileSync(outside, 'utf8') });
    },
  },
  goals: {
    toolIds: ['CreateGoal', 'UpdateGoal'],
    async run(ctx) {
      await ctx.call('UpdateGoal', { status: 'complete' }, 'not_found');
      const created = await ctx.call('CreateGoal', { objective: 'Prove isolated runtime behavior' });
      assert.equal(created.objective, 'Prove isolated runtime behavior');
      assert.equal(created.status, 'active');
      assert.match(created.goalId, /^[0-9a-f-]{36}$/);
      assert.deepEqual(ctx.stored('goal.json'), created);
      ctx.save('goal-before.json', created);
      const updated = await ctx.call('UpdateGoal', { status: 'complete' });
      assert.equal(updated.goalId, created.goalId);
      assert.deepEqual(ctx.stored('goal.json'), { ...created, status: 'complete' });
    },
  },
};
