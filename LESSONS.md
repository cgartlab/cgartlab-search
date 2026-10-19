# LESSONS — cgartlab-search

> 统一搜索 Agent Skill（多后端路由：Brave/Exa/Context7 + key-less Bing RSS/腾讯新闻/虎扑/SO/GitHub/HN，Node 18+ 零依赖）。
> 本仓库从真实失误沉淀的「教训→规则」清单。**会话开始先全文阅读并遵循其中所有规则**；出现新失误按 §维护 追加。
> 权威依据：Anthropic Claude Code memory/best practices（<200 行、具体可验证、第二次犯同样错即写入）；社区 lessons.md 惯例（Boris Cherny，Anthropic）。
> 来源：本仓库 SKILL.md / README.md + 已验证 fix 提交；预填为种子，后续由 Agent 在真实工作中增长。

## 维护
- **触发**：用户纠正 / Agent 自查到的失误 / 非显而易见的 gotcha。
- **格式**：`### <主题>` 下，每条 = 失误（具体场景）→ 规则（最小可执行指令），一行可验证。
- **只记项目特有、不可从代码推断的**；通用最佳实践不写；含糊措辞（"小心""注意"）删掉。
- **重复出现** → 升级进 `AGENTS.md` 硬规则；**月度审阅**裁剪过期项；目标 < 200 行。

## SKILL.md Frontmatter

### description YAML 标量格式
- 失误：SKILL.md frontmatter 的 `description` 值含单引号（如 `don't`），未用单引号标量包裹，YAML 解析非法 → 规则：含撇号/特殊字符的 description 用单引号标量包裹，内部撇号双写（见 SKILL.md frontmatter）（commit 1b97f3f）

### version 唯一权威源
- 失误：版本号出现在多处不一致（SKILL.md/README/CHANGELOG/tag） → 规则：`SKILL.md` frontmatter `metadata.version` 是唯一权威，tag 命名 `v<version>` 逐字一致（见 README「发布与版本」）

## 脚本与密钥

### secrets.json 解析路径
- 失误：`secrets.json` 解析路径未从技能根目录查找，在不同 harness 下找不到文件 → 规则：解析路径改为技能根优先（commit 1ad5fb8）

### key-less vs keyed 后端
- 失误：在受限 egress 环境（如 DSH）调用 brave/exa，这两个是 curl-only keyed 后端，WebFetch 不可达 → 规则：key-less 后端（bing/context7/qqnews/hupu/so/github/hn）走 WebFetch，keyed 后端（brave/exa）走 curl，不可达时降级用 bing 替代（见 SKILL.md「Backend status」）

### 失败后端不编造
- 失误：某后端不可达时编造结果替代 → 规则：不可达的后端在回复中加一行说明（如 "Brave/Exa 在本环境不可达，已用 bing 替代"），绝不编造（见 SKILL.md「Step 3」）

## 路由与降级

### 知乎未配置时的降级
- 失误：zhihu 未配置时不降级，直接报错 → 规则：用 `bing site:zhihu.com` 作为 best-effort 替代，miss 时诚实说明降级（见 SKILL.md「Step 1」）

### 语义化路由
- 失误：所有查询都走同一后端，未按意图路由 → 规则：general web→bing、docs→context7、dev Q&A→so+hn、news→qqnews、足球→hupu、deep research→bing+context7+hn（见 SKILL.md「Step 1」）
