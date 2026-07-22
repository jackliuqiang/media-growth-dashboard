import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const SCHEMA_VERSION = 1
export const PLATFORMS = ['公众号', '小红书', '抖音', '视频号', 'B 站', 'X']
export const CONTENT_FORMATS = ['文章', '短视频口播', '图文卡片', '直播稿', '系列']
export const CONTENT_STATUSES = ['候选选题', '已立项', '待发布', '已发布', '待复盘', '已复盘', '已归档']
export const PUBLICATION_RESULTS = ['正常发布', '违规', '仅自己可见', '已删除']

function dateValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function addDays(value, days) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dateValue(date)
}

export function createDefaultState(overrides = {}) {
  const today = dateValue()
  const settings = {
    productName: '自媒体增长驾驶舱',
    productSubtitle: '内容即资产 · 复利增长',
    ownerName: '创作者',
    positioning: '记录真实经验，持续复盘增长',
    goalName: '我的内容增长计划',
    primaryPlatform: '抖音',
    initialFollowers: 0,
    currentFollowers: 0,
    targetFollowers: 1000,
    startDate: today,
    endDate: addDays(today, 30),
    articleTarget: 4,
    videoTarget: 20,
    publishTarget: 20,
    ...overrides.settings,
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    contents: Array.isArray(overrides.contents) ? overrides.contents : [],
    inspirations: Array.isArray(overrides.inspirations) ? overrides.inspirations : [],
    reviews: Array.isArray(overrides.reviews) ? overrides.reviews : [],
    tasks: Array.isArray(overrides.tasks) ? overrides.tasks : [],
  }
}

export function normalizeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('驾驶舱数据必须是对象')
  const normalized = createDefaultState(value)
  normalized.schemaVersion = SCHEMA_VERSION
  normalized.contents = normalized.contents.map((item) => ({ ...item, publicationRecords: Array.isArray(item.publicationRecords) ? item.publicationRecords : [] }))
  return normalized
}

export function stateRoot() {
  return path.resolve(process.env.MEDIA_DASHBOARD_HOME || path.join(os.homedir(), '.media-growth-dashboard'))
}

export function stateFilePath() {
  return path.join(stateRoot(), 'state.json')
}

export async function stateExists() {
  try {
    await fs.access(stateFilePath())
    return true
  } catch {
    return false
  }
}

export async function readState({ create = true } = {}) {
  try {
    return normalizeState(JSON.parse(await fs.readFile(stateFilePath(), 'utf8')))
  } catch (error) {
    if (error?.code !== 'ENOENT' || !create) throw error
    const state = createDefaultState()
    await writeState(state)
    return state
  }
}

export async function writeState(value) {
  const state = normalizeState(value)
  const root = stateRoot()
  const target = stateFilePath()
  await fs.mkdir(root, { recursive: true, mode: 0o700 })
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await fs.rename(temporary, target)
  return state
}

export async function updateState(updater) {
  const current = await readState()
  const next = await updater(structuredClone(current))
  return writeState(next)
}

export function localDateTime(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function addHours(value, hours) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('发布时间格式无效，请使用 YYYY-MM-DDTHH:mm')
  date.setHours(date.getHours() + hours)
  return localDateTime(date)
}
