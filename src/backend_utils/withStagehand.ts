import { Stagehand } from "@browserbasehq/stagehand";
import stagehandConfig from "../stagehand.config";

type WithStagehandOptions = {
  autoClose?: boolean;
};

export async function withStagehand<T>(
  fn: (page: any, stagehand: Stagehand) => Promise<T>,
  options?: WithStagehandOptions
) {
  const stagehand = new Stagehand(stagehandConfig);
  await stagehand.init();
  try {
    const page = stagehand.page;
    return await fn(page, stagehand);
  } finally {
    const shouldAutoClose = options?.autoClose ?? true;
    if (shouldAutoClose) {
      await stagehand.close();
    }
  }
}


