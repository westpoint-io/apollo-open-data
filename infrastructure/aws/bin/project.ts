#!/usr/bin/env node
/* ---------- External ---------- */
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { config } from 'dotenv';

/* ---------- Helpers ---------- */
import { handleEnvironmentByChoice } from './helpers/handleEnvironmentByChoice';

/* ---------- Builders ---------- */
import { buildAndDeployApolloStack } from './stacks/apollo-stack';

/* ---------- Initial configuration ---------- */
config();

const app = new App();
const choice = app.node.tryGetContext('choice');

if (!choice) throw new Error('You need to choose a stack to build and deploy.');

const { environment } = handleEnvironmentByChoice(choice);

/* ----------
 *  Based on the choice, we build and deploy the stack.
 * ---------- */
const buildAndDeploy = async () => {
    if (choice.startsWith('APOLLO')) {
        await buildAndDeployApolloStack({ app, environment });

    }
};

buildAndDeploy();
