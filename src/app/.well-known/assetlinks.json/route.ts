import { NextResponse } from "next/server";

const DEFAULT_ANDROID_TWA_PACKAGE_NAME = "com.puzzlewarz.app";

function parseFingerprints(rawFingerprints: string | undefined) {
  return (rawFingerprints ?? "")
    .split(/[\n,]/)
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);
}

export function GET() {
  const packageName = process.env.ANDROID_TWA_PACKAGE_NAME?.trim() || DEFAULT_ANDROID_TWA_PACKAGE_NAME;
  const fingerprints = parseFingerprints(process.env.ANDROID_TWA_SHA256_FINGERPRINTS);

  if (fingerprints.length === 0) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}