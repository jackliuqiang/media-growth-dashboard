import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArchiveBox,
  ArrowRight,
  CalendarBlank,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  FileText,
  Gear,
  Lightbulb,
  List,
  MagnifyingGlass,
  MusicNote,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  SquaresFour,
  Target,
  TrendUp,
  UserCircle,
  VideoCamera,
  X,
} from 'phosphor-react'
import './App.css'

type PageId = 'growth' | 'inbox' | 'content' | 'reviews'
type ViewMode = 'board' | 'table'
type ContentFormat = '文章' | '短视频口播' | '图文卡片' | '直播稿' | '系列'
type ContentStatus = '候选选题' | '已立项' | '待发布' | '已发布' | '待复盘' | '已复盘' | '已归档'
type Platform = '公众号' | '小红书' | '抖音' | '视频号' | 'B 站' | 'X'
type InspirationStatus = '待筛选' | '已转选题' | '已归档'
type ReviewKind = '内容复盘' | '账号拆解'
type ReviewConfirmation = '待人工确认' | '已确认'
type PublicationResult = '正常发布' | '违规' | '仅自己可见' | '已删除'

type PublicationRecord = {
  id: string
  platform: Platform
  actualPublishedAt: string
  url?: string
  workId?: string
  evidenceRef?: string
  result: PublicationResult
  verified: boolean
  reviewDueAt: string
}

type ContentItem = {
  id: string
  title: string
  summary: string
  status: ContentStatus
  format: ContentFormat
  channels: Platform[]
  nextAction: string
  dueAt: string | null
  publishedAt?: string
  duration?: string
  publicationRecords: PublicationRecord[]
}

type Inspiration = {
  id: string
  title: string
  originalText: string
  source: string
  status: InspirationStatus
  updatedAt: string
  sourceUrl?: string
  testRecords: string[]
  hasPreview?: boolean
}

type ReviewItem = {
  id: string
  kind: ReviewKind
  title: string
  platform: string
  confirmation: ReviewConfirmation
  summary: string
  findings: string
  nextAction: string
  updatedAt: string
}

type TodayTask = { id: string; title: string; note: string; done: boolean }

type ProfileSettings = {
  productName: string
  productSubtitle: string
  ownerName: string
  positioning: string
  goalName: string
  primaryPlatform: Platform
  initialFollowers: number
  currentFollowers: number
  targetFollowers: number
  startDate: string
  endDate: string
  articleTarget: number
  videoTarget: number
  publishTarget: number
}

type CockpitState = {
  schemaVersion: number
  settings: ProfileSettings
  contents: ContentItem[]
  inspirations: Inspiration[]
  reviews: ReviewItem[]
  tasks: TodayTask[]
}

const CONTENT_FORMATS: ContentFormat[] = ['文章', '短视频口播', '图文卡片', '直播稿', '系列']
const PLATFORMS: Platform[] = ['公众号', '小红书', '抖音', '视频号', 'B 站', 'X']
const CONTENT_STATUSES: ContentStatus[] = ['候选选题', '已立项', '待发布', '已发布', '待复盘', '已复盘', '已归档']
const MANUAL_CONTENT_STATUSES: ContentStatus[] = ['候选选题', '已立项', '待发布', '已归档']
const PUBLICATION_RESULTS: PublicationResult[] = ['正常发布', '违规', '仅自己可见', '已删除']

const navItems = [
  { id: 'growth' as const, label: '增长总览', icon: TrendUp },
  { id: 'inbox' as const, label: '灵感收件箱', icon: Lightbulb },
  { id: 'content' as const, label: '内容工作台', icon: SquaresFour },
  { id: 'reviews' as const, label: '复盘与对标', icon: ChartBar },
]

const phases: Array<{ id: string; label: string; description: string; statuses: ContentStatus[]; empty: string }> = [
  { id: 'topic', label: '选题', description: '候选选题 · 已立项', statuses: ['候选选题', '已立项'], empty: '还没有选题' },
  { id: 'publish', label: '发布', description: '待发布 · 已发布', statuses: ['待发布', '已发布'], empty: '暂无待发布内容' },
  { id: 'review', label: '复盘', description: '待复盘 · 已复盘', statuses: ['待复盘', '已复盘'], empty: '暂无待复盘内容' },
]

const initialSettings: ProfileSettings = {
  productName: '自媒体增长驾驶舱',
  productSubtitle: '内容即资产 · 复利增长',
  ownerName: '创作者',
  positioning: '记录真实经验，持续复盘增长',
  goalName: '我的内容增长计划',
  primaryPlatform: '抖音',
  initialFollowers: 0,
  currentFollowers: 0,
  targetFollowers: 1000,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  articleTarget: 4,
  videoTarget: 20,
  publishTarget: 20,
}

const initialContent: ContentItem[] = []
const initialInspirations: Inspiration[] = []
const initialReviews: ReviewItem[] = []

function App() {
  const [page, setPage] = useState<PageId>('growth')
  const [settings, setSettings] = useState(initialSettings)
  const [contents, setContents] = useState(initialContent)
  const [inspirations, setInspirations] = useState(initialInspirations)
  const [reviews, setReviews] = useState(initialReviews)
  const [tasks, setTasks] = useState<TodayTask[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [persistenceStatus, setPersistenceStatus] = useState('正在连接本地数据')
  const lastStateRef = useRef('')

  useEffect(() => {
    let active = true
    const applyState = (state: CockpitState) => {
      if (!active) return
      lastStateRef.current = JSON.stringify(state)
      setSettings(state.settings)
      setContents(state.contents)
      setInspirations(state.inspirations)
      setReviews(state.reviews)
      setTasks(state.tasks)
      setDataReady(true)
      setPersistenceStatus('本地数据已保存')
    }
    const load = async () => {
      try {
        const response = await fetch('/api/state', { cache: 'no-store' })
        if (!response.ok) throw new Error('读取本地数据失败')
        applyState(await response.json() as CockpitState)
      } catch {
        if (active) {
          setDataReady(true)
          setPersistenceStatus('本地数据服务未连接')
        }
      }
    }
    void load()
    const events = new EventSource('/api/events')
    events.addEventListener('state', () => void load())
    events.onerror = () => active && setPersistenceStatus('等待本地数据服务')
    return () => { active = false; events.close() }
  }, [])

  useEffect(() => {
    if (!dataReady) return
    const state: CockpitState = { schemaVersion: 1, settings, contents, inspirations, reviews, tasks }
    const serialized = JSON.stringify(state)
    if (serialized === lastStateRef.current) return
    setPersistenceStatus('正在保存')
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: serialized })
        if (!response.ok) throw new Error('保存失败')
        lastStateRef.current = serialized
        setPersistenceStatus('本地数据已保存')
      } catch {
        setPersistenceStatus('保存失败，请检查本地服务')
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [contents, dataReady, inspirations, reviews, settings, tasks])

  const convertInspiration = (item: Inspiration, format: ContentFormat, channel: Platform) => {
    setInspirations((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: '已转选题' } : entry))
    setContents((current) => current.some((entry) => entry.id === `from-${item.id}`) ? current : [{
      id: `from-${item.id}`,
      title: item.title,
      summary: item.originalText,
      status: '候选选题',
      format,
      channels: [channel],
      nextAction: '完成选题判断',
      dueAt: null,
      publicationRecords: [],
    }, ...current])
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} settings={settings} persistenceStatus={persistenceStatus} />
      <div className="workspace">
        <TopBar settings={settings} onSettings={() => setShowSettings(true)} />
        <main className="main-content">
          {page === 'growth' && <GrowthPage settings={settings} onSettingsChange={setSettings} contents={contents} tasks={tasks} onTasksChange={setTasks} onOpenContent={() => setPage('content')} />}
          {page === 'inbox' && <InspirationPage items={inspirations} onChange={setInspirations} onConvert={convertInspiration} />}
          {page === 'content' && <ContentPage items={contents} onChange={setContents} />}
          {page === 'reviews' && <ReviewsPage items={reviews} onChange={setReviews} contents={contents} />}
        </main>
      </div>
      {showSettings && <SettingsDrawer settings={settings} onClose={() => setShowSettings(false)} onSave={(next) => { setSettings(next); setShowSettings(false) }} />}
    </div>
  )
}

function Sidebar({ page, onNavigate, settings, persistenceStatus }: { page: PageId; onNavigate: (page: PageId) => void; settings: ProfileSettings; persistenceStatus: string }) {
  return <aside className="sidebar" aria-label="主导航">
    <div className="brand-block"><strong>{settings.productName}</strong><span>{settings.productSubtitle}</span></div>
    <nav className="sidebar-nav">{navItems.map((item, index) => {
      const Icon = item.icon
      const active = item.id === page
      return <button key={item.id} className={`nav-button${active ? ' is-active' : ''}`} type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
        <span className="nav-index">{String(index + 1).padStart(2, '0')}</span><Icon size={20} weight={active ? 'fill' : 'regular'} /><span>{item.label}</span>
      </button>
    })}</nav>
    <div className="sidebar-status"><div className={`local-state${persistenceStatus.includes('失败') || persistenceStatus.includes('未连接') ? ' has-error' : ''}`}><i /><span>{persistenceStatus}</span></div><div className="owner-block"><UserCircle size={34} weight="duotone" /><span><strong>{settings.ownerName}</strong><small>{settings.positioning}</small></span></div></div>
  </aside>
}

function TopBar({ settings, onSettings }: { settings: ProfileSettings; onSettings: () => void }) {
  const growthTarget = Math.max(0, settings.targetFollowers - settings.initialFollowers)
  const grown = settings.currentFollowers - settings.initialFollowers
  const remaining = Math.max(0, settings.targetFollowers - settings.currentFollowers)
  const progress = growthTarget > 0 ? Math.max(0, Math.min(100, grown / growthTarget * 100)) : 100
  return <header className="topbar"><p>{settings.positioning} · {settings.goalName}</p><div className="topbar-target"><span>已涨粉 / 目标</span><strong>{grown.toLocaleString()} <b>/</b> {growthTarget.toLocaleString()} <em>差 {remaining.toLocaleString()}（{progress.toFixed(1)}%）</em></strong></div><button className="topbar-settings" type="button" aria-label="驾驶舱设置" onClick={onSettings}><Gear size={20} /></button></header>
}

function ModuleHeader({ title, goal, children }: { title: string; goal: string; children?: ReactNode }) {
  return <div className="module-header"><div><h1>{title}</h1><p>{goal}</p></div>{children}</div>
}

function GrowthPage({ settings, onSettingsChange, contents, tasks, onTasksChange, onOpenContent }: { settings: ProfileSettings; onSettingsChange: (settings: ProfileSettings) => void; contents: ContentItem[]; tasks: TodayTask[]; onTasksChange: (tasks: TodayTask[]) => void; onOpenContent: () => void }) {
  const videos = contents.filter((item) => item.format === '短视频口播').length
  const published = contents.filter((item) => ['已发布', '待复盘', '已复盘'].includes(item.status)).length
  const [showAddTask, setShowAddTask] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const growthTarget = Math.max(0, settings.targetFollowers - settings.initialFollowers)
  const grown = settings.currentFollowers - settings.initialFollowers
  const remaining = Math.max(0, settings.targetFollowers - settings.currentFollowers)
  const progress = growthTarget > 0 ? Math.max(0, Math.min(100, grown / growthTarget * 100)) : 100
  const today = new Date().toISOString().slice(0, 10)
  return <div className="growth-page">
    <section className="growth-masthead">
      <div className="growth-masthead-main"><div><div className="growth-display-title">增长总览 <span>增长<br />驾驶</span></div><p>每天 10 秒内看懂增长目标还有多远，今天该做什么。</p></div><div className="growth-target-callout"><span>总增长目标</span><strong>{growthTarget.toLocaleString()} 粉增长</strong><small>计划周期　{settings.startDate} 至 {settings.endDate}</small><small>统计截止　{today}</small></div></div>
    </section>
    <section className="growth-progress-section">
      <div className="growth-section-heading"><div><Target size={18} /><strong>增长进度</strong><span className="status status-green"><CheckCircle size={13} weight="fill" />基线已确认</span></div><button className="quiet-button" type="button" onClick={() => setShowFollowers(true)}>更新粉丝</button></div>
      <div className="platform-total"><div><span className="platform-icon"><MusicNote size={15} weight="fill" /></span><b>{settings.primaryPlatform}</b><strong>{settings.currentFollowers.toLocaleString()}</strong><small>本机记录</small></div></div>
      <div className="growth-metrics"><Metric label="初始总粉丝" value={settings.initialFollowers.toLocaleString()} /><Metric label="当前总粉丝" value={settings.currentFollowers.toLocaleString()} /><Metric label="已涨粉" value={grown.toLocaleString()} /><Metric label="目标完成度" value={`${progress.toFixed(1)}%`} /></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="growth-footnote"><span>涨粉目标 {growthTarget.toLocaleString()}</span><span>距目标还差 {remaining.toLocaleString()}</span><span>达标总粉丝 {settings.targetFollowers.toLocaleString()}</span><span>统计截止 {today}</span><span>计划周期 {settings.startDate} 至 {settings.endDate}</span></div>
    </section>
    <section className="action-targets"><div className="action-targets-heading"><strong>行动目标</strong><span>查看全部目标 <ArrowRight size={15} /></span></div><div className="action-target-grid"><ActionTarget icon={<FileText size={20} />} label="文章" value={contents.filter((item) => item.format === '文章').length} target={settings.articleTarget} unit="篇" /><ActionTarget icon={<VideoCamera size={20} />} label="视频" value={videos} target={settings.videoTarget} unit="条" /><ActionTarget icon={<PaperPlaneTilt size={20} />} label="发布" value={published} target={settings.publishTarget} unit="次" /></div></section>
    <section className="today-card"><div className="today-heading"><div><strong>今日三件事</strong><span>{today}</span></div><button className="primary-button" type="button" onClick={() => setShowAddTask(true)}><Plus size={16} />新增</button></div>{tasks.length ? <div className="today-task-list">{tasks.map((task) => <label key={task.id} className="today-task"><input type="checkbox" checked={task.done} onChange={() => onTasksChange(tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} /><span><strong>{task.title}</strong><small>{task.note}</small></span></label>)}</div> : <div className="today-empty">今天还没有任务，先添加最重要的一件事。</div>}<button className="text-button" type="button" onClick={onOpenContent}>进入内容工作台 <CaretRight size={15} /></button></section>
    {showAddTask && <AddTodayTaskDrawer onClose={() => setShowAddTask(false)} onSave={(task) => { onTasksChange([...tasks, task]); setShowAddTask(false) }} />}
    {showFollowers && <UpdateFollowersDrawer settings={settings} onClose={() => setShowFollowers(false)} onSave={(currentFollowers) => { onSettingsChange({ ...settings, currentFollowers }); setShowFollowers(false) }} />}
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
function ActionTarget({ icon, label, value, target, unit }: { icon: ReactNode; label: string; value: number; target: number; unit: string }) { return <div className="action-target"><div className="action-target-title">{icon}<strong>{label}</strong><span>查看明细</span></div><div className="action-target-value"><b>{value}</b><span>/</span><em>{target}</em><small>{unit}</small></div><div className="thin-track"><span style={{ width: `${target > 0 ? Math.min(100, value / target * 100) : 100}%` }} /></div></div> }

function InspirationPage({ items, onChange, onConvert }: { items: Inspiration[]; onChange: (items: Inspiration[]) => void; onConvert: (item: Inspiration, format: ContentFormat, channel: Platform) => void }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InspirationStatus | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const visible = items.filter((item) => (!status || item.status === status) && (!search.trim() || `${item.title}${item.originalText}`.toLowerCase().includes(search.trim().toLowerCase())))
  const selected = items.find((item) => item.id === selectedId) ?? null
  return <div><ModuleHeader title="灵感收件箱" goal="先收下兴趣，测试清楚后再决定是否做成内容。" />
    <div className="workbench-toolbar inspiration-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="搜索灵感或原始想法…" /><select value={status} onChange={(e) => setStatus(e.target.value as InspirationStatus | '')} aria-label="全部状态"><option value="">全部状态</option><option>待筛选</option><option>已转选题</option><option>已归档</option></select><div className="toolbar-actions"><button className="primary-button" type="button" onClick={() => { setSelectedId(null); setShowAdd(true) }}><Plus size={16} weight="bold" />记录灵感</button></div></div>
    <div className="workbench-body"><div className="inspiration-summary">{(['待筛选', '已转选题', '已归档'] as InspirationStatus[]).map((value) => <div key={value}><span>{value}</span><strong>{items.filter((item) => item.status === value).length}</strong></div>)}</div><div className="inspiration-grid">{visible.map((item) => <button className="inspiration-card" type="button" key={item.id} onClick={() => { setShowAdd(false); setSelectedId(item.id) }}>{item.hasPreview && <div className="code-preview"><i /><i /><i /><i /></div>}<div className="inspiration-card-meta"><StatusBadge status={item.status} /><time>{item.updatedAt.replaceAll('-', '/')}</time></div><h3>{item.title}</h3><p>{item.originalText}</p><div className="inspiration-card-footer"><span>{item.source}</span><span>{item.testRecords.length ? `${item.testRecords.length} 条补充` : '尚未测试'}</span></div></button>)}</div></div>
    {showAdd && <AddInspirationDrawer onClose={() => setShowAdd(false)} onSave={(item) => { onChange([item, ...items]); setShowAdd(false); setSelectedId(item.id) }} />}
    {selected && <InspirationDrawer item={selected} onClose={() => setSelectedId(null)} onArchive={() => onChange(items.map((item) => item.id === selected.id ? { ...item, status: '已归档' } : item))} onAddTest={(text) => onChange(items.map((item) => item.id === selected.id ? { ...item, testRecords: [...item.testRecords, text] } : item))} onConvert={(format, channel) => { onConvert(selected, format, channel); setSelectedId(null) }} />}
  </div>
}

function ContentPage({ items, onChange }: { items: ContentItem[]; onChange: (items: ContentItem[]) => void }) {
  const [search, setSearch] = useState('')
  const [format, setFormat] = useState<ContentFormat | ''>('')
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [status, setStatus] = useState<ContentStatus | ''>('')
  const [view, setView] = useState<ViewMode>('board')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const visible = items.filter((item) => item.status !== '已归档' && (!search.trim() || item.title.toLowerCase().includes(search.trim().toLowerCase())) && (!format || item.format === format) && (!platform || item.channels.includes(platform)) && (!status || item.status === status))
  const activeItems = items.filter((item) => item.status !== '已归档')
  const selected = items.find((item) => item.id === selectedId) ?? null
  return <div><ModuleHeader title="内容工作台" goal="从选题到复盘，只看每份内容现在在哪一步、下一步做什么。" />
    <div className="workbench-toolbar content-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="搜索标题或主题…" /><Select value={format} onChange={(value) => setFormat(value as ContentFormat | '')} placeholder="内容形态" options={CONTENT_FORMATS.map((value) => ({ value, label: formatLabel(value) }))} /><Select value={platform} onChange={(value) => setPlatform(value as Platform | '')} placeholder="发布平台" options={PLATFORMS.map((value) => ({ value, label: value }))} /><Select value={status} onChange={(value) => setStatus(value as ContentStatus | '')} placeholder="当前状态" options={CONTENT_STATUSES.map((value) => ({ value, label: value }))} /><div className="toolbar-actions"><ViewToggle value={view} onChange={setView} /><button className="primary-button" type="button" onClick={() => { setSelectedId(null); setShowAdd(true) }}><Plus size={16} weight="bold" />新建选题</button></div></div>
    <div className="workbench-body"><div className="pipeline-summary">{phases.map((phase) => <div key={phase.id}><span>{phase.label}</span><strong>{activeItems.filter((item) => phase.statuses.includes(item.status)).length}</strong></div>)}</div>{view === 'board' ? <PhaseBoard items={visible} onSelect={setSelectedId} /> : <ContentTable items={visible} onSelect={setSelectedId} />}</div>
    {showAdd && <AddContentDrawer onClose={() => setShowAdd(false)} onSave={(item) => { onChange([item, ...items]); setShowAdd(false); setSelectedId(item.id) }} />}
    {selected && <ContentDrawer key={`${selected.id}-${selected.publicationRecords.length}`} item={selected} onClose={() => setSelectedId(null)} onSave={(saved) => onChange(items.map((item) => item.id === saved.id ? saved : item))} />}
  </div>
}

function PhaseBoard({ items, onSelect }: { items: ContentItem[]; onSelect: (id: string) => void }) { return <div className="content-phase-board">{phases.map((phase) => { const phaseItems = items.filter((item) => phase.statuses.includes(item.status)); return <section className="content-phase-column" key={phase.id}><div className="phase-heading"><div><h2>{phase.label}</h2><span>{phase.description}</span></div><strong>{phaseItems.length}</strong></div><div className="phase-card-list">{phaseItems.length ? phaseItems.map((item) => { const publication = latestPublication(item); return <button className="content-card" type="button" key={item.id} onClick={() => onSelect(item.id)}><div className="content-card-meta"><StatusBadge status={item.status} /><span>{formatLabel(item.format)}</span></div><h3>{item.title}</h3><div className="content-card-platforms">{item.channels.join(' · ') || '平台待定'}</div><div className="content-card-pipeline">流程：{pipelineLabel(item.status)}</div>{publication && <div className="content-card-publication">发布：{publication.platform} · {publication.result} · {formatDateTime(publication.actualPublishedAt)}</div>}<div className="content-card-next">下一步：{item.nextAction}</div>{item.dueAt && <div className="content-card-date"><CalendarBlank size={13} />{item.dueAt}</div>}</button> }) : <div className="phase-empty">{phase.empty}</div>}</div></section> })}</div> }

function ContentTable({ items, onSelect }: { items: ContentItem[]; onSelect: (id: string) => void }) { return <div className="dense-table-wrap"><table className="dense-table"><thead><tr><th>内容</th><th>状态</th><th>形态</th><th>平台</th><th>发布记录</th><th>下一步</th><th>截止日期</th></tr></thead><tbody>{items.map((item) => { const publication = latestPublication(item); return <tr key={item.id}><td><button type="button" onClick={() => onSelect(item.id)}>{item.title}</button></td><td><StatusBadge status={item.status} /></td><td>{formatLabel(item.format)}</td><td>{item.channels.join('、') || '待定'}</td><td>{publication ? `${publication.result} · ${formatDateTime(publication.actualPublishedAt)}` : '未登记'}</td><td>{item.nextAction}</td><td>{item.dueAt || '—'}</td></tr> })}</tbody></table></div> }

function ReviewsPage({ items, onChange, contents }: { items: ReviewItem[]; onChange: (items: ReviewItem[]) => void; contents: ContentItem[] }) {
  const [tab, setTab] = useState<ReviewKind>('内容复盘')
  const [search, setSearch] = useState('')
  const [confirmation, setConfirmation] = useState<ReviewConfirmation | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const visible = items.filter((item) => item.kind === tab && (!search.trim() || `${item.title}${item.summary}${item.findings}`.toLowerCase().includes(search.trim().toLowerCase())) && (!confirmation || item.confirmation === confirmation))
  const selected = items.find((item) => item.id === selectedId) ?? null
  return <div><ModuleHeader title="复盘与对标" goal="把每次结果沉淀成下一次能执行的判断。"><div className="review-tabs"><button className={tab === '内容复盘' ? 'is-active' : ''} type="button" onClick={() => setTab('内容复盘')}>内容复盘</button><button className={tab === '账号拆解' ? 'is-active' : ''} type="button" onClick={() => setTab('账号拆解')}>账号拆解</button></div></ModuleHeader>
    <div className="workbench-toolbar review-toolbar"><SearchBox value={search} onChange={setSearch} placeholder={tab === '内容复盘' ? '搜索复盘标题或结论…' : '搜索账号、平台或结论…'} /><Select value={confirmation} onChange={(value) => setConfirmation(value as ReviewConfirmation | '')} placeholder="全部确认状态" options={['待人工确认', '已确认'].map((value) => ({ value, label: value }))} /><div className="toolbar-actions"><button className="primary-button" type="button" onClick={() => { setSelectedId(null); setShowAdd(true) }}><Plus size={16} weight="bold" />{tab === '内容复盘' ? '补录历史复盘' : '新建账号拆解'}</button></div></div>
    <div className="workbench-body"><div className="review-card-grid">{visible.map((item) => <button className="review-card" type="button" key={item.id} onClick={() => setSelectedId(item.id)}><div className="review-card-meta"><StatusBadge status={item.confirmation} /><span>{item.platform}<PencilSimple size={13} />编辑</span></div><h2>{item.title}</h2><p>{item.summary || item.findings}</p><div className="review-card-next">下一步：{item.nextAction}</div><time>{item.updatedAt}</time>{item.confirmation === '待人工确认' && <span className="confirm-action" onClick={(event) => { event.stopPropagation(); onChange(items.map((entry) => entry.id === item.id ? { ...entry, confirmation: '已确认' } : entry)) }}><Check size={13} />确认</span>}</button>)}</div></div>
    {showAdd && <AddReviewDrawer kind={tab} contents={contents} onClose={() => setShowAdd(false)} onSave={(item) => { onChange([item, ...items]); setShowAdd(false); setSelectedId(item.id) }} />}
    {selected && <ReviewDrawer item={selected} onClose={() => setSelectedId(null)} onSave={(saved) => onChange(items.map((item) => item.id === saved.id ? saved : item))} />}
  </div>
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="search-box"><MagnifyingGlass size={16} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="搜索" /></label> }
function Select({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: Array<{ value: string; label: string }> }) { return <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder}><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) { return <div className="view-toggle"><button className={value === 'board' ? 'is-active' : ''} type="button" onClick={() => onChange('board')}><SquaresFour size={16} weight={value === 'board' ? 'fill' : 'regular'} />看板</button><button className={value === 'table' ? 'is-active' : ''} type="button" onClick={() => onChange('table')}><List size={16} />表格</button></div> }
function StatusBadge({ status }: { status: string }) { return <span className={`status ${statusTone(status)}`}>{status}</span> }

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="detail-drawer" aria-label={title}><div className="drawer-heading"><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情"><X size={18} /></button></div><div className="drawer-content">{children}</div></aside></div> }

function AddContentDrawer({ onClose, onSave }: { onClose: () => void; onSave: (item: ContentItem) => void }) {
  const [title, setTitle] = useState(''); const [summary, setSummary] = useState(''); const [format, setFormat] = useState<ContentFormat>('文章'); const [channels, setChannels] = useState<Platform[]>(['公众号']); const [nextAction, setNextAction] = useState('完成选题判断'); const [dueAt, setDueAt] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; onSave({ id: `content-${Date.now()}`, title: title.trim(), summary: summary.trim(), status: '候选选题', format, channels, nextAction: nextAction.trim() || '完成选题判断', dueAt: dueAt || null, publicationRecords: [] }) }
  return <Drawer title="新建选题" onClose={onClose}><form className="drawer-form" onSubmit={submit}><Field label="标题"><input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field><Field label="内容形态"><select value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>{CONTENT_FORMATS.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></Field><ChannelPicker value={channels} onChange={setChannels} /><Field label="下一步"><input value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field><Field label="计划完成"><input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field><Field label="一句话说明（可选）"><textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} /></Field><button className="primary-button full-width" type="submit">保存选题</button></form></Drawer>
}

function AddTodayTaskDrawer({ onClose, onSave }: { onClose: () => void; onSave: (task: TodayTask) => void }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  return <Drawer title="新增今日任务" onClose={onClose}><form className="drawer-form" onSubmit={(event) => { event.preventDefault(); const normalizedTitle = title.trim(); if (!normalizedTitle) return; onSave({ id: `task-${Date.now()}`, title: normalizedTitle, note: note.trim() || '待安排', done: false }) }}><Field label="任务名称"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="今天最重要的一件事" required autoFocus /></Field><Field label="时间或说明（可选）"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="例如：17:00 前完成" /></Field><button className="primary-button full-width" type="submit" disabled={!title.trim()}>保存任务</button></form></Drawer>
}

function UpdateFollowersDrawer({ settings, onClose, onSave }: { settings: ProfileSettings; onClose: () => void; onSave: (value: number) => void }) {
  const [value, setValue] = useState(String(settings.currentFollowers))
  const normalized = Number(value)
  return <Drawer title="更新粉丝" onClose={onClose}><form className="drawer-form" onSubmit={(event) => { event.preventDefault(); if (!Number.isFinite(normalized) || normalized < 0) return; onSave(normalized) }}><div className="detail-facts"><span>主要平台</span><strong>{settings.primaryPlatform}</strong><span>初始粉丝</span><strong>{settings.initialFollowers.toLocaleString()}</strong><span>目标粉丝</span><strong>{settings.targetFollowers.toLocaleString()}</strong></div><Field label="当前粉丝数"><input type="number" min="0" step="1" value={value} onChange={(event) => setValue(event.target.value)} required autoFocus /></Field><button className="primary-button full-width" type="submit" disabled={!Number.isFinite(normalized) || normalized < 0}>保存粉丝数</button></form></Drawer>
}

function ContentDrawer({ item, onClose, onSave }: { item: ContentItem; onClose: () => void; onSave: (item: ContentItem) => void }) {
  const canEditStatus = item.publicationRecords.length === 0 && MANUAL_CONTENT_STATUSES.includes(item.status)
  const [status, setStatus] = useState(item.status)
  const [format, setFormat] = useState(item.format)
  const [nextAction, setNextAction] = useState(item.nextAction)
  const [dueAt, setDueAt] = useState(item.dueAt ?? '')
  return <Drawer title={item.title} onClose={onClose}><div className="content-detail-stack"><form className="drawer-form" onSubmit={(event) => { event.preventDefault(); onSave({ ...item, status: canEditStatus ? status : item.status, format, nextAction, dueAt: dueAt || null }); onClose() }}>
    {canEditStatus ? <Field label="基础状态"><select value={status} onChange={(event) => setStatus(event.target.value as ContentStatus)}>{MANUAL_CONTENT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field> : <div className="readonly-status"><span>当前状态</span><StatusBadge status={item.status} /><small>发布及复盘状态由对应记录生成，不能手动跳过。</small></div>}
    <Field label="内容形态"><select value={format} onChange={(event) => setFormat(event.target.value as ContentFormat)}>{CONTENT_FORMATS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></Field>
    <Field label="下一步"><textarea rows={3} value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></Field>
    <Field label="截止日期"><input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></Field>
    <div className="detail-facts"><span>计划平台</span><strong>{item.channels.join('、')}</strong>{item.duration && <><span>视频时长</span><strong>{item.duration}</strong></>}</div>
    <button className="quiet-button full-width" type="submit">保存基础信息</button>
  </form><PublicationSection item={item} onSave={onSave} /></div></Drawer>
}

function PublicationSection({ item, onSave }: { item: ContentItem; onSave: (item: ContentItem) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [platform, setPlatform] = useState<Platform>(item.channels[0] ?? '抖音')
  const [actualPublishedAt, setActualPublishedAt] = useState(currentLocalDateTimeValue())
  const [result, setResult] = useState<PublicationResult>('正常发布')
  const [url, setUrl] = useState('')
  const [workId, setWorkId] = useState('')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedUrl = url.trim()
    const normalizedWorkId = workId.trim()
    const normalizedEvidence = evidenceRef.trim()
    if (!actualPublishedAt) {
      setError('请填写实际发布时间。')
      return
    }
    if (normalizedUrl && !normalizedUrl.startsWith('https://')) {
      setError('发布链接必须以 https:// 开头。')
      return
    }
    if (!normalizedUrl && !normalizedWorkId && !normalizedEvidence) {
      setError('发布链接、作品 ID、证据说明至少填写一项。')
      return
    }
    if (!confirmed) {
      setError('请确认发布信息准确。')
      return
    }

    const reviewDueAt = addHoursLocal(actualPublishedAt, 48)
    const record: PublicationRecord = {
      id: `publication-${Date.now()}`,
      platform,
      actualPublishedAt,
      url: normalizedUrl || undefined,
      workId: normalizedWorkId || undefined,
      evidenceRef: normalizedEvidence || undefined,
      result,
      verified: true,
      reviewDueAt,
    }
    const channels = item.channels.includes(platform) ? item.channels : [...item.channels, platform]
    const nextAction = result === '正常发布'
      ? `等待 48 小时数据，${formatDateTime(reviewDueAt)} 开始复盘`
      : `记录“${result}”原因，保留证据并进入异常复盘`
    onSave({
      ...item,
      status: '已发布',
      channels,
      publishedAt: formatDateTime(actualPublishedAt),
      nextAction,
      dueAt: reviewDueAt.slice(0, 10),
      publicationRecords: [record, ...item.publicationRecords],
    })
    setError('')
    setShowForm(false)
  }

  return <section className="publication-section">
    <div className="publication-heading"><div><h3>发布记录</h3><p>确认真实发布后，内容才会进入“已发布”。</p></div><button className="primary-button" type="button" onClick={() => setShowForm((value) => !value)}><Plus size={15} weight="bold" />{showForm ? '收起' : '登记发布'}</button></div>
    {item.publicationRecords.length > 0 ? <div className="publication-list">{item.publicationRecords.map((record) => <article className="publication-record" key={record.id}><div><StatusBadge status={record.result} /><strong>{record.platform}</strong><time>{formatDateTime(record.actualPublishedAt)}</time></div><dl><div><dt>复盘时间</dt><dd>{formatDateTime(record.reviewDueAt)}</dd></div><div><dt>发布凭证</dt><dd>{record.url ? <a href={record.url} target="_blank" rel="noreferrer">打开作品链接</a> : record.workId ? `作品 ID：${record.workId}` : record.evidenceRef}</dd></div></dl></article>)}</div> : <div className="publication-empty">尚未登记实际发布结果。</div>}
    {showForm && <form className="publication-form" onSubmit={submit} noValidate>
      <div className="publication-form-grid"><Field label="发布平台（必填）"><select value={platform} onChange={(event) => setPlatform(event.target.value as Platform)}>{PLATFORMS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><Field label="实际发布时间（必填）"><input type="datetime-local" value={actualPublishedAt} onChange={(event) => setActualPublishedAt(event.target.value)} required /></Field></div>
      <Field label="发布结果（必填）"><select value={result} onChange={(event) => setResult(event.target.value as PublicationResult)}>{PUBLICATION_RESULTS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
      <div className="proof-divider"><span>以下三项至少填写一项</span></div>
      <Field label="发布链接"><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></Field>
      <Field label="作品 ID"><input value={workId} onChange={(event) => setWorkId(event.target.value)} placeholder="平台作品 ID 或编号" /></Field>
      <Field label="证据说明"><input value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} placeholder="例如：发布后台截图文件名" /></Field>
      <label className="confirm-checkbox"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>我确认以上内容已经真实发布，信息准确。</span></label>
      {error && <p className="form-validation" role="alert">{error}</p>}
      <p className="review-time-preview">保存后预计复盘时间：{actualPublishedAt ? formatDateTime(addHoursLocal(actualPublishedAt, 48)) : '待填写'}</p>
      <button className="primary-button full-width" type="submit">保存发布记录</button>
    </form>}
  </section>
}

function AddInspirationDrawer({ onClose, onSave }: { onClose: () => void; onSave: (item: Inspiration) => void }) { const [title, setTitle] = useState(''); const [text, setText] = useState(''); const [url, setUrl] = useState(''); return <Drawer title="记录新灵感" onClose={onClose}><form className="drawer-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: `ins-${Date.now()}`, title: title.trim(), originalText: text.trim(), source: '驾驶舱新增', sourceUrl: url || undefined, status: '待筛选', updatedAt: todayDate(), testRecords: [] }) }}><Field label="一句话标题"><input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field><Field label="当时的想法"><textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} required placeholder="保留你看到它时最原始的想法。" /></Field><Field label="来源链接（可选）"><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field><button className="primary-button full-width" type="submit">保存灵感</button></form></Drawer> }

function InspirationDrawer({ item, onClose, onArchive, onAddTest, onConvert }: { item: Inspiration; onClose: () => void; onArchive: () => void; onAddTest: (text: string) => void; onConvert: (format: ContentFormat, channel: Platform) => void }) { const [test, setTest] = useState(''); const [format, setFormat] = useState<ContentFormat>('短视频口播'); const [channel, setChannel] = useState<Platform>('抖音'); return <Drawer title={item.title} onClose={onClose}><div className="inspiration-detail"><div className="inspiration-detail-status"><StatusBadge status={item.status} /><span>{item.source}</span></div><section><h3>原始想法</h3><p>{item.originalText}</p></section>{item.testRecords.length > 0 && <section><h3>测试记录</h3><ol>{item.testRecords.map((record, index) => <li key={`${record}-${index}`}>{record}</li>)}</ol></section>}{item.status === '待筛选' && <><form className="drawer-form compact-form" onSubmit={(e) => { e.preventDefault(); if (!test.trim()) return; onAddTest(test.trim()); setTest('') }}><Field label="添加测试记录"><textarea rows={3} value={test} onChange={(e) => setTest(e.target.value)} /></Field><button className="quiet-button full-width" type="submit">添加测试记录</button></form><div className="conversion-form"><h3>转为选题</h3><Field label="内容形态"><select value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>{CONTENT_FORMATS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></Field><Field label="首发平台"><select value={channel} onChange={(e) => setChannel(e.target.value as Platform)}>{PLATFORMS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><button className="primary-button full-width" type="button" onClick={() => onConvert(format, channel)}><ArrowRight size={16} />转为选题</button><button className="quiet-button full-width" type="button" onClick={() => { onArchive(); onClose() }}><ArchiveBox size={16} />归档</button></div></>}</div></Drawer> }

function AddReviewDrawer({ kind, contents, onClose, onSave }: { kind: ReviewKind; contents: ContentItem[]; onClose: () => void; onSave: (item: ReviewItem) => void }) { const [title, setTitle] = useState(''); const [platform, setPlatform] = useState('抖音'); const [summary, setSummary] = useState(''); const [findings, setFindings] = useState(''); const [nextAction, setNextAction] = useState(''); return <Drawer title={kind === '内容复盘' ? '补录历史复盘' : '新建账号拆解'} onClose={onClose}><form className="drawer-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: `review-${Date.now()}`, kind, title, platform, confirmation: '待人工确认', summary, findings, nextAction, updatedAt: todayDate() }) }}>{kind === '内容复盘' && <Field label="关联内容"><select onChange={(e) => setTitle(e.target.options[e.target.selectedIndex].text)} defaultValue=""><option value="">请选择</option>{contents.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>}<Field label="标题"><input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field><Field label="平台"><input value={platform} onChange={(e) => setPlatform(e.target.value)} /></Field><Field label="摘要"><textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field><Field label="核心发现"><textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} /></Field><Field label="下一步"><textarea rows={3} value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field><button className="primary-button full-width" type="submit">保存</button></form></Drawer> }

function ReviewDrawer({ item, onClose, onSave }: { item: ReviewItem; onClose: () => void; onSave: (item: ReviewItem) => void }) { const [confirmation, setConfirmation] = useState(item.confirmation); const [summary, setSummary] = useState(item.summary); const [findings, setFindings] = useState(item.findings); const [nextAction, setNextAction] = useState(item.nextAction); return <Drawer title={item.title} onClose={onClose}><form className="drawer-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...item, confirmation, summary, findings, nextAction }); onClose() }}><Field label="确认状态"><select value={confirmation} onChange={(e) => setConfirmation(e.target.value as ReviewConfirmation)}><option>待人工确认</option><option>已确认</option></select></Field><Field label="摘要"><textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field><Field label="核心发现"><textarea rows={5} value={findings} onChange={(e) => setFindings(e.target.value)} /></Field><Field label="下一步"><textarea rows={3} value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field><button className="primary-button full-width" type="submit">保存修改</button></form></Drawer> }

function SettingsDrawer({ settings, onClose, onSave }: { settings: ProfileSettings; onClose: () => void; onSave: (settings: ProfileSettings) => void }) {
  const [draft, setDraft] = useState(settings)
  const numberField = (key: 'initialFollowers' | 'currentFollowers' | 'targetFollowers' | 'articleTarget' | 'videoTarget' | 'publishTarget', value: string) => setDraft({ ...draft, [key]: Math.max(0, Number(value) || 0) })
  return <Drawer title="驾驶舱设置" onClose={onClose}><form className="drawer-form" onSubmit={(event) => { event.preventDefault(); onSave(draft) }}><Field label="产品名称"><input value={draft.productName} onChange={(event) => setDraft({ ...draft, productName: event.target.value })} required /></Field><Field label="使用者名称"><input value={draft.ownerName} onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })} required /></Field><Field label="内容定位"><textarea rows={3} value={draft.positioning} onChange={(event) => setDraft({ ...draft, positioning: event.target.value })} required /></Field><Field label="增长计划名称"><input value={draft.goalName} onChange={(event) => setDraft({ ...draft, goalName: event.target.value })} required /></Field><Field label="主要平台"><select value={draft.primaryPlatform} onChange={(event) => setDraft({ ...draft, primaryPlatform: event.target.value as Platform })}>{PLATFORMS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><div className="settings-number-grid"><Field label="初始粉丝"><input type="number" min="0" value={draft.initialFollowers} onChange={(event) => numberField('initialFollowers', event.target.value)} /></Field><Field label="当前粉丝"><input type="number" min="0" value={draft.currentFollowers} onChange={(event) => numberField('currentFollowers', event.target.value)} /></Field><Field label="目标粉丝"><input type="number" min="0" value={draft.targetFollowers} onChange={(event) => numberField('targetFollowers', event.target.value)} /></Field></div><div className="settings-number-grid"><Field label="文章目标"><input type="number" min="0" value={draft.articleTarget} onChange={(event) => numberField('articleTarget', event.target.value)} /></Field><Field label="视频目标"><input type="number" min="0" value={draft.videoTarget} onChange={(event) => numberField('videoTarget', event.target.value)} /></Field><Field label="发布目标"><input type="number" min="0" value={draft.publishTarget} onChange={(event) => numberField('publishTarget', event.target.value)} /></Field></div><div className="publication-form-grid"><Field label="开始日期"><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field><Field label="结束日期"><input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></Field></div><button className="primary-button full-width" type="submit">保存设置</button></form></Drawer>
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="form-field"><span>{label}</span>{children}</label> }
function ChannelPicker({ value, onChange }: { value: Platform[]; onChange: (value: Platform[]) => void }) { return <fieldset className="channel-picker"><legend>发布平台</legend>{PLATFORMS.map((channel) => <label key={channel}><input type="checkbox" checked={value.includes(channel)} onChange={() => onChange(value.includes(channel) ? value.filter((item) => item !== channel) : [...value, channel])} />{channel}</label>)}</fieldset> }
function formatLabel(value: ContentFormat) { return value === '短视频口播' ? '短视频' : value }
function pipelineLabel(status: ContentStatus) { if (status === '候选选题') return '待完成选题判断'; if (status === '已立项') return '已立项 · 待准备'; if (status === '待发布') return '已成片 · 等待发布'; if (status === '已发布' || status === '待复盘') return '已发布 · 等待复盘'; if (status === '已复盘') return '复盘完成'; return '已归档' }
function latestPublication(item: ContentItem) { return item.publicationRecords[0] }
function formatDateTime(value: string) { return value.replace('T', ' ') }
function addHoursLocal(value: string, hours: number) { const date = new Date(value); date.setHours(date.getHours() + hours); return toLocalDateTimeValue(date) }
function currentLocalDateTimeValue() { return toLocalDateTimeValue(new Date()) }
function toLocalDateTimeValue(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16) }
function todayDate() { return currentLocalDateTimeValue().slice(0, 10) }
function statusTone(status: string) { if (['已复盘', '已发布', '已确认', '正常发布'].includes(status)) return 'status-green'; if (['待发布', '已转选题', '已立项'].includes(status)) return 'status-blue'; if (['待筛选', '待人工确认', '仅自己可见'].includes(status)) return 'status-yellow'; if (['违规', '已删除'].includes(status)) return 'status-red'; if (status === '待复盘') return 'status-purple'; return 'status-muted' }

export default App
