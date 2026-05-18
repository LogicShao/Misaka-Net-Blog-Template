# Git 工作流实施指南

> Misaka Network Blog 项目采用的分支管理范式
> 基于：AI 时代的单人开发分支范式（轻量 GitHub Flow + dev 缓冲区）

## 📋 目录

- [分支结构](#分支结构)
- [快速开始](#快速开始)
- [日常开发流程](#日常开发流程)
- [提交规范](#提交规范)
- [分支合并策略](#分支合并策略)
- [应急处理](#应急处理)
- [Git 别名配置](#git-别名配置)

---

## 分支结构

本项目采用 **方案 B：main + dev + feature/*** 结构

```
main              稳定分支，随时可部署到 Cloudflare Pages
  ↑
dev               集成/试验分支，允许快速迭代
  ↑
feature/*         功能分支，单一任务，可随时删除
fix/*             修复分支
refactor/*        重构分支
```

### 分支职责

| 分支 | 稳定性 | 合并来源 | 合并目标 | 保护规则 |
|------|--------|----------|----------|----------|
| `main` | 生产级 | `dev` | - | ✅ 必须通过 PR，禁止直接 push |
| `dev` | 集成级 | `feature/*`, `fix/*`, `refactor/*` | `main` | 建议通过 PR |
| `feature/*` | 开发级 | - | `dev` | 无限制 |

---

## 快速开始

### 1. 初始化 dev 分支（仅首次）

```bash
# 确保 main 分支是最新的
git switch main
git pull

# 创建 dev 分支
git switch -c dev
git push -u origin dev

# 设置 dev 为默认开发分支（本地）
git config branch.autoSetupMerge always
```

### 2. 配置 GitHub 分支保护规则

**保护 main 分支：**

1. 访问仓库 → Settings → Branches → Add rule
2. Branch name pattern: `main`
3. 勾选以下选项：
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging（如有 CI）
   - ✅ Do not allow bypassing the above settings

**保护 dev 分支（可选）：**

- Branch name pattern: `dev`
- ✅ Require pull request reviews before merging（可选）

### 3. 配置 Git 别名（提高效率）

在 `~/.gitconfig` 中添加：

```ini
[alias]
    # 快速查看状态
    st = status -sb

    # 查看 dev 超前 main 多少提交
    ahead = !git rev-list --count origin/main..dev

    # 图形化分支历史
    lg = log --graph --oneline --all --decorate -20

    # 安全的强制推送
    pushf = push --force-with-lease

    # 快速切换分支
    dev = switch dev
    main = switch main

    # 查看最近修改的文件
    changed = diff --name-status HEAD~1
```

---

## 日常开发流程

### 场景 1：新增功能

```bash
# 1. 从 dev 拉新分支
git switch dev
git pull
git switch -c feature/reading-time

# 2. 开发并小步提交
git add src/utils/readingTime.ts
git commit -m "feat: add reading time calculation utility"

git add src/components/PostMeta.astro
git commit -m "feat: display reading time in post metadata"

# 3. 合并回 dev
git switch dev
git pull  # 确保 dev 是最新的
git merge feature/reading-time
git push

# 4. 删除功能分支（可选）
git branch -d feature/reading-time
```

### 场景 2：修复 Bug

```bash
# 1. 创建修复分支
git switch dev
git pull
git switch -c fix/admin-frontmatter-crlf

# 2. 修复并测试
# ... 编辑代码 ...
npm run admin  # 验证修复有效

git add admin-server.js
git commit -m "fix(admin): resolve frontmatter parsing for CRLF files"

# 3. 合并回 dev
git switch dev
git merge fix/admin-frontmatter-crlf
git push

# 4. 如果是紧急 bug，直接合并到 main
git switch main
git merge fix/admin-frontmatter-crlf
git tag v1.1.1
git push --tags
git push
```

### 场景 3：AI 辅助重构（高风险操作）

```bash
# 1. 创建重构分支
git switch dev
git switch -c refactor/admin-typescript

# 2. AI 生成代码后，执行"强制三连"
# ========== 第一步：查看差异 ==========
git diff  # 检查改动范围
git diff --stat  # 统计改动文件

# 重点检查：
# - package.json / package-lock.json（依赖变动）
# - 配置文件（astro.config.mjs, tailwind.config.mjs）
# - 大范围重命名/删除

# ========== 第二步：最小验证 ==========
npm run build  # 确保构建不报错
npm run admin  # 测试关键功能

# ========== 第三步：分块提交 ==========
git add -p  # 交互式选择提交块

# 第一次提交：类型定义
git add src/types/admin.ts
git commit -m "refactor(admin): add TypeScript type definitions"

# 第二次提交：主逻辑迁移
git add tools/admin/server.ts
git commit -m "refactor(admin): migrate server.js to TypeScript"

# 第三次提交：配置更新
git add package.json tsconfig.json
git commit -m "chore: update TypeScript config for Admin module"

# 3. 合并回 dev 并充分测试
git switch dev
git merge refactor/admin-typescript

# 在 dev 上完整测试所有功能
npm run build
npm run admin
npm run new
npm run friends

# 确认无误后再合入 main
```

### 场景 4：从 dev 发布到 main

**触发条件（满足任一即可）：**

- ✅ dev 超前 main 超过 10 个提交（`git ahead`）
- ✅ 完成一个完整功能模块（如 Blog Galaxy）
- ✅ 修复了影响部署的重大 bug
- ✅ 准备发布新版本

**操作步骤：**

```bash
# 1. 确保 dev 分支测试通过
git switch dev
npm run build  # 构建成功
npm run preview  # 预览无问题

# 2. 创建 PR（推荐）或直接合并
# 方式 A：通过 GitHub PR（推荐）
git push origin dev
# 然后在 GitHub 上创建 dev → main 的 PR

# 方式 B：本地合并（快速方式）
git switch main
git pull
git merge dev
git tag v1.2.0  # 打版本标签
git push --tags
git push

# 3. 验证部署
# 等待 Cloudflare Pages 自动部署完成
# 访问 https://blog.misaka-net.top 验证
```

---

## 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>（可选）

<footer>（可选）
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(galaxy): add cluster color theme` |
| `fix` | Bug 修复 | `fix(admin): resolve CRLF parsing issue` |
| `refactor` | 重构（不改变外部行为） | `refactor(tools): reorganize directory structure` |
| `perf` | 性能优化 | `perf(search): optimize Fuse.js index loading` |
| `style` | 样式调整（不影响功能） | `style(header): adjust mobile menu spacing` |
| `test` | 测试相关 | `test(admin): add API endpoint tests` |
| `docs` | 文档更新 | `docs: update Git workflow guide` |
| `chore` | 构建/工具/依赖 | `chore(deps): upgrade Astro to 5.15.3` |

### Scope 模块

| Scope | 说明 |
|-------|------|
| `admin` | Admin 后台管理系统 |
| `galaxy` | Blog Galaxy 可视化 |
| `article` | 文章内容/组件 |
| `tools` | 开发工具脚本 |
| `build` | 构建配置 |
| `search` | 搜索功能 |
| `ui` | UI 组件 |

### 示例

```bash
# 好的提交示例 ✅
git commit -m "feat(admin): add bulk article management"
git commit -m "fix(galaxy): correct cluster boundary calculation"
git commit -m "refactor(tools): move scripts to tools/ directory"
git commit -m "docs: add Git workflow implementation guide"

# 不好的提交示例 ❌
git commit -m "update"  # 太模糊
git commit -m "fix bugs and add features"  # 做了太多事
git commit -m "WIP"  # 临时提交不应该 push
```

---

## 分支合并策略

### dev ← feature/*（日常合并）

**推荐方式：Merge Commit**

```bash
git switch dev
git merge feature/xxx
```

**优点：** 保留完整历史，可追溯每个功能的开发过程

### main ← dev（发布合并）

**方式 A：Squash Merge（推荐）**

通过 GitHub PR 选择 "Squash and merge"

**优点：**
- main 历史干净，每次合并对应一个完整功能
- 方便回滚整个功能

**方式 B：Merge Commit**

```bash
git switch main
git merge dev --no-ff
```

**优点：** 保留 dev 的详细历史

### 何时使用 Rebase？

**❌ 不推荐在共享分支（dev, main）上使用 rebase**

**✅ 可以在本地功能分支上使用**

```bash
# 在 feature 分支上，同步 dev 的最新改动
git switch feature/xxx
git rebase dev
```

---

## 应急处理

### 问题 1：main 被污染了（已 push）

**方案 A：回退到上一个稳定 tag**

```bash
git switch main
git log --oneline  # 找到最后一个稳定的 commit

git reset --hard v1.1.0  # 或使用 commit hash
git push --force-with-lease origin main
```

⚠️ **注意：** 仅在单人项目或确认无其他人基于 main 开发时使用

**方案 B：Revert 错误的提交（更安全）**

```bash
git switch main
git log --oneline --graph  # 找到错误的 merge commit

git revert -m 1 <merge_commit_hash>
git push
```

### 问题 2：dev 分支混乱，需要重置

```bash
# 从 main 重新拉出干净的 dev
git switch main
git pull

git branch -D dev  # 删除本地 dev
git switch -c dev  # 重新创建
git push -f origin dev  # 强制推送（覆盖远程）
```

### 问题 3：不小心在 main 上直接提交了

```bash
# 场景：在 main 上误提交了 commit A 和 B

# 1. 创建临时分支保存改动
git branch temp-save

# 2. 回退 main 到误提交前
git switch main
git reset --hard HEAD~2  # 回退 2 个提交

# 3. 将改动合并到 dev
git switch dev
git merge temp-save

# 4. 删除临时分支
git branch -D temp-save
```

### 问题 4：合并冲突解决

```bash
# 1. 合并时遇到冲突
git merge feature/xxx
# CONFLICT (content): Merge conflict in src/xxx.ts

# 2. 手动解决冲突后
git add src/xxx.ts
git commit  # 不需要 -m，会自动生成 merge commit message

# 3. 如果想放弃合并
git merge --abort
```

---

## Git 别名配置

将以下内容添加到 `~/.gitconfig`：

```ini
[alias]
    # 基础别名
    st = status -sb
    co = checkout
    sw = switch
    br = branch
    cm = commit

    # 日志查看
    lg = log --graph --oneline --all --decorate -20
    lga = log --graph --oneline --all --decorate
    last = log -1 HEAD --stat

    # 分支管理
    dev = switch dev
    main = switch main
    new = "!f() { git switch dev && git pull && git switch -c $1; }; f"
    done = "!f() { git switch dev && git merge @{-1} && git push; }; f"

    # 差异查看
    df = diff
    dfs = diff --stat
    changed = diff --name-status HEAD~1

    # 状态检查
    ahead = !git rev-list --count origin/main..dev
    behind = !git rev-list --count dev..origin/main

    # 安全操作
    pushf = push --force-with-lease
    undo = reset HEAD~1 --soft

    # 清理
    prune-local = "!git fetch -p && git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -D"
```

### 别名使用示例

```bash
# 快速创建功能分支
git new feature/reading-time

# 快速合并回 dev
git done

# 查看 dev 超前 main 多少
git ahead

# 撤销最后一次提交（保留改动）
git undo

# 清理已合并的本地分支
git prune-local
```

---

## 最佳实践总结

### ✅ 应该做的

1. **每次开发从 dev 拉新分支**
2. **小步提交，每次提交都可运行**
3. **AI 生成代码后执行"强制三连"：diff → test → 分块提交**
4. **dev 超前 10 个提交时合并到 main**
5. **重要版本打 tag（v1.0.0）**
6. **使用 PR 审查代码（即使一个人）**

### ❌ 不应该做的

1. **直接在 main 上提交**（除非紧急修复）
2. **在 dev/main 上使用 rebase**
3. **提交信息写"update"、"fix"等模糊描述**
4. **一次提交改动超过 10 个文件**（除非重构）
5. **跳过测试直接合并到 main**
6. **dev 超前 main 超过 30 个提交**

---

## 快速参考卡片

```bash
# 开始新功能
git dev && git pull && git switch -c feature/xxx

# 提交改动
git add -p && git commit -m "feat(scope): description"

# 合并回 dev
git dev && git pull && git merge feature/xxx && git push

# 发布到 main
git main && git pull && git merge dev && git tag v1.x.x && git push --tags && git push

# 查看状态
git st && git ahead && git lg
```

---

## 相关文档

- [项目主 README](../README.md)
- [CLAUDE.md 开发指南](../CLAUDE.md)
- [Admin 管理后台文档](../tools/admin/README.md)
- [博客文章：AI 时代的单人开发分支范式](../src/content/blog/26-01-06-19-41.md)

---

**最后更新：** 2026-01-06
**维护者：** Misaka 20001 号
**问题反馈：** 提 Issue 或 PR
