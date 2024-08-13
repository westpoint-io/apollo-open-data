import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TimestreamDB } from '../constructors/Timestream';
import { TimestreamIngestionLambda } from '../constructors/Lambdas/TimestreamIngestion';
import { FrontendConstruct } from '../constructors/Cloudfront';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface IProps extends cdk.StackProps {
  environment: 'DEV' | 'PROD';
}

export class ApolloBitcoinStack extends cdk.Stack {
  public readonly timestreamDB: TimestreamDB;
  public readonly timestreamIngestionLambda: TimestreamIngestionLambda;
  public readonly frontendConstruct: FrontendConstruct

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);


    this.timestreamDB = new TimestreamDB(this, 'TimestreamDB', {
      environment: props.environment
    });

    this.timestreamIngestionLambda = new TimestreamIngestionLambda(this, 'TimestreamIngestionLambda', {
      environment: props.environment
    });

    this.frontendConstruct = new FrontendConstruct(this, 'FrontendConstruct', {
      environment: props.environment
    });
  }
}
