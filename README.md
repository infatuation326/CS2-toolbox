# CS2 工具盒子

面向 CS2 玩家的本机工具盒子，提供 GSI 连接、状态监控、悬浮窗、自动功能和音效配置。

## 开发

需要 Node.js 18 或更高版本。

```powershell
npm install
npm start
```

运行测试：

```powershell
npm test
```

## 构建 Windows 版本

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run dist
```

安装版和便携版会输出到 `release` 目录。

## 数据仓库

赞助名单和公告数据位于 `cs2-toolbox-data` 目录，也可以单独部署为公开数据仓库。

## 许可证

项目代码采用 MIT License。仓库中的图片、音效和背景素材可能有独立的版权或授权条件，重新分发前请确认对应权利。
