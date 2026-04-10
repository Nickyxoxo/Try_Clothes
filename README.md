# Try Clothes - 虚拟试衣应用

一个基于 AI 的虚拟试衣 Web 应用，用户可以上传自己的照片和衣服图片，AI 会生成试穿效果图。

## 功能特性

- 上传多张人物照片（支持 JPG/PNG）
- 上传或选择衣服图片
- 自动识别衣服类别（上衣/下装/裙子）
- 智能匹配校验（上半身照不能配下装）
- 批量生成试穿结果
- 逐张显示生成进度
- 结果对比查看（原图 vs 试穿图）

## 技术栈

| 技术 | 说明 |
|------|------|
| Next.js 14 | React 框架 |
| TypeScript | 类型安全 |
| React 18 | UI 库 |
| 火山引擎 AI | 图像生成 API |
| 腾讯云 COS | 图片存储 |

## 项目结构

```
Try_Clothes/
├── pages/
│   ├── index.tsx       # 主页面
│   ├── api/
│   │   ├── tryon.ts   # AI 生成 API
│   │   └── upload.ts  # COS 上传 API
│   ├── _app.tsx
│   └── _document.tsx
├── lib/
│   ├── types.ts      # 类型定义
│   ├── utils.ts     # 工具函数
│   └── api.ts       # API 调用
├── styles/
│   └── globals.css # 全局样式
├── public/
├── .env.local      # 环境变量（本地）
├── .gitignore
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# 火山引擎 AI API
VOLCENGINE_API_KEY=your_api_key

# 腾讯云 COS（图片存储）
TENCENT_COS_SECRET_ID=your_secret_id
TENCENT_COS_SECRET_KEY=your_secret_key
TENCENT_COS_BUCKET=your_bucket_name
TENCENT_COS_REGION=ap-shanghai
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API 接口说明

### 1. 图片上传 `/api/upload`

将用户上传的图片存储到腾讯云 COS，返回公开访问 URL。

**请求：**
```json
{
  "imageBase64": "data:image/png;base64,..."
}
```

**响应：**
```json
{
  "url": "https://xxx.cos.ap-shanghai.myqcloud.com/tryon/xxx.png"
}
```

### 2. 虚拟试穿 `/api/tryon`

调用火山引擎 AI 生成试穿效果图。

**请求：**
```json
{
  "personImageUrl": "https://xxx.png",
  "clothingImageUrl": "https://xxx.png"
}
```

**响应：**
```json
{
  "url": "https://xxx.png",
  "size": "2048x2048"
}
```

## 匹配规则

| 人物类型 | 衣服类别 | 结果 |
|----------|-----------|------|
| 上半身 | 上衣 | ✅ 允许 |
| 上半身 | 下装 | ❌ 拦截 |
| 上半身 | 裙子 | ❌ 拦截 |
| 全身 | 上衣 | ✅ 允许 |
| 全身 | 下装 | ✅ 允许 |
| 全身 | 裙子 | ✅ 允许 |

## 配置说明

### 腾讯云 COS

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cos5)
2. 创建存储桶（选择地域如 ap-shanghai）
3. 设置权限为「公共读」
4. 获取 SecretId、SecretKey

### 火山引擎

1. 登录 [火山引擎控制台](https://www.volcengine.com/)
2. 获取 API Key
3. 使用图像生成模型

## 注意事项

- 图片需要可公开访问（腾讯云 COS 需设置公共读权限）
- 建议图片大小不超过 5MB
- 生成速度取决于 API 服务负载

## 许可证

MIT