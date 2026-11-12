# RiverAtlas-light · 浅色投影版

## GitHub 仓库

- 本项目（公开）：[RiverAtlas-light](https://github.com/VikasDhanve/RiverAtlas-light)，分支`main`。
- 深浅两版为独立项目，运行时均不需要另一个目录；本地`index.html`是离线入口，仓库链接不等同于在线部署地址。
- 本轮发布前完整回归72项通过；不上传node_modules、备份、环境文件及运行日志。
- 深色版：[RiverAtlas](https://github.com/VikasDhanve/RiverAtlas)；浅色版：[RiverAtlas-light](https://github.com/VikasDhanve/RiverAtlas-light)。

当前最新30页的独立浅色分支，用于与深色版并行复审；不覆盖原版。

## 打开演示

- 直接打开 [index.html](index.html)，或双击本目录的index.html。
- 移交时保留整个文件夹，特别是`assets/`和`src/`；浏览器运行不需要Node、网络或原版目录。
- 深色版入口：`D:/WorkSpace Development/AppResource/RiverAtlas/index.html`。
- 主要截图：[封面](backups/light-projection-20261112/p01.png)、[地图](backups/light-projection-20261112/p04.png)、[流程](backups/light-projection-20261112/p07.png)、[建库](backups/light-projection-20261112/p16.png)、[审核](backups/light-projection-20261112/p21.png)。

## 本版范围

白底深字、高对比青绿重点、浅色地图与业务图表，取消星空／深色山河装饰；不反色、不改写业务原图。保留原30页编排、最新图序与2秒轮播、全部文字和样例标识。

## 核验与边界

72项完整回归全部通过（退出0），含30页六尺寸、48份现用原件、鹰眼与2秒轮播、业务动画及索引操作。30个默认页面状态共865处可见语义文字样本的计算对比度检查全部≥4.5，无浏览器脚本错误／外网请求；原图内文字和装饰不属于自动对比度验收范围，也不等于投影实机认证。原版242份非缓存／非备份文件逐一SHA256不变，克隆版业务数据与原图资源字节一致。四文件独立回滚与累计46份补丁重建通过。投影仪亮度、分辨率、环境光和后排阅读效果待实机确认。

测试报告：`backups/light-projection-20261112/full-test.txt`；对比度报告：`contrast-audit.json`；数据／资源追溯：`docs/light-fork-manifest.json`。仅开发检查需要Node依赖，可在本目录执行npm ci后运行npm test或npm run check:projection；本机验证复用了已安装的相邻项目开发依赖，未复制node_modules。

回退使用保留的深色入口即可；四文件反向还原脚本和基线保存在`D:/WorkSpace Development/AppResource/RiverAtlas/backups/background-tabs-20261112/ROLLBACK.sh`及其BASELINE_LIGHT_*兄弟文件。自动测试只在独立副本执行回滚，不覆盖正式浅色版。
