# 自媒体增长驾驶舱

一个只在本机运行的自媒体看板，用来管理增长目标、灵感、内容进度、发布凭证和复盘资产。它不内置 AI 聊天框；Codex、Claude Code 等本地 AI 通过仓库提供的固定命令更新同一份数据。

## 最简单的安装方式

把本仓库网址和下面这段话发给能够执行终端命令的 Codex、Claude Code 或其他本地 AI：

```text
请帮我安装并初始化这个“自媒体增长驾驶舱”项目。
先完整阅读仓库中的 INSTALL.md、AGENTS.md 和 README.md，再检查当前电脑的 Git、Node.js 和 npm。
请逐项询问我的使用者名称、内容定位、主要平台、当前粉丝、目标粉丝、计划日期和行动目标；确认后创建本机配置并执行初始化。
随后安装依赖，运行 doctor、lint、test 和 build。全部通过后启动本机服务并打开驾驶舱。
不要覆盖已有的本地驾驶舱数据，不要把我的账号、内容、截图、密钥或本机路径提交到 GitHub。
```

AI 安装时必须以 [INSTALL.md](./INSTALL.md) 为权威流程。

## 能做什么

- 查看粉丝基线、当前粉丝、目标差距和内容行动目标。
- 收集灵感并转为正式选题。
- 使用看板或表格查看每条内容所处阶段。
- 登记真实发布时间、平台、发布结果和发布凭证。
- 自动计算发布 48 小时后的复盘时间。
- 保存内容复盘和账号对标结论。
- 通过固定 CLI 让本地 AI 更新看板。
- 网页刷新、服务重启或项目升级后保留本地数据。

## 环境要求

- Windows、macOS 或 Linux
- Git
- Node.js 20 或更高版本
- npm
- 能执行终端命令的本地 AI 不是运行必需项，但它是推荐的安装和协作方式

## 手动安装

```bash
git clone <本仓库地址>
cd media-growth-dashboard
npm ci
npm run doctor
cp setup.example.json setup.local.json
```

编辑 `setup.local.json` 后执行：

```bash
npm run setup -- --config ./setup.local.json
npm run verify
npm start
```

默认打开 `http://127.0.0.1:4181/`。端口被占用时会自动尝试后续端口，实际地址同时写入本地数据目录的 `runtime.json`。

## 给本地 AI 的命令

```bash
npm run cockpit -- status
npm run cockpit -- idea:add --title "灵感标题" --text "原始想法"
npm run cockpit -- content:add --title "选题标题" --format "短视频口播" --platform "抖音"
npm run cockpit -- content:update --id "内容ID" --status "待发布" --next "等待发布"
npm run cockpit -- publish:add --id "内容ID" --platform "抖音" --evidence "发布后台截图"
npm run cockpit -- review:add --id "内容ID" --summary "摘要" --findings "发现" --next "下次动作" --confirm
npm run cockpit -- task:add --title "今日任务" --note "时间或说明"
```

发布和复盘状态不能通过 `content:update` 跳过，必须分别使用 `publish:add` 和 `review:add`，以免看板出现没有证据的“已发布”或“已复盘”。

## 本地数据

数据默认保存在当前系统用户主目录下的 `.media-growth-dashboard/state.json`，不在 Git 仓库中。可以通过环境变量 `MEDIA_DASHBOARD_HOME` 改为其他位置。

升级代码前建议备份该目录。仓库中的 `setup.example.json` 只有虚构示例，不包含任何真实用户数据。

## 常用命令

```bash
npm run dev       # 开发模式
npm run start     # 启动已构建版本并打开浏览器
npm run doctor    # 检查本机环境
npm run setup     # 首次初始化
npm run cockpit   # 查看 Agent CLI 帮助
npm run verify    # 完整质量检查
```

## 当前阶段

这是本机单用户 Alpha 版本，不包含账号登录、云同步、平台数据自动抓取和公网服务。服务固定绑定 `127.0.0.1`，只允许本机访问。
