import {
  getIssue9OrdersClient,
  validateIssue9OrderInput,
} from "../../utils/issue9Orders.js";

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: "訂單編號不正確。" });
  }

  const body = await readBody(event);
  const input = validateIssue9OrderInput(body);
  const supabase = getIssue9OrdersClient();
  const { data, error } = await supabase
    .from("issue_9_payment_orders")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw createError({ statusCode: 500, message: `儲存訂單失敗：${error.message}` });
  }
  if (!data) {
    throw createError({ statusCode: 404, message: "找不到這筆訂單。" });
  }

  return { order: data };
});
