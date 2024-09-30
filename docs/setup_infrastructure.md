# Setup Infrastructure Guide

This guide will walk you through the process of setting up the infrastructure for your project. Follow the steps below to ensure everything is installed and configured correctly before you start the deploy.

## Prerequisites

At the moment all of the infrastructure code it's for Digital Ocean, so first make sure you have an active account in Digital Ocean, preferably with no resource limitations.

To run everything you'll need to install in your machine [Node.Js](https://nodejs.org/en/download/package-manager), [Yarn](https://yarnpkg.com/) and [Pulumi](https://www.pulumi.com/)

1. So you need to install NodeJs, we recommend using [nvm](https://nodejs.org/en/download/package-manager).
1. With NodeJs and npm available you can install yarn: `npm install -g yarn`.
1. Install pulumi following the [official documentation](https://www.pulumi.com/docs/iac/download-install/), make sure you can run `pulumi version` in your terminal to validate the installation.

## Step-by-Step Instructions

### 1. Digital Ocean Token

With a valid Digital Ocean account you should be able to create a Personal Access Token, follow the [official documentation](https://docs.digitalocean.com/reference/api/create-personal-access-token/). Once you have the token you can either run `export DIGITALOCEAN_TOKEN=<TOKEN>` or navigate to `infratructure/dgtocean`, create a new .env file and add `DIGITALOCEAN_TOKEN=<TOKEN>`

### 2. Run the Setup Command

Open your terminal and navigate to `infrastructure/dgtocean` directory, disconsider if you done this in the previous step. Then run the following command to start the setup process:

```
    yarn setup-infrastructure
```

### 3. Follow the Interactive CLI

An interactive CLI will appear. Follow the prompts and provide the required information:

1. Enter the password for Grafana
2. Enter the password for TimescaleDB

### 4. Data Cluster Deployment

The data cluster will be deployed automatically. A script will run to set up your database, including TimescaleDB tables and all necessary configurations.

### 5. Droplet and Volume Creation

The system will create:

- A new droplet
- A 700GB volume
- Attach the volume to the droplet

### 6. Automation Steps

The automation process will begin. You will be prompted to enter a DROPLET_PASSWORD. This step is crucial.

**Important:** If this is your FIRST TIME deploying the droplet, DigitalOcean will send an email to your registered email address with the following information:

### 7. Set Up Droplet SSH Password

In a SEPARATE terminal window, run the following command:

```
    yarn setup-droplet-ssh-password
```

You will be requested to type your current password (the one you just received on your email) and also set a new one.

Once it's done, you now have a valid droplet password.

### 8. Complete Automation

Return to the original terminal where you ran `yarn setup-infrastructure`. Enter the DROPLET_PASSWORD -that you just set- when prompted.

The automation process will continue, performing the following tasks on your droplet:

- Install necessary dependencies
- Set up Python and required external libraries
- Install Apache Spark and its dependencies
- Install Bitcoin Core
- Start the blockchain syncing process
- Begin pulling data from the blockchain

Congratulations! Your infrastructure is now set up and running.
