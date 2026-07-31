import { getIssue9OrdersClient } from "../utils/issue9Orders.js";

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const supabase = getIssue9OrdersClient();
  const { data, error } = await supabase
    .from("issue_9_payment_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw createError({ statusCode: 500, message: `載入訂單失敗：${error.message}` });
  }

  return { orders: data || [] };
});
