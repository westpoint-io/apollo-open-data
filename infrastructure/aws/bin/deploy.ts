/* ---------- External ---------- */
import chalk from 'chalk';
import { spawn } from 'child_process';
import { prompt } from 'enquirer';

/* ---------- Logs helpers ---------- */
const error_log = chalk.bold.redBright;
const info_log = chalk.bold.blueBright;
const success_log = chalk.bold.greenBright;

/* ---------- Interfaces ---------- */
interface Environment {
    action: string;
    aws_account: string;
    environment: string;
    stack: string;
}

/* ---------- Functions ---------- */
const deploy = async () => {
    let action = '';
    let tempStack = '';
    let stack = '';

    const stacks = [
        'apollo'
    ];
    const environments = ['development', 'staging', 'production'];

    /* ----------
     * Get the environment input from
     * the user
     * ---------- */

    const environment: Environment = await prompt([
        {
            choices: ['deploy', 'diff'],
            message: 'What do you want to do?',
            name: 'action',
            type: 'select',
            result: (value: string) => (action = value)
        },
        {
            choices: stacks,
            message: `Which stack do you want to ${action}?`,
            name: 'stack',
            type: 'select',
            result: (value: string) => (tempStack = value)
        },
        {
            choices: environments,
            message: 'What environment do you want to deploy?',
            name: 'environment',
            type: 'select'
        },
        {
            choices: ['apollo-org'],
            message: 'What is your AWS account name?',
            name: 'aws_account',
            type: 'select'
        }
    ]);

    /* ----------
     * Check if the user wants to deploy
     * all stacks or just one
     * ---------- */
    stack += environment.stack.toUpperCase();

    /* ----------
     * Check which environment the user
     * wants to deploy
     * ---------- */
    switch (environment.environment) {
        case 'development':
            stack += '-DEV';
            break;
        case 'production':
            stack += '-PROD';
            break;

        default:
            break;
    }

    /* ----------
     * If no stack is selected,
     * exit the function
     * ---------- */
    if (!stack) throw new Error('Please select a stack to deploy');

    let command = '';

    const settings = `export AWS_PROFILE=${environment.aws_account} && export AWS_REGION=$(aws configure get region) && ACCOUNT_ID=$(aws sts get-caller-identity | jq .Account | tr -d '"')`;

    if (environment.action === 'diff')
        command = `${settings} && cdk diff --all -c choice=${stack}`;
    else {
        command = `${settings} && cdk deploy --all -c choice=${stack} --require-approval never`;

        console.log(
            info_log(
                `\n\nDeploying ${environment.stack} stack in ${environment.environment} environment using ${environment.aws_account} account\n`
            )
        );
    }

    /* ----------
     * Spawn the cdk deploy command
     * in a new process
     * ---------- */
    const terminal = spawn(command, { shell: true, stdio: 'inherit' });

    /* ----------
     * Printing child process output to the console
     * ---------- */
    terminal.on('message', (message) => {
        console.log(message);
    });

    /* ----------
     * Printing success or error messages
     * when the child process ends
     * ---------- */
    terminal.on('error', () => {
        console.log(error_log('Failed to deploy stack, please check your credentials.'));
    });

    terminal.on('close', () => {
        console.log(success_log('Stack deployed successfully!'));
    });
};

deploy();
