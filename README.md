# 回声档案 · EchoCase

**在看见、听见与相信之间，复原最后一段信号。** EchoCase 是一款浏览器里的多模态 AI 推理游戏：玩家检查现场图像、聆听信号片段、询问当事人，再用可追溯的证据提交结论。

[公开 GitHub 仓库](https://github.com/FidollarinLA/echo-case) · Apache-2.0 · MoonBit 规则核心

## 为什么做

很多 AI 叙事游戏把事实和结局交给模型临场编造，玩家很难判断线索是否前后一致。EchoCase 把“发生了什么”和“怎样算推理成立”交给 MoonBit 规则核心，把模型限制在角色对话和复盘说明里。线索解锁、证据引用、结局与评分可重复验证，模型不能自行更改案件事实。

## 当前可玩内容

- 一局约 5 分钟的原创案件「最后一段回声」，不需要账号或 API 密钥即可完整试玩。
- 图像现场与可点击热点；合成音频提示、浏览器语音旁白和可选语音输入。
- 三位夜班角色；无密钥时使用可测试的 MoonBit 固定台词，配置模型后可自由追问。
- 可附加一张图片交给兼容视觉输入的模型分析。图片仅由本机服务转发，不保存到项目中。
- 证据板、引用式结案、MoonBit 确定性评分和复盘记录。

## 运行

需要 Node.js 20 或更新版本，以及 MoonBit 工具链。无需安装 npm 依赖。

```sh
npm start
```

打开终端显示的本地地址。单人试玩和脚本角色不需要联网。当前作品包含一局单人体验；房间码联机、用户上传资料自动生成案件和媒体素材编辑器属于后续方向，不在本期验收范围内。

## 启用模型对话

在启动服务前设置 OpenAI Chat Completions 兼容接口。模型密钥只放在本机服务进程环境变量中，前端不会读取或保存密钥；上传图片只会随当次提问发送给配置的模型服务。

```sh
export OPENAI_API_KEY="你的密钥"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_MODEL="gpt-4o-mini"
npm start
```

本项目的演示案件和人物均为虚构，现场图像为项目自行绘制的 SVG，音频提示由浏览器 Web Audio 合成。模型回答受事实约束，但生成式回答仍可能出错；游戏评分和结案判断始终由 MoonBit 核心决定。语音识别取决于浏览器支持情况。

## 开发与验证

```sh
moon info
moon fmt
moon test
moon build --target js --release
node --check server.mjs
node --check web/app.js
```

完整本地检查可运行 `npm test`；它会编译 MoonBit 规则核心、运行 MoonBit 单元测试，并启动临时本地服务验证试玩页面和脚本对话接口。

MoonBit 实现推理评分、线索门槛和无密钥角色对话；案件文本、证据说明、角色资料与 AI 角色知识边界也集中在 MoonBit。浏览器界面和本地模型适配服务分别使用 HTML/CSS/JavaScript 与 Node.js。`npm start` 会先编译 MoonBit 规则模块，再启动本地服务。

## 比赛方向与项目来源

参赛方向：**AI 应用**。项目是原创实现，不是移植或对现有项目的代码修改，采用 Apache-2.0 许可证。公开产品中可见课程材料转解谜与 AI 推理游戏等相邻方向，本项目没有复制其代码、素材或关卡，尝试以“玩家可引用证据、规则核心负责事实判定、模型只扮演角色”的组合做区分。

相关产品用于赛前相似性调研，不是运行依赖：

- [Escaply](https://www.escaply.com/en)：从学习材料创建互动学习游戏。
- [MysteryEngine](https://mysteryengine.ai/)：生成式 AI 推理活动和角色审问。
- [Reisen](https://reisen-docs.vercel.app/)：MoonBit 视觉小说引擎，属于生态中的游戏工具参考。

MoonBit 主要实现、公开仓库、实质开发记录、测试与可复现演示说明，按当期赛事章程持续完善。项目申报一页说明见 [PROJECT_PROPOSAL.md](PROJECT_PROPOSAL.md)。
