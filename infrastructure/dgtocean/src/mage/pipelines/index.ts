import { getTransactionsPipelineConfig } from "./raw_bitcoin_transactions";
import { getBlocksPipelineConfig } from "./raw_bitcoin_blocks";

export const pipelineDataToCreate = async () => {
  const transactionFiles = await getTransactionsPipelineConfig();
  const blockFiles = await getBlocksPipelineConfig();

  return [...transactionFiles, ...blockFiles];
};
