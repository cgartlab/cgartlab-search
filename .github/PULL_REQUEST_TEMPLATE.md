## 摘要

<!-- 一句话说明改了什么，动词开头 -->

Closes #

## 改动内容

-
-

## 验证

- [ ] `node --check scripts/search.mjs` 通过
- [ ] `evals/evals.json` 与 `secrets.example.json` 是合法 JSON（`python3 -m json.tool`）
- [ ] `bash -n scripts/search.sh` 通过
- [ ] 新增/改动的后端在 `references/backends.md` 有对应小节
- [ ] 对外可见变化已记入 `CHANGELOG.md` 的 `[Unreleased]`
- [ ] `secrets.json` 未被 git 跟踪，`secrets.example.json` 值全为空

## 影响范围

<!-- 是否影响路由行为 / 密钥路径 / 已实测的可达性地图 -->