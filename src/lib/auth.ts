import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Đọc cookie phiên đăng nhập, xác minh với database, trả về user nếu hợp lệ
 * và đúng vai trò yêu cầu. Trả về null nếu chưa đăng nhập hoặc sai quyền.
 *
 * QUAN TRỌNG: luôn gọi hàm này ở ĐẦU mỗi API route thao tác dữ liệu
 * (thêm/sửa/xóa), không được chỉ dựa vào việc ẩn nút trên giao diện —
 * vì API vẫn có thể bị gọi trực tiếp (curl, Postman) bỏ qua giao diện.
 */
export async function requireRole(allowedRoles: Array<"ADMIN" | "TEACHER">) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  const hasSession = cookieStore.get("auth_session")?.value === "true";

  if (!userId || !hasSession) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !allowedRoles.includes(user.role as "ADMIN" | "TEACHER")) {
    return null;
  }
  return user;
}
