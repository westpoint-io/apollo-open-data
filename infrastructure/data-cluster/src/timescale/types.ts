type TableColumns = {
  name: string;
  type: string;
};

type Constraint = {
  name: string;
  columns: string[];
};

export interface ITable {
  name: string;
  columns: TableColumns[];
  constraint: Constraint;
  hypertable?: {
    columnName: string;
  };
}

export interface IContinuousAggregates {
  name: string;
  query: string;
}

export interface IAggregatePolicies {
  name: string;
  startOffset: string;
  endOffset: string;
  scheduleInterval: string;
}

export interface ICommandsFile {
  tables: ITable[];
  continuous_aggregates: IContinuousAggregates[];
  aggregate_policies: IAggregatePolicies[];
}
