# 闲鱼订单查询网站

这是一个用于管理闲鱼 / 闲管家订单的个人订单看板。

## 项目内容

- `public/index.html`：订单看板网页入口
- `supabase/migrations/20260617000000_goofish_orders.sql`：Supabase 数据库字段扩展脚本
- `supabase/functions/sync-goofish-orders/index.ts`：同步闲管家订单的 Supabase Edge Function
- `docs/goofish-sync-setup.md`：同步功能部署说明

## 本地查看

直接用浏览器打开：

```text
public/index.html
```

## Supabase 环境变量

同步函数需要在 Supabase 中配置：

```text
GOOFISH_APP_KEY=你的 app key
GOOFISH_APP_SECRET=你的 app secret
```

请不要把 `GOOFISH_APP_SECRET` 写进网页、GitHub 或聊天记录里。

## 后续计划

- 整理订单列表和搜索体验
- 完善闲鱼订单同步状态
- 增加导入、导出和统计功能
- 接入 GitHub 做版本备份

