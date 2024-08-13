/* ---------- Types ---------- */
import { Build } from '../@types';

/* ---------- Stacks ---------- */
import { ApolloBitcoinStack } from '../../lib/stacks/apolloBitStack';

/* ---------- Functions ---------- */
export const buildAndDeployApolloStack = async ({
    app,
    environment
}: Build.BuildAndDeployPipelineStackDTO) => {
    const accountId = process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT;

    new ApolloBitcoinStack(app, `Apollo-${environment}-Stack`, {
        env: {
            account: accountId,
            region: process.env.CDK_DEFAULT_REGION,
        },
        environment
    });
};
