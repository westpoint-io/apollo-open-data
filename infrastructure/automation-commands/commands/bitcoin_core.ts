import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import { generateRemoteCommand } from "../utils/generateRemoteCommand";
import { Command, CopyToRemote } from "@pulumi/command/remote";

interface RequiredVars {
    DROPLET_IP: string;
    DROPLET_PASSWORD: string;
    RPC_USER: string;
    RPC_PASSWORD: string;
}

export const BitcoinCoreMethod = (requiredVars: RequiredVars, dependencies: Array<Command | CopyToRemote>) => {

    const { DROPLET_IP, DROPLET_PASSWORD, RPC_USER, RPC_PASSWORD } = requiredVars;

    // Define the droplet connection details
    const dropletConnection = {
        host: DROPLET_IP,
        user: "root",
        password: DROPLET_PASSWORD,
    };

    const executeRemoteCommand = generateRemoteCommand(dropletConnection);

    // Define the data directory path
    const dataDir = "/mnt/bitcoin_automation_volume/bitcoin";

    const remoteScriptPath = "/root/blockchain_data_handler.py";

    // Check if Bitcoin Core is already installed
    const checkBitcoinInstalled = executeRemoteCommand({
        command: `
            if bitcoin-cli -datadir=${dataDir} getblockchaininfo &>/dev/null; then
                echo 'bitcoin installed and running'
                echo 'installed' >> /tmp/bitcoin_installed
            else
                echo 'not installed or not running'
                echo 'not installed' >> /tmp/bitcoin_installed
            fi
        `,
        description: "Check if Bitcoin Core is installed and running",
        commandId: "checkBitcoinInstalledAction",
    }, { dependsOn: dependencies });

    // Conditional download and installation of Bitcoin Core
    const downloadBitcoinCore = executeRemoteCommand({
        command: `
            if [[ $(cat /tmp/bitcoin_installed) == 'not installed' ]]; then
                wget https://bitcoin.org/bin/bitcoin-core-25.0/bitcoin-25.0-x86_64-linux-gnu.tar.gz
                tar -xzvf bitcoin-25.0-x86_64-linux-gnu.tar.gz
                sudo cp bitcoin-25.0/bin/* /usr/local/bin/
                rm -rf bitcoin-25.0 bitcoin-25.0-x86_64-linux-gnu.tar.gz
                echo 'Bitcoin Core installed'
            else
                echo 'Bitcoin Core already installed, skipping download and installation'
            fi
        `,
        description: "Download and install Bitcoin Core if not already installed",
        commandId: "downloadBitcoinCoreAction",
    }, { dependsOn: checkBitcoinInstalled });

    // Create directory for Bitcoin data and configuration
    const createBitcoinDataDir = executeRemoteCommand({
        command: `mkdir -p ${dataDir}`,
        description: "Create directory for Bitcoin data and configuration",
        commandId: "createBitcoinDataDirAction",
    }, { dependsOn: downloadBitcoinCore });

    // Create bitcoin.conf file
    const createBitcoinConf = executeRemoteCommand({
        command: `echo 'datadir=${dataDir}\nrpcuser=${RPC_USER}\nrpcpassword=${RPC_PASSWORD}\nrpcport=8332\nrpcallowip=127.0.0.1\nserver=1' | sudo tee ${dataDir}/bitcoin.conf`,
        description: "Create bitcoin.conf file",
        commandId: "createBitcoinConfAction",
    }, { dependsOn: createBitcoinDataDir });

    // Check if Bitcoin Core is running and start it if not
    const checkAndStartBitcoinDaemon = executeRemoteCommand({
        command: `
            if bitcoin-cli -datadir=${dataDir} getblockchaininfo &>/dev/null; then
                echo "Bitcoin Core is already running"
            else
                bitcoind -datadir=${dataDir} -daemon
                echo "Started Bitcoin Core daemon"
            fi
        `,
        description: "Check if Bitcoin Core is running and start it if not",
        commandId: "checkAndStartBitcoinDaemon",
    }, { dependsOn: createBitcoinConf });

    // Check if the Spark job is running, stop it if it is, and start a new instance
    const manageSparkJob = executeRemoteCommand({
        command: `PYSPARK_PYTHON=python3.10 nohup spark-submit ${remoteScriptPath} > spark_output.log 2>&1 &`,
        description: "Manage Spark job (stop existing and start new)",
        commandId: "manageSparkJobAction",
    }, { dependsOn: checkAndStartBitcoinDaemon });

    return {
        checkBitcoinInstalled,
        downloadBitcoinCore,
        createBitcoinDataDir,
        createBitcoinConf,
        checkAndStartBitcoinDaemon,
        manageSparkJob,
    }
}

