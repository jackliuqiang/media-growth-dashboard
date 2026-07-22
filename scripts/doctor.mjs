import { spawnSync } from 'node:child_process'

const failures = []
const major = Number(process.versions.node.split('.')[0])
if (major < 20) failures.push(`Node.js 版本过低：${process.versions.node}，需要 20 或更高版本`)

const npmCheck = process.env.npm_execpath
  ? [process.execPath, [process.env.npm_execpath, '--version'], false]
  : [process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], process.platform === 'win32']

for (const [label, command, args, shell] of [
  ['Git', 'git', ['--version'], false],
  ['npm', ...npmCheck],
]) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell })
  if (result.error || result.status !== 0) failures.push(`未找到 ${label}`)
  else console.log(`✓ ${label}：${result.stdout.trim()}`)
}

console.log(`✓ Node.js ${process.versions.node}`)
console.log(`✓ 当前系统 ${process.platform}/${process.arch}`)
if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  process.exit(1)
}
console.log('环境检查通过')
