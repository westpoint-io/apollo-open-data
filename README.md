# Apollo Project

The Apollo Project is an open-source initiative designed to gather and analyze raw blocks and transaction data directly from a Bitcoin node. By leveraging cloud infrastructure, container orchestration, data streaming, and analytics tools, Apollo provides a robust platform for real-time blockchain data processing and visualization. The project aims to make it easier for developers, researchers, and enthusiasts to access, store, and analyze Bitcoin blockchain data efficiently.

# How does Apollo work?
Apollo uses technologies such as Kafka, Mage, TimescaleDB and Grafana to have real-time blockchain data flowing to the dashboard, see the diagram below:

![image](https://github.com/user-attachments/assets/9907b088-8154-45f5-b315-c30b76cf26e0)

# How to deploy Apollo on your own
Apollo infrastructure code is written with Pulumi and hosted in Digital Ocean, but if you want to host you own version make sure to follow the instructions below.

## Pulumi | Digital Ocean Setup

### Pulumi config

- First, install the Pulumi CLI [here](https://www.pulumi.com/docs/install/)

- Start the stack by running `pulumi stack init <stack-name>`, for this example we can call it **dev**

### Digital Ocean API key

- Get your access token by accessing the API page from the Digital Ocean platform and generate a new token if you don't have one already, make sure to give the appropriate permissions.

- Insert this token as part of the stack env by running `pulumi config set --secret digitalocean:token <your-do-token>`

### Pulumi Stack

- Now to deploy everything run `pulumi up` and validate that it has a successful output. If you have any issues in the process feel free to add an issue.
