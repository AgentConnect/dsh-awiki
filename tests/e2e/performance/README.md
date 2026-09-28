# 头像滚动基准

运行 `node tests/e2e/performance/run-avatar.mjs <输出目录>`。Vite production build、Chromium、同一份 1000 行数据（200 个四人群），字符/冷/热各三轮，真实 Avatar/Provider/IndexedDB；资料与 JPEG 响应使用确定性夹具，不包含 Host/Core/后端时延，不是产品 E2E 通过证明。

主指标为 requestAnimationFrame 间隔 P95（包含屏幕刷新等待，不等于 JS CPU 时间）。保持同一机器/视口/浏览器，停止其他构建与基准后比较相同轮次。热缓存分别记录此前已请求图片的重复请求和首次进入视区的图片；前者必须为零。真实产品的抽屉重复进入、页面重载、Host 重启由 `DSH-WEB-AVATAR-001` 验证。

真实页面使用按 DID/群订阅的资料投影；IndexedDB version 2 新增跨窗口串行写入预算，保留 version 1 图片。4 MiB/64 项预留空间允许批量维护，在 64 MiB/4096 项硬上限内淘汰；命中不进行全表扫描，写入也占用四个处理槽之一。
