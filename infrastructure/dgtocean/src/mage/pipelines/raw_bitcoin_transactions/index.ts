import { promises as fs } from "fs";
import { join } from "path";
import { stringify } from "yaml";
import { config } from "dotenv";
import { generatePipelineYaml } from "../utils/generatePipelineYaml";
import { readPythonFile } from "../utils/readPythonFile";
import { IPipelineFiles } from "../../types";

config();

const pipelineName = "raw_bitcoin_transactions";

export const getTransactionsPipelineConfig = async () => {
  const loaderConfig = {
    connector_type: "kafka",
    bootstrap_server: process.env.KAFKA_BOOTSTRAP_SERVERS,
    topic: process.env.KAFKA_TOPIC,
    consumer_group: "raw_bitcoin_transactions",
    include_metadata: false,
    api_version: "0.10.2",
    auto_offset_reset: "earliest",
    security_protocol: "SASL_SSL",
    sasl_config: {
      mechanism: "PLAIN",
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    },
    ssl_config: {
      cafile: "/mage_data/cafile.crt",
    },
    serde_config: {
      serialization_method: "RAW_VALUE",
    },
  };
  const exporterConfig = {
    connector_type: "postgres",
    database: process.env.PG_DB,
    host: process.env.PG_HOST,
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    schema: "public",
    table: "raw_bitcoin_transactions",
    unique_conflict_method: "DO NOTHING",
    unique_constraints: ["tx_txid", "tx_hash", "tx_timestamp"],
  };

  const loaderFileContent = stringify(loaderConfig);
  const transformerFileContent = await readPythonFile(
    join(__dirname, `./${pipelineName}_transformer.py`)
  );
  const exporterFileContent = stringify(exporterConfig);

  const blocksToCreate = [
    {
      path: `/mage_data/data_loaders/`,
      filename: `${pipelineName}_data_loader`,
      extension: "yaml",
      content: loaderFileContent,
      pipeline_name: pipelineName,
      type: "data_loader",
      executor_type: "local_python",
      downstream_blocks: [`${pipelineName}_transformer`],
      upstream_blocks: [],
      all_upstream_blocks_executed: true,
    },
    {
      path: `/mage_data/transformers/`,
      filename: `${pipelineName}_transformer`,
      extension: "py",
      content: transformerFileContent,
      pipeline_name: pipelineName,
      type: "transformer",
      executor_type: "local_python",
      downstream_blocks: [`${pipelineName}_data_exporter`],
      upstream_blocks: [`${pipelineName}_data_loader`],
      all_upstream_blocks_executed: false,
    },
    {
      path: `/mage_data/data_exporters/`,
      filename: `${pipelineName}_data_exporter`,
      extension: "yaml",
      content: exporterFileContent,
      pipeline_name: pipelineName,
      type: "data_exporter",
      executor_type: "local_python",
      downstream_blocks: [],
      upstream_blocks: [`${pipelineName}_transformer`],
      all_upstream_blocks_executed: false,
    },
  ];

  const blocks = blocksToCreate.map((block) => {
    const { content, path, filename, ...blockData } = block;

    return blockData;
  });

  const pipelineMetadataYaml = generatePipelineYaml({
    blocks,
    pipeline_name: pipelineName,
    type: "streaming",
  });

  const pipelineMetadata = {
    path: `/mage_data/pipelines/`,
    folder: pipelineName,
    filename: "metadata",
    extension: "yaml",
    content: pipelineMetadataYaml,
  };

  return [...blocksToCreate, pipelineMetadata] as IPipelineFiles[];
};