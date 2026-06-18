import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "https://esm.sh/crypto-js@4.2.0/md5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GoofishOrder = {
  order_no: string;
  order_status: number;
  refund_status?: number;
  order_time?: number;
  pay_time?: number;
  consign_time?: number;
  confirm_time?: number;
  update_time?: number;
  total_amount?: number;
  pay_amount?: number;
  waybill_no?: string;
  express_name?: string;
  buyer_nick?: string;
  seller_name?: string;
  seller_remark?: string;
  goods?: {
    title?: string;
    quantity?: number;
    price?: number;
    product_id?: number | string;
    item_id?: number | string;
    sku_text?: string;
  };
};

function compactJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

async function md5Hex(text: string) {
  return md5(text).toString();
}

async function signedGoofishPost(path: string, body: Record<string, unknown>) {
  const appKey = Deno.env.get("GOOFISH_APP_KEY");
  const appSecret = Deno.env.get("GOOFISH_APP_SECRET");
  if (!appKey || !appSecret) {
    throw new Error("Missing GOOFISH_APP_KEY or GOOFISH_APP_SECRET.");
  }

  const bodyString = compactJson(body);
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyMd5 = await md5Hex(bodyString);
  const sign = await md5Hex(`${appKey},${bodyMd5},${timestamp},${appSecret}`);
  const url = `https://open.goofish.pro${path}?appid=${encodeURIComponent(appKey)}&timestamp=${timestamp}&sign=${sign}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: bodyString,
  });
  const result = await response.json();
  console.log("goofish_response", {
    path,
    status: response.status,
    code: result?.code,
    msg: result?.msg,
  });
  if (!response.ok || result.code !== 0) {
    throw new Error(result.msg || `Goofish API error ${response.status}`);
  }
  return result.data;
}

function dateFromSeconds(seconds?: number) {
  if (!seconds) return new Date().toISOString().slice(0, 10);
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function mapStatus(status: number, refundStatus = 0) {
  if ([1, 2, 3, 8].includes(refundStatus)) return "after";
  if (refundStatus === 5 || status === 23) return "cancel";
  if (status === 12) return "paid";
  if (status === 21) return "shipped";
  if (status === 22) return "done";
  if (status === 24) return "cancel";
  return "draft";
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function orderToRow(order: GoofishOrder) {
  const goods = order.goods || {};
  const date = dateFromSeconds(order.pay_time || order.order_time || order.create_time);
  const durationDays = 7;
  const shipping = [order.express_name, order.waybill_no].filter(Boolean).join(" ");
  return {
    xianyu_order_no: order.order_no,
    xianyu_status: order.order_status,
    refund_status: order.refund_status ?? 0,
    buyer_nick: order.buyer_nick ?? null,
    seller_name: order.seller_name ?? null,
    product_id: goods.product_id ? String(goods.product_id) : null,
    item_id: goods.item_id ? String(goods.item_id) : null,
    raw_data: order,
    item_name: goods.title || `闲鱼订单 ${order.order_no}`,
    order_no: order.order_no,
    buyer: order.buyer_nick || "闲鱼买家",
    price: Number((order.pay_amount ?? order.total_amount ?? goods.price ?? 0) / 100),
    status: mapStatus(order.order_status, order.refund_status ?? 0),
    date,
    duration_days: durationDays,
    expected_done: addDays(date, durationDays),
    shipping: shipping || null,
    deposit: order.pay_amount ? `实付 ${(order.pay_amount / 100).toFixed(2)} 元` : null,
    accessories: goods.sku_text || null,
    note: order.seller_remark || null,
    updated_at: new Date((order.update_time || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      console.error("sync_auth_failed", userError);
      return Response.json({ error: "请先登录管理员账号。" }, { status: 401, headers: corsHeaders });
    }

    const requestBody = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(requestBody.days || 30), 1), 180);
    const now = Math.floor(Date.now() / 1000);
    const start = now - days * 86400;
    const pageSize = 50;
    let pageNo = 1;
    let allOrders: GoofishOrder[] = [];

    while (pageNo <= 100) {
      console.log("sync_goofish_page", { pageNo, start, now });
      const data = await signedGoofishPost("/api/open/order/list", {
        update_time: [start, now],
        page_no: pageNo,
        page_size: pageSize,
      });
      const list = data?.list || [];
      allOrders = allOrders.concat(list);
      if (list.length < pageSize || allOrders.length >= Number(data?.count || 0)) break;
      pageNo += 1;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const rows = allOrders.map(orderToRow);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    if (rows.length) {
      const { error } = await adminClient
        .from("orders")
        .upsert(rows, { onConflict: "xianyu_order_no" });
      if (error) throw error;
    }

    console.log("sync_goofish_done", { upserted: rows.length });
    return Response.json({ upserted: rows.length }, { headers: corsHeaders });
  } catch (error) {
    console.error("sync_goofish_failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500, headers: corsHeaders },
    );
  }
});
