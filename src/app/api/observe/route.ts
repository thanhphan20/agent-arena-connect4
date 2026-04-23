import { NextRequest, NextResponse } from "next/server";
import { withStagehand } from "@/backend_utils/withStagehand";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const schema = z.object({
    url: z.string().url().optional(),
    instruction: z.string().min(1),
  });

  try {
    const body = await req.json();
    const parse = schema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
    }

    const result = await withStagehand(async (page) => {
      if (parse.data.url) {
        await page.goto(parse.data.url);
      }
      const suggestions = await page.observe(parse.data.instruction);
      return { suggestions };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
