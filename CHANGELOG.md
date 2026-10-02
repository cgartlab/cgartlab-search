# Changelog

本项目所有重要变更记录于此。格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [语义化版本](https://semver.org/)。

> 版本策略：技能尚不完善，当前版本 `0.1.0`；未发布变更记于 [Unreleased]，是否切版由维护者决定（见 `docs/RELEASING.md`）。

## [Unreleased]

### Fixed
- **SKILL.md frontmatter 的 `description` 是非法 YAML**（值里 `Backends: Brave/Exa` 的 ASCII
  冒号+空格让纯标量被解析成嵌套映射）：DSH 自带的 `yaml` 解析器与 `js-yaml` 双双报错，
  而 DSH 的 skill-filesystem 对解析失败的 skill 直接忽略（`parseSkillFile` 的 warn 分支）——
  skill 可能因此不被加载。对照组 `attention`/`quill` 的 frontmatter 两解析器均通过。
  现改为单引号标量（值内撇号双写），解析后内容与修复前逐字一致（815 字符）。

- **`secrets.json` 解析路径错误**（`scripts/search.mjs` 与 `scripts/search.sh`）：文件实际位于技能根目录（`SKILL.md` 旁，与 `references/backends.md` 的说明一致），但两个脚本都在 `scripts/` 子目录下查找，导致 `brave` / `exa` / `context7` / `tencent` / `zhihu` 等需密钥的后端永远返回 `missing key`（异常被静默吞掉，退化为仅环境变量模式）。现改为按 `scripts/secrets.json` → `../secrets.json` 顺序探测，两个位置均可，环境变量优先级不变。免密钥后端不受影响。

## [0.1.0] - 2026-10-01

首次发布（此前未对外发布过任何版本，本次涵盖自内部初版以来的全部工作）。

### Added

- **9 个搜索后端**（`references/backends.md`）：`bing`（cn.bing.com RSS 通用网页搜索）、`context7`（库/框架/API 文档两步检索）、`qqnews`（腾讯新闻热榜 JSON）、`hupu`（虎扑足球新闻列表）、`so`（Stack Overflow 问答）、`github`（仓库搜索）、`hn`（Hacker News）、`brave`（通用网页/新闻，需 key）、`exa`（深度语义检索，需 key）。前 7 个免密钥，可经 `web_fetch` 在受限出口环境使用。
- **路由策略**（`references/routing.md`）：按意图分流的双列路由表（curl harness / DSH web_fetch），含查询改写规则（长时效句改关键词、紧复合形式重试）、数字与行情两步法、故障范围判定、诚实降级规则。
- **双实现调度脚本**：`scripts/search.mjs`（零依赖 Node ESM，11 个后端适配器，输出归一化 JSON）与 `scripts/search.sh`（curl + python3 等价实现）。
- **密钥管理**：`secrets.example.json` 模板 + `.gitignore` 屏蔽真实 `secrets.json`（实测 `git check-ignore` 命中）；环境变量优先、文件回退。
- **实测记录**：`web_fetch` 主机可达性地图（区分可达 / JS 截断 / 不可达三类）、知乎 API 403 反爬、Bing `site:` 兜底在中文长句下坍缩为词条定义等实证案例。
- **评测用例**：`evals/evals.json` 8 条（文档检索、热点新闻、足球新闻、知乎降级诚实性、数据两步法、跨域广研等）。
- **仓库治理**：`.gitattributes`（LF 归一）、`LICENSE`（CC BY-NC-SA 4.0）、`docs/RELEASING.md`（发布流程与三道闸）、`CHANGELOG.md` 本文件。

### Changed

- `SKILL.md` frontmatter 增加 `license` 与 `metadata`（`version` / `date` / `reference`）——Agent Skill 的版本源就在此处。
- `README.md` 增加「发布与版本」章节，指向版本源与变更记录。

### 已知限制

- `brave` / `exa` 需密钥，且在当前受限出口环境不可达，仅在带 shell 网络的 harness 可用。
- `tencent`（官方腾讯新闻 API）与 `zhihu` 端点尚未配置，返回 `not configured` 并走降级路径。