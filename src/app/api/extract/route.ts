import { NextRequest, NextResponse } from "next/server";
import { withStagehand } from "@/backend_utils/withStagehand";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const schema = z.object({
    url: z.string().url().optional(),
    instruction: z.string().min(1),
    schema: z.record(z.string()).optional(),
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

      const keys = Object.keys(parse.data.schema ?? { value: "string" });
      const dynamicSchema = z.object(
        keys.reduce<Record<string, z.ZodString>>((acc, key) => {
          acc[key] = z.string();
          return acc;
        }, {})
      );

      const extraction = await page.extract({
        instruction: parse.data.instruction,
        schema: dynamicSchema,
      });
      return { data: extraction };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
