import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

test('本地状态可以创建、保存并重新读取', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-dashboard-test-'))
  process.env.MEDIA_DASHBOARD_HOME = root
  const module = await import(`../../shared/state-store.mjs?test=${Date.now()}`)
  const initial = module.createDefaultState({ settings: { ownerName: '测试用户' } })
  await module.writeState(initial)
  const saved = await module.readState()
  assert.equal(saved.settings.ownerName, '测试用户')
  assert.deepEqual(saved.contents, [])
  await fs.rm(root, { recursive: true, force: true })
})

test('复盘时间按发布后 48 小时计算', async () => {
  const module = await import('../../shared/state-store.mjs')
  assert.equal(module.addHours('2026-07-22T10:00', 48), '2026-07-24T10:00')
})
