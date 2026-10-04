# VSR Fullscreen Helper

[English](README.md)

一个很小的 Chrome 扩展（Manifest V3），帮助 **NVIDIA RTX 视频超分（RTX Video Super Resolution，VSR）** 在原本不生效的网站上生效。

## 原理

Chrome 只会对以 DirectComposition 覆盖层（overlay）方式呈现的视频应用 RTX VSR。有些网站上，即使硬件解码正常，页面里的某些东西也会让 `<video>` 无法被提升为覆盖层，常见原因：

- 盖在视频上方的元素：弹幕层、水印、自定义控制栏
- video 或祖先元素上的 `filter`、`transform`、`opacity`、`mix-blend-mode`、`clip-path`、`mask`、`border-radius`
- 播放器把画面画到 `<canvas>` 上，真正的 `<video>` 被隐藏

本扩展让 **`<video>` 元素本身**进入全屏，绕过播放器外壳。全屏元素位于浏览器的 top layer，祖先样式和同级覆盖物不再影响它。全屏期间扩展还会对该 video 强制清除阻止覆盖层的 CSS，退出全屏后自动移除。

如果网站是 canvas 渲染，或解码路径本身不支持 VSR，扩展帮不上忙；诊断快捷键可以帮你判断是不是这种情况。

## 使用

1. 开始播放视频。
2. 按 **Alt+Shift+V**：正在播放的视频单独全屏，再按一次退出。
3. 确认 RTX VSR 已激活（NVIDIA App / NVIDIA 控制面板，或开关超分时观察任务管理器里显卡占用的变化）。

| 功能 | 页内热键（推荐） | 备用 `chrome.commands` |
|---|---|---|
| 视频全屏 / 退出 | `Alt+Shift+V` | `Alt+Shift+F` |
| 诊断输出到控制台 | `Alt+Shift+D` | `Alt+Shift+G` |

**为什么有两套：** `requestFullscreen()` 需要用户激活。页内热键是页面自己收到的 `keydown`（捕获阶段），一定带激活。`chrome.commands` 由浏览器处理后再转给页面，页面里不一定有激活；失败时视频角落会出现一个"▶ Fullscreen video"按钮（8 秒后消失），点它即可。

**选哪个 video：** 优先正在播放的，其次可见面积最大的。`chrome.commands` 通道会跨所有 frame 比较；页内热键在焦点所在 frame 内选，没有播放中的 video 时转发给子 iframe。如果播放器在跨域 iframe 里热键没反应，先在视频上点一下让 iframe 获得焦点，或使用视频角落的按钮。

### 诊断

打开开发者工具（F12）→ Console，按 `Alt+Shift+D`，会输出：

- video 及所有祖先上非默认的 `filter`、`backdrop-filter`、`transform`、`opacity`、`mix-blend-mode`、`clip-path`、`mask`、`border-radius`、`visibility`、`display`
- 用 `elementsFromPoint` 在 5×5 个采样点上找出盖在 video 上方的元素
- video 是否被隐藏、尺寸异常、在视口外或还没有画面
- 与视频区域重叠的 canvas（判断是不是 canvas 渲染）

视频在 iframe 里时，用控制台的 context 下拉框切换到该 frame；`<iframe>` 元素自身的样式链由父 frame 输出。

## 安装

### 从源码加载（已解压扩展）

1. 下载或 clone 本仓库。
2. 打开 `chrome://extensions`，开启"开发者模式"。
3. 点"加载已解压的扩展程序"，选择本文件夹。
4. 已经打开的标签页需要刷新一次，content script 才会注入。

### 修改快捷键

- 备用 commands：`chrome://extensions/shortcuts`。
- 页内热键：编辑 `content.js` 顶部的 `HOTKEYS`（`code` 用物理键名，如 `KeyV`），在扩展页点刷新按钮，再刷新网页。不要设成和备用 commands 相同的组合，否则会被 Chrome 先拦截。

## 权限与隐私

- `host_permissions: <all_urls>` 和全 frame 的 content script：视频可能在任何网站、任何 iframe 里，所以需要。脚本平时空闲，按下快捷键才动作。
- `scripting`：仅用于备用的 `chrome.commands` 通道，在页面各 frame 里运行扩展自己的函数。
- 不发网络请求、不加载远程代码、无统计、不存储也不收集任何数据。详见 [PRIVACY.md](PRIVACY.md)。

## 全屏后 VSR 仍不生效

说明原因不是被某个元素挡住覆盖层，可以排查：

1. 诊断里目标 video 的 `inFullscreen: true`（不是 canvas 旁边被隐藏的替身）。
2. 硬件解码：`chrome://media-internals` 里的 `kVideoDecoderName`（如 `D3D11VideoDecoder`）。
3. `chrome://gpu` 显示硬件加速正常且 `Supports overlays: true`。
4. NVIDIA App / 控制面板里已开启 VSR，且显卡和驱动支持。用 YouTube 低分辨率对比。
5. 用干净的 Chrome 配置（`--user-data-dir`）排除其他扩展和实验标志。

## 限制

- `chrome://` 页面和 Chrome 网上应用店无法注入。
- 没有 `allow="fullscreen"` 的跨域 iframe 无法全屏（控制台会有警告）。
- Chrome 与 RTX VSR 的行为可能随版本变化。

## 开发

```
node tools/make-icons.js   # 重新生成 icons/
node tools/pack.js         # 生成 dist/vsr-fullscreen-helper-<version>.zip，用于上传 Chrome 应用商店
```

## AI 辅助

本项目在 Claude（Anthropic）的辅助下开发。

## 声明

与 NVIDIA、Google 无关联，也未获其认可。NVIDIA 和 RTX 是 NVIDIA Corporation 的商标。

## 许可证

[MIT](LICENSE)
