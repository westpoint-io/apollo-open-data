# Apollo Project

The Apollo Project is an open-source initiative designed to gather and analyze data from multiple crypto chains. By leveraging cloud infrastructure, container orchestration, data streaming, and analytics tools, Apollo provides a robust platform for real-time chain data processing and visualization.

The project aims to make it easier for developers, researchers, and enthusiasts to access, store, and analyze Crypto chain data efficiently. At this moment we're focusing on Bitcoin blockchain and will later expand.

<br>

# How does Apollo work?

Apollo uses technologies such as Kafka, Mage, TimescaleDB and Grafana to have real-time blockchain data flowing to the dashboard, see the diagram below:

![image](https://github.com/user-attachments/assets/9907b088-8154-45f5-b315-c30b76cf26e0)

## Technologies docs

Check the docs below to understand how we use each technology in the Apollo project:

<table>
  <tr>
    <td><h4><a href="https://github.com/apollo-open-data/apollo-bitcoin/blob/main/docs/mage.md">Mage 🧙</a></h4></td>
    <td><h4><a href="https://github.com/apollo-open-data/apollo-bitcoin/blob/main/docs/timescale.md">TimescaleDB 🦁</a></h4></td>
    <td><h4><a href="https://github.com/apollo-open-data/apollo-bitcoin/blob/main/docs/grafana.md">Grafana 📊</a></h4></td>
  </tr>
</table>

<br>

# Host Apollo yourself

Apollo infrastructure code is written with Pulumi and hosted in Digital Ocean, but if you want to host you own version make sure to follow the instructions below.

## Pulumi | Digital Ocean Setup

### Pulumi config

- First, install the Pulumi CLI [here](https://www.pulumi.com/docs/install/)

- Start the stack by running `pulumi stack init <stack-name>`

### Digital Ocean API key

- Get your access token by accessing the API page from the Digital Ocean platform and generate a new token if you don't have one already, make sure to give the appropriate permissions.

- Insert this token as part of the stack env by running `pulumi config set --secret digitalocean:token <your-do-token>`

### Pulumi Stack

- Now to deploy everything run `pulumi up` and validate that it has a successful output. If you have any issues in the process feel free to add an issue.

<br>

# Contributors

We're actively looking for new contributors, if you're interested let's connect via [Discord](https://discord.gg/QRVAjSFK).
