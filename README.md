# Simple H5 Player Enhanced Script (精简版 HTML5 视频增强脚本)

> **极简、极速、无感介入。**
>
> 这是一个基于原版 h5player 的重构精简版。专注于核心的**倍速**、**快进**与**全屏**，移除所有冗余功能，**0 资源占用**。

## ✨ 核心特性

- 🚀 **零资源占用**：基于事件捕获机制，只有按下快捷键时才运行，平时 CPU 占用为 0%。
- 📺 **智能全屏**：优先触发网站自带全屏（保留弹幕、进度条），支持 B站、YouTube 等主流网站。
- 🛡️ **强力防误触**：自动识别输入状态，在搜索框、评论区打字时**绝对不会**误触发快捷键。
- ⚡ **极速响应**：支持 Shadow DOM 和懒加载视频，即开即用。

## ⌨️ 快捷键列表

| **按键**  | **功能**    | **说明**                            |
| --------- | ----------- | ----------------------------------- |
| `1` - `4` | 设置倍速    | 1x, 2x, 3x, 4x (支持长按/连按累加)  |
| `z`       | 重置倍速    | 在 1.0x 和 上一次倍速 之间切换      |
| `x` / `c` | 微调倍速    | 减速 / 加速 (每次 0.1)              |
| `→` / `←` | 快进 / 后退 | 默认 +5秒 / -3秒 (支持连按累加显示) |
| `Enter`   | 智能全屏    | 自动全屏播放器容器 (保留控制栏)     |

## 🔧 安装与配置

1. 安装浏览器扩展 **Tampermonkey**。
2. [点击这里安装脚本](https://raw.githubusercontent.com/tunecc/h5player/master/h5player.user.js) 。

自定义配置：

脚本代码顶部设有配置区域，可修改以下常量：

JavaScript

```
const STEP_XC = 0.1;             // x/c 调速幅度
const MAX_SPEED = 16.0;          // 最大倍速限制
const DEFAULT_RESTORE_SPEED = 1.5; // z 键恢复的倍速
const SEEK_STEP_FORWARD = 5;     // 右键快进秒数
const SEEK_STEP_REWIND = 3;      // 左键后退秒数
```

## 🤝 致谢 & License

本项目核心逻辑致敬 [h5player](https://github.com/xxxily/h5player)。

License: **MIT**