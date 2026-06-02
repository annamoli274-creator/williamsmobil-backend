import { NextResponse } from "next/server";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ??
  (() => {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
  })();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in /api/contacts route:", error);
    return NextResponse.json(
      { error: "Failed to reach backend. Check NEXT_PUBLIC_BACKEND_URL." },
      { status: 500 }
    );
  }
}
