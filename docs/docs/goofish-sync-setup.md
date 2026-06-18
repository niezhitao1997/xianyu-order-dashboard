# 闲管家订单同步接入步骤

这个项目包含三部分：

- `public/index.html`：网页，已加入“同步闲鱼订单”按钮
- `supabase/migrations/20260617000000_goofish_orders.sql`：扩展 `orders` 表字段
- `supabase/functions/sync-goofish-orders/index.ts`：Supabase Edge Function，同步闲管家订单

## 1. 在 Supabase 执行 SQL

打开 Supabase 项目，进入 `SQL Editor`，新建查询并运行：

```sql
-- 使用 supabase/migrations/20260617000000_goofish_orders.sql 的内容
```

它会给 `orders` 表增加闲鱼订单字段，并创建 `xianyu_order_no` 唯一索引，后续同步会按闲鱼订单号更新同一笔订单。

## 2. 设置 Edge Function 环境变量

在 Supabase 中设置：

```text
GOOFISH_APP_KEY=你的 app key
GOOFISH_APP_SECRET=你的 app secret
```

注意：`GOOFISH_APP_SECRET` 只放在 Supabase 环境变量里，不要放进网页、GitHub Pages 或聊天记录。

Supabase 自带这些变量，通常不需要手动设置：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 3. 部署 Edge Function

如果使用 Supabase CLI，在包含 `supabase/` 文件夹的目录运行：

```bash
supabase functions deploy sync-goofish-orders
supabase secrets set GOOFISH_APP_KEY=你的appKey GOOFISH_APP_SECRET=你的appSecret
```

也可以在 Supabase 控制台创建 Edge Function，把 `supabase/functions/sync-goofish-orders/index.ts` 的内容粘进去，再设置环境变量。

## 4. 使用网页同步

部署完成后：

1. 打开网页
2. 点齿轮
3. 点 `管理员登录`
4. 登录 Supabase 管理员账号
5. 再点齿轮
6. 点 `同步闲鱼订单`

同步函数默认拉取最近 30 天更新过的订单，并写入 Supabase `orders` 表。

## 5. 状态映射

- `12 待发货` -> `已付款待发货`
- `21 已发货` -> `已发货待确认`
- `22 已完成` -> `已完成`
- `23 已退款` / `24 已关闭` -> `已取消`
- 退款处理中 -> `售后中`
- 其他状态 -> `沟通中`

