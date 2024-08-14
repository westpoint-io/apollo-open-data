export interface IBlockProps {
  pipeline_name: string;
  all_upstream_blocks_executed: boolean;
  upstream_blocks: string[];
  downstream_blocks: string[];
  executor_type: string;
  type: string;
  extension: string;
}

export interface IPipelineFiles {
  path: string;
  filename: string;
  extension: string;
  content: string;
  folder?: string;
}
