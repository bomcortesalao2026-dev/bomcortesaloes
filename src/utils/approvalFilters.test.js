import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultApprovalStatus, getDefaultValeStatus } from './approvalFilters.ts';

test('gerente should see all approval items by default', () => {
  assert.equal(getDefaultApprovalStatus('GERENTE'), 'ALL');
  assert.equal(getDefaultValeStatus('GERENTE'), 'ALL');
});

test('admin should keep pending-first behavior by default', () => {
  assert.equal(getDefaultApprovalStatus('ADMIN'), 'PENDENTE');
  assert.equal(getDefaultValeStatus('ADMIN'), 'PENDENTE');
});
