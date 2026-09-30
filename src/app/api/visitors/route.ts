import { BOT_UA, visitorId } from "@/lib/visitor-id";
import { getVisitorCount, recordVisitor } from "@/lib/visitor-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await getVisitorCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to read visitor count:", error);
    return NextResponse.json({ error: "Visitor count unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const userAgent = request.headers.get("user-agent") ?? "";
    const count =
      !userAgent || BOT_UA.test(userAgent)
        ? await getVisitorCount()
        : await recordVisitor(visitorId(request));
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to record visitor:", error);
    return NextResponse.json({ error: "Visitor count unavailable" }, { status: 503 });
  }
}
