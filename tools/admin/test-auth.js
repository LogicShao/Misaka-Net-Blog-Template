#!/usr/bin/env node
/**
 * Admin 认证功能测试脚本
 * 用法：node test-auth.js [token]
 */

const HOST = '127.0.0.1';
const PORT = 3201;

async function testAuth(token) {
  console.log('🧪 测试 Admin API 认证功能\n');

  const tests = [
    {
      name: '无认证访问 /api/info（应该允许）',
      path: '/api/info',
      headers: {},
      expectStatus: 200
    },
    {
      name: '无认证访问 /api/posts（应该拒绝）',
      path: '/api/posts',
      headers: {},
      expectStatus: token ? 401 : 200
    },
    {
      name: '错误 token 访问 /api/posts（应该拒绝）',
      path: '/api/posts',
      headers: { 'Authorization': 'Bearer wrong-token' },
      expectStatus: token ? 403 : 200
    },
    {
      name: '正确 token 访问 /api/posts（应该允许）',
      path: '/api/posts',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      expectStatus: 200
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await fetch(`http://${HOST}:${PORT}${test.path}`, {
        headers: test.headers
      });

      const success = response.status === test.expectStatus;
      if (success) {
        console.log(`✅ ${test.name}`);
        console.log(`   状态码: ${response.status}\n`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   期望: ${test.expectStatus}, 实际: ${response.status}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   错误: ${error.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`测试结果: ${passed} 通过, ${failed} 失败`);

  if (!token) {
    console.log('\n⚠️  未检测到 ADMIN_TOKEN，认证功能已禁用');
    console.log('   在 .env 文件中设置 ADMIN_TOKEN 以启用认证');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 从命令行参数或环境变量获取 token
const token = process.argv[2] || process.env.ADMIN_TOKEN;
testAuth(token);
