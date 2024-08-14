import { getTestPipelineConfig } from "./raw_test";

export const pipelineDataToCreate = async () => {
  const testFiles = await getTestPipelineConfig();

  return testFiles;
};
