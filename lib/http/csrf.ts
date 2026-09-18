import type { NextRequest } from "next/server";
import { getConfig } from "@/lib/config";

export function hasTrustedOrigin(request: NextRequest) {
  return request.headers.get("origin") === getConfig().appUrl.origin;
}
