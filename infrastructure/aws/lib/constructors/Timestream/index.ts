import { Construct } from "constructs";
import * as timestream from "aws-cdk-lib/aws-timestream";

interface IProps {
    environment: 'DEV' | 'PROD';
}

export class TimestreamDB extends Construct {
    public readonly database: timestream.CfnDatabase;
    public readonly table: timestream.CfnTable;

    constructor(scope: Construct, id: string, props: IProps) {
        super(scope, id);

        // Create Timestream database
        this.database = new timestream.CfnDatabase(this, 'TimestreamDatabase', {
            databaseName: `apollo-${props.environment.toLowerCase()}-timestream-db`,
        });

        // Create Timestream table
        this.table = new timestream.CfnTable(this, 'TimestreamTable', {
            databaseName: this.database.ref,
            tableName: `apollo-${props.environment.toLowerCase()}-timestream-table`,
            retentionProperties: {
                memoryStoreRetentionPeriodInHours: "24",
                magneticStoreRetentionPeriodInDays: "7",
            },
        });

        this.table.addDependency(this.database);
    }
}
