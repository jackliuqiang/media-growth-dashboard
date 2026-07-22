import {
  addHours,
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  localDateTime,
  PLATFORMS,
  PUBLICATION_RESULTS,
  readState,
  updateState,
} from '../shared/state-store.mjs'

const [command = 'help', ...rawArgs] = process.argv.slice(2)

function options(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = values[index + 1]
    parsed[key] = next && !next.startsWith('--') ? next : true
    if (parsed[key] !== true) index += 1
  }
  return parsed
}

function required(value, label) {
  if (!value || value === true) throw new Error(`缺少参数 --${label}`)
  return String(value).trim()
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function findContent(state, contentId) {
  const item = state.contents.find((entry) => entry.id === contentId)
  if (!item) throw new Error(`找不到内容：${contentId}`)
  return item
}

function printHelp() {
  console.log(`自媒体增长驾驶舱 CLI

  npm run cockpit -- status
  npm run cockpit -- idea:add --title "标题" --text "原始想法"
  npm run cockpit -- content:add --title "标题" --format "短视频口播" --platform "抖音"
  npm run cockpit -- content:update --id "内容ID" --status "待发布" --next "下一步"
  npm run cockpit -- publish:add --id "内容ID" --platform "抖音" --time "2026-07-22T17:00" --result "正常发布" --url "https://..."
  npm run cockpit -- review:add --id "内容ID" --summary "复盘摘要" --findings "核心发现" --next "下次动作" --confirm
  npm run cockpit -- task:add --title "今日任务" --note "时间或说明"

发布凭证可使用 --url、--work-id 或 --evidence，至少填写一项。`)
}

const args = options(rawArgs)

if (command === 'help' || command === '--help') {
  printHelp()
} else if (command === 'status') {
  const state = await readState()
  console.log(JSON.stringify({
    owner: state.settings.ownerName,
    goal: state.settings.goalName,
    ideas: state.inspirations.length,
    contents: state.contents.map((item) => ({ id: item.id, title: item.title, status: item.status, nextAction: item.nextAction })),
    pendingReviews: state.contents.filter((item) => item.status === '待复盘').length,
    tasks: state.tasks.filter((item) => !item.done),
  }, null, 2))
} else if (command === 'idea:add') {
  const title = required(args.title, 'title')
  const text = required(args.text, 'text')
  const state = await updateState((current) => {
    current.inspirations.unshift({ id: id('idea'), title, originalText: text, source: '本地 AI', status: '待筛选', updatedAt: new Date().toISOString().slice(0, 10), testRecords: [] })
    return current
  })
  console.log(`已记录灵感：${state.inspirations[0].id}`)
} else if (command === 'content:add') {
  const title = required(args.title, 'title')
  const format = String(args.format || '短视频口播')
  if (!CONTENT_FORMATS.includes(format)) throw new Error(`不支持的内容形态：${format}`)
  const state = await updateState((current) => {
    const platform = String(args.platform || current.settings.primaryPlatform)
    if (!PLATFORMS.includes(platform)) throw new Error(`不支持的平台：${platform}`)
    current.contents.unshift({
      id: id('content'),
      title,
      summary: String(args.summary || ''),
      status: '候选选题',
      format,
      channels: [platform],
      nextAction: String(args.next || '完成选题判断'),
      dueAt: args.due ? String(args.due) : null,
      publicationRecords: [],
    })
    return current
  })
  console.log(`已新增内容：${state.contents[0].id}`)
} else if (command === 'content:update') {
  const contentId = required(args.id, 'id')
  const state = await updateState((current) => {
    const item = findContent(current, contentId)
    if (args.status) {
      const status = String(args.status)
      if (!CONTENT_STATUSES.includes(status)) throw new Error(`不支持的状态：${status}`)
      if (['已发布', '待复盘', '已复盘'].includes(status)) throw new Error('发布和复盘状态必须通过 publish:add 或 review:add 生成')
      item.status = status
    }
    if (args.next) item.nextAction = String(args.next)
    if (args.due) item.dueAt = String(args.due)
    return current
  })
  console.log(`已更新内容：${findContent(state, contentId).title}`)
} else if (command === 'publish:add') {
  const contentId = required(args.id, 'id')
  const actualPublishedAt = String(args.time || localDateTime())
  const result = String(args.result || '正常发布')
  const url = args.url ? String(args.url).trim() : ''
  const workId = args['work-id'] ? String(args['work-id']).trim() : ''
  const evidenceRef = args.evidence ? String(args.evidence).trim() : ''
  if (!PUBLICATION_RESULTS.includes(result)) throw new Error(`不支持的发布结果：${result}`)
  if (!url && !workId && !evidenceRef) throw new Error('发布链接、作品 ID、证据说明至少填写一项')
  if (url && !url.startsWith('https://')) throw new Error('发布链接必须以 https:// 开头')
  const state = await updateState((current) => {
    const item = findContent(current, contentId)
    const platform = String(args.platform || item.channels[0] || current.settings.primaryPlatform)
    if (!PLATFORMS.includes(platform)) throw new Error(`不支持的平台：${platform}`)
    const reviewDueAt = addHours(actualPublishedAt, 48)
    item.publicationRecords.unshift({ id: id('publication'), platform, actualPublishedAt, url: url || undefined, workId: workId || undefined, evidenceRef: evidenceRef || undefined, result, verified: true, reviewDueAt })
    item.status = '已发布'
    item.publishedAt = actualPublishedAt.replace('T', ' ')
    item.dueAt = reviewDueAt.slice(0, 10)
    item.nextAction = result === '正常发布' ? `等待 48 小时数据，${reviewDueAt.replace('T', ' ')} 开始复盘` : `记录“${result}”原因，保留证据并进入异常复盘`
    if (!item.channels.includes(platform)) item.channels.push(platform)
    return current
  })
  const item = findContent(state, contentId)
  console.log(`发布登记完成：${item.title}；复盘时间 ${item.publicationRecords[0].reviewDueAt.replace('T', ' ')}`)
} else if (command === 'review:add') {
  const contentId = required(args.id, 'id')
  const summary = required(args.summary, 'summary')
  const findings = required(args.findings, 'findings')
  const nextAction = required(args.next, 'next')
  const confirmed = args.confirm === true
  const state = await updateState((current) => {
    const item = findContent(current, contentId)
    current.reviews.unshift({ id: id('review'), kind: '内容复盘', title: `${item.title}：发布后复盘`, platform: item.channels[0] || current.settings.primaryPlatform, confirmation: confirmed ? '已确认' : '待人工确认', summary, findings, nextAction, updatedAt: new Date().toISOString().slice(0, 10) })
    item.status = confirmed ? '已复盘' : '待复盘'
    item.nextAction = confirmed ? nextAction : '确认复盘结论后沉淀经验'
    return current
  })
  console.log(`复盘已保存：${state.reviews[0].title}`)
} else if (command === 'task:add') {
  const title = required(args.title, 'title')
  const state = await updateState((current) => {
    current.tasks.push({ id: id('task'), title, note: String(args.note || '待安排'), done: false })
    return current
  })
  console.log(`已添加今日任务：${state.tasks.at(-1).title}`)
} else {
  printHelp()
  process.exitCode = 1
}
