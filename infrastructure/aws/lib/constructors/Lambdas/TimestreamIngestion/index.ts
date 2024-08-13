import { Duration, aws_logs as logs, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

interface IPostConfirmationProps {
    environment: string;
}

export class TimestreamIngestionLambda extends Construct {
    public readonly lambdaFn: Function;

    constructor(scope: Construct, id: string, props: IPostConfirmationProps) {
        super(scope, id);

        const lambdaPath = path.join(__dirname, 'handler.ts');
        const projectRoot = path.join(__dirname, '..', '..', '..', '..');

        this.lambdaFn = new NodejsFunction(this, 'ingest-timestream-db', {
            entry: lambdaPath,
            handler: 'handler',
            runtime: Runtime.NODEJS_18_X,
            timeout: Duration.seconds(60),
            environment: {
                ENVIRONMENT: props.environment,
                REGION: Stack.of(this).region
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
            bundling: {
                externalModules: ['@aws-sdk/*'],
            },
            projectRoot: projectRoot,
            // depsLockFilePath: path.join(projectRoot, 'yarn.lock'),
        });

        const createTablePolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['dynamodb:CreateTable'],
            resources: ['*']
        });

        this.lambdaFn.addToRolePolicy(createTablePolicy);

        // Policy Statement
        const iamPolicy = new PolicyStatement({
            actions: [
                'timestream:DescribeEndpoints',
                'timestream:CreateDatabase',
                'timestream:CreateTable',
                'cognito-idp:AdminAddUserToGroup',
                's3:ListBucket',
                's3:PutObject',
                's3:GetObjectAcl',
                's3:GetObject',
                's3:PutObjectVersionAcl',
                's3:GetObjectTagging',
                's3:DeleteObject',
                's3:GetBucketLocation',
                's3:PutObjectAcl',
                's3:PutObjectTagging'
            ],
            resources: ['*']
        });

        this.lambdaFn.addToRolePolicy(iamPolicy);

        // Add EventBridge rule to trigger the Lambda function daily
        new events.Rule(this, 'DailyTriggerRule', {
            schedule: events.Schedule.cron({ minute: '0', hour: '0' }), // Runs at 00:00 UTC every day
            targets: [new targets.LambdaFunction(this.lambdaFn)]
        });
    }
}
