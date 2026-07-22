import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const cli = path.join(projectRoot, 'scripts/cockpit.mjs')

function run(root, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: projectRoot,
    env: { ...process.env, MEDIA_DASHBOARD_HOME: root },
    encoding: 'utf8',
  })
}

test('Agent CLI 不能绕过发布凭证直接写入已发布', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-dashboard-cli-'))
  const added = run(root, ['content:add', '--title', '测试内容', '--platform', '抖音'])
  assert.equal(added.status, 0, added.stderr)
  const status = run(root, ['status'])
  const contentId = JSON.parse(status.stdout.slice(status.stdout.indexOf('{'))).contents[0].id

  const bypass = run(root, ['content:update', '--id', contentId, '--status', '已发布'])
  assert.notEqual(bypass.status, 0)
  assert.match(bypass.stderr, /必须通过 publish:add/)

  const noProof = run(root, ['publish:add', '--id', contentId, '--platform', '抖音'])
  assert.notEqual(noProof.status, 0)
  assert.match(noProof.stderr, /至少填写一项/)

  const published = run(root, ['publish:add', '--id', contentId, '--platform', '抖音', '--time', '2026-07-22T10:00', '--evidence', '测试截图'])
  assert.equal(published.status, 0, published.stderr)
  assert.match(published.stdout, /复盘时间 2026-07-24 10:00/)
  await fs.rm(root, { recursive: true, force: true })
})
