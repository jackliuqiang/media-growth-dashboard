# AI 安装协议

本文是 Codex、Claude Code 等本地 AI 安装本项目时必须遵守的权威流程。不得只启动网页后就报告安装完成。

## 1. 安全边界

- 只从用户提供的仓库地址获取代码。
- 项目必须放在独立目录，不覆盖同名目录或其他项目。
- 不读取、扫描或迁移用户已有的 Obsidian、浏览器、聊天记录和其他私人目录。
- 不提交 `setup.local.json`、本地数据、截图、Token、Cookie、密钥和绝对路径。
- 已存在本地数据时禁止执行带 `--force` 的初始化，除非用户明确要求重建并已完成备份。
- 服务只能绑定 `127.0.0.1`，不得开放到局域网或公网。

## 2. 环境检查

确认当前系统是 Windows、macOS 或 Linux，并检查：

```bash
git --version
node --version
npm --version
```

Node.js 必须为 20 或更高版本。缺少环境时，先向用户说明要安装什么，再使用对应系统的官方或常用受信任方式安装。完成后运行：

```bash
npm run doctor
```

## 3. 获取代码

在用户认可的普通项目目录执行：

```bash
git clone <用户给出的仓库地址>
cd <仓库目录>
npm ci
```

如果目录已经存在，先确认它是否为本项目以及是否有未提交修改，不得直接删除或覆盖。

## 4. 初始化问答

逐项询问并确认：

1. 使用者名称。
2. 内容定位。
3. 增长计划名称。
4. 主要平台：公众号、小红书、抖音、视频号、B 站或 X。
5. 当前粉丝数。
6. 目标粉丝数。
7. 计划开始和结束日期。
8. 文章、视频和发布行动目标。

复制 `setup.example.json` 为 `setup.local.json`，填写答案后执行：

```bash
npm run setup -- --config ./setup.local.json
```

`setup.local.json` 已被 Git 忽略。初始化器默认只创建、不覆盖。

## 5. 验证与启动

```bash
npm run verify
npm start
```

完成标准：

- `doctor`、`lint`、`test`、`build` 全部通过。
- 终端打印本机访问地址和本地数据目录。
- `GET /api/health` 返回 `ok: true`。
- 浏览器能够打开增长总览、灵感收件箱、内容工作台和复盘与对标。
- 新增一条测试灵感后刷新页面，数据仍然存在。
- 删除测试数据前必须让用户确认；不得用测试内容污染用户的正式数据。

## 6. 安装后的 AI 协作

先运行以下命令读取当前状态：

```bash
npm run cockpit -- status
```

需要更新看板时只调用 `npm run cockpit -- ...` 提供的受控命令，不直接编辑 `state.json`。命令帮助：

```bash
npm run cockpit -- help
```

CLI 修改本地数据后，已打开的网页会自动重新读取。

## 7. 更新

更新前备份本地数据目录，然后执行：

```bash
git status --short
git pull --ff-only
npm ci
npm run verify
```

本地数据位于仓库外，正常更新代码不会覆盖用户内容。
