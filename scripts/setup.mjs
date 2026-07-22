import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline/promises'
import { createDefaultState, PLATFORMS, stateExists, stateFilePath, writeState } from '../shared/state-store.mjs'

const args = process.argv.slice(2)
const configIndex = args.indexOf('--config')
const force = args.includes('--force')

async function fromConfig(file) {
  const config = JSON.parse(await fs.readFile(path.resolve(file), 'utf8'))
  return config
}

async function fromQuestions() {
  if (!process.stdin.isTTY) throw new Error('当前不是交互终端，请使用 --config ./setup.local.json')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (question, fallback) => (await rl.question(`${question}${fallback !== undefined ? `（默认：${fallback}）` : ''}：`)).trim() || String(fallback ?? '')
  const ownerName = await ask('怎么称呼你', '创作者')
  const positioning = await ask('你的内容定位', '记录真实经验，持续复盘增长')
  const primaryPlatform = await ask(`主要平台 ${PLATFORMS.join('/')}`, '抖音')
  const initialFollowers = Number(await ask('当前粉丝数', 0))
  const targetFollowers = Number(await ask('目标粉丝数', Math.max(1000, initialFollowers + 1000)))
  const startDate = await ask('计划开始日期 YYYY-MM-DD', new Date().toISOString().slice(0, 10))
  const endDate = await ask('计划结束日期 YYYY-MM-DD', startDate)
  rl.close()
  return { ownerName, positioning, primaryPlatform, initialFollowers, currentFollowers: initialFollowers, targetFollowers, startDate, endDate }
}

if (await stateExists() && !force) throw new Error(`已经存在本地数据：${stateFilePath()}。为避免覆盖，请先备份；确认重建时使用 --force。`)
const config = configIndex >= 0 ? await fromConfig(args[configIndex + 1]) : await fromQuestions()
if (!PLATFORMS.includes(config.primaryPlatform)) throw new Error(`不支持的平台：${config.primaryPlatform}`)
for (const key of ['initialFollowers', 'currentFollowers', 'targetFollowers']) {
  if (!Number.isFinite(Number(config[key])) || Number(config[key]) < 0) throw new Error(`${key} 必须是非负数字`)
}
const settings = {
  productName: config.productName || '自媒体增长驾驶舱',
  productSubtitle: config.productSubtitle || '内容即资产 · 复利增长',
  ownerName: config.ownerName,
  positioning: config.positioning,
  goalName: config.goalName || '我的内容增长计划',
  primaryPlatform: config.primaryPlatform,
  initialFollowers: Number(config.initialFollowers),
  currentFollowers: Number(config.currentFollowers ?? config.initialFollowers),
  targetFollowers: Number(config.targetFollowers),
  startDate: config.startDate,
  endDate: config.endDate,
  articleTarget: Number(config.articleTarget ?? 4),
  videoTarget: Number(config.videoTarget ?? 20),
  publishTarget: Number(config.publishTarget ?? 20),
}
await writeState(createDefaultState({ settings }))
console.log(`初始化完成：${stateFilePath()}`)
console.log('下一步运行：npm run build && npm start')
