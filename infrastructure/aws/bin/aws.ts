#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApolloBitcoinStack } from '../lib/stacks/apolloBitStack';

const app = new cdk.App();
new ApolloBitcoinStack(app, 'ApolloBitcoinStack', {
  environment: process.env.ENVIRONMENT as "DEV" | "PROD"
});
