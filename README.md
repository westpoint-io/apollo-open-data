# Apollo Project

The Apollo Project is an open-source initiative designed to gather and analyze raw blocks and transaction data directly from a Bitcoin node. By leveraging a combination of cloud infrastructure, container orchestration, data streaming, and analytics tools, Apollo provides a robust platform for real-time blockchain data processing and visualization. The project aims to make it easier for developers, researchers, and enthusiasts to access, store, and analyze Bitcoin blockchain data efficiently.

At its core, Apollo utilizes a Digital Ocean Kubernetes cluster to manage its containerized services, ensuring scalability and reliability. Kafka is used as the data streaming platform to handle the continuous flow of blockchain data from the Bitcoin node. This data is then ingested by Mage, an open-source data pipeline tool, which processes and loads the data into TimescaleDB, a time-series optimized database built on PostgreSQL. Finally, Grafana is employed to create dashboards that visualize the data, providing insights into the Bitcoin network's behavior and trends over time.

Apollo’s architecture allows for flexible data collection and processing, enabling users to build custom applications or conduct in-depth analysis using raw blockchain data. Whether you're interested in tracking specific transaction patterns, monitoring network performance, or developing blockchain-based applications, Apollo provides the necessary tools and infrastructure to support your work.

To setup the Apollo Project, follow the instructions below to deploy the necessary infrastructure and services to your Digital Ocean account.

## Pulumi | Digital Ocean Setup

### Pulumi config

- First install the Pulumi CLI [here](https://www.pulumi.com/docs/install/)

- Start the stack by running `pulumi stack init <stack-name>`, for the example we can call it **dev**

### Digital Ocean API key

- Get your access token by accessing the API page from the digital ocean platform and generate a new token if you don't have one already, make sure to give the appropriate permissions.

- Insert this token as part of the stack env by running `pulumi config set --secret digitalocean:token <your-do-token>`

### Pulumi Stack

- Now to confirm everything is working run `pulumi up` and validate that it has a successful output.

### Kubernetes config

- After executing for the first time you can get the cluster config by running `pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml`. This should generate a new yaml file with the configuration.

- Run `export KUBECONFIG=$(pwd)/kubeconfig.yaml` and your `kubectl` commands will point to the digital ocean cluster.
