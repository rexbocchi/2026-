# 面试题库刷题网页

基于 `面试题库.pdf` 抽取生成的纯前端刷题网页，支持手机访问和 Vercel 部署。

## 本地预览

```bash
cd /Users/oc/Documents/codex/interview-practice
python3 -m http.server 8080
```

浏览器打开：<http://localhost:8080>

## 功能

- 刷题模式：单选、多选、判断自动判题；简答/案例可查看参考答案
- 答案背诵模式：按题库原始题号顺序直接展示答案，选择题会高亮正确选项
- 错题本、收藏夹、搜索、题型筛选、随机顺序
- 本地浏览器保存做题记录
- 支持导出/导入进度 JSON，便于电脑和手机之间手动同步
- PWA 离线缓存，部署 HTTPS 后手机可“添加到主屏幕”

## 部署到 Vercel

1. 新建 GitHub 仓库并上传本目录所有文件。
2. 登录 Vercel，选择 Import Git Repository。
3. Framework Preset 选择 Other 或直接默认。
4. Build Command 留空，Output Directory 留空或填 `.`。
5. Deploy。

