// TODO: POST tao order moi, PATCH cap nhat trang thai
export async function POST(request) {
  const body = await request.json();
  return Response.json({ todo: "luu order vao database", received: body });
}
