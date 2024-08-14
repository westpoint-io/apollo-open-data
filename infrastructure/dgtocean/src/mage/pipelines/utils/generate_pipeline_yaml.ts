import { stringify } from "yaml";
import { IBlockProps } from "../../types";

interface IGeneratePipelineProps {
  pipeline_name: string;
  type: string;
  blocks: IBlockProps[];
}

export const generateBlock = (props: IBlockProps) => {
  const { type, pipeline_name, extension, ...config } = props;
  const uuid = `${pipeline_name}_${type}`;
  const path = `${type}s/${pipeline_name}_${type}.${extension}`;

  return {
    uuid,
    name: uuid,
    color: null,
    executor_config: null,
    retry_config: null,
    timeout: null,
    status: "updated",
    configuration: {
      file_path: path,
      file_source: {
        path: path,
      },
    },
    language: extension,
    ...config,
  };
};

export const generatePipelineYaml = ({
  pipeline_name,
  type,
  blocks,
}: IGeneratePipelineProps) => {
  const config = {
    blocks: blocks.map((block) => generateBlock(block)),
    cache_block_output_in_memory: false,
    callbacks: [],
    concurrency_config: {},
    conditionals: [],
    data_integration: null,
    description: null,
    executor_config: {},
    executor_count: 1,
    executor_type: null,
    extensions: {},
    notification_config: {},
    remote_variables_dir: null,
    retry_config: {},
    run_pipeline_in_one_process: false,
    settings: {
      triggers: null,
    },
    spark_config: {},
    type,
    uuid: pipeline_name,
    name: pipeline_name,
    variables_dir: "/home/src/mage_data/mage_data",
    widgets: [],
  };

  return stringify(config);
};
