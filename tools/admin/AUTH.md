# Admin 服务器认证说明

## 概述

Admin 服务器现已支持 Bearer Token 认证，保护所有 API 端点（除 `/api/info`）免受未授权访问。

## 配置

### 1. 设置认证 Token

在项目根目录的 `.env` 文件中添加：

```bash
ADMIN_TOKEN=your-secret-token-here
```

**建议：** 使用强随机字符串作为 token（至少 32 字符）

生成随机 token 示例：
```bash
# Linux/macOS
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 启动服务器

```bash
npm run admin
```

启动时会显示认证状态：
- ✅ `Authentication enabled` - 认证已启用
- ⚠️  `Authentication disabled` - 未配置 ADMIN_TOKEN，认证已禁用

## 使用方式

### 前端调用示例

```javascript
const ADMIN_TOKEN = 'your-secret-token-here';

// 方式 1: 使用 Authorization header
fetch('http://127.0.0.1:3201/api/posts', {
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
});

// 方式 2: 直接传递 token（不推荐）
fetch('http://127.0.0.1:3201/api/posts', {
  headers: {
    'Authorization': ADMIN_TOKEN
  }
});
```

### curl 测试示例

```bash
# 使用 Bearer token
curl -H "Authorization: Bearer your-secret-token-here" \
  http://127.0.0.1:3201/api/posts

# 直接传递 token
curl -H "Authorization: your-secret-token-here" \
  http://127.0.0.1:3201/api/posts
```

## 受保护的端点

以下端点需要认证：

- `POST /api/posts` - 创建文章
- `GET /api/posts/:id` - 获取文章详情
- `PUT /api/posts/:id` - 更新文章
- `DELETE /api/posts/:id` - 删除文章
- `POST /api/posts/:id/fix-bold` - 修复中文加粗
- `POST /api/build` - 构建博客
- `GET /api/build/status` - 构建状态
- `GET /api/friends` - 获取友链
- `POST /api/friends` - 添加友链
- `PUT /api/friends/:index` - 更新友链
- `DELETE /api/friends/:index` - 删除友链
- `GET /api/profile` - 获取个人信息
- `PUT /api/profile` - 更新个人信息

## 无需认证的端点

- `GET /api/info` - 服务器信息
- 静态资源（UI 文件）

## 错误响应

### 401 Unauthorized - 缺少 token

```json
{
  "success": false,
  "error": "未授权：缺少 Authorization header"
}
```

### 403 Forbidden - 无效 token

```json
{
  "success": false,
  "error": "未授权：无效的 token"
}
```

## 测试

运行测试脚本验证认证功能：

```bash
# 使用环境变量中的 token
node tools/admin/test-auth.js

# 手动指定 token
node tools/admin/test-auth.js your-secret-token-here
```

## 向后兼容

如果未设置 `ADMIN_TOKEN` 环境变量，服务器会：
1. 记录警告日志
2. 允许所有请求通过（向后兼容旧版本）

**生产环境强烈建议配置 ADMIN_TOKEN！**

## 安全建议

1. ✅ 使用强随机 token（至少 32 字符）
2. ✅ 不要将 `.env` 文件提交到 Git
3. ✅ 定期更换 token
4. ✅ 仅在本地网络或 VPN 内访问 Admin 服务器
5. ⚠️  不要在公网暴露 Admin 服务器（默认绑定 127.0.0.1）
6. ⚠️  不要在前端代码中硬编码 token

## 故障排查

### 问题：所有请求都返回 401

**原因：** 未在请求中包含 Authorization header

**解决：** 添加 `Authorization: Bearer <token>` header

### 问题：请求返回 403

**原因：** Token 不匹配

**解决：** 检查 `.env` 文件中的 `ADMIN_TOKEN` 是否与请求中的 token 一致

### 问题：认证未生效

**原因：** 未设置 `ADMIN_TOKEN` 环境变量

**解决：** 在 `.env` 文件中添加 `ADMIN_TOKEN=...` 并重启服务器
