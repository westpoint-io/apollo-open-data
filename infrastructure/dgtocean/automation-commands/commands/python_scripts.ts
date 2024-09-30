import * as pulumi from "@pulumi/pulumi";
import * as path from "path";
import * as command from "@pulumi/command";

interface RequiredVars {
    DROPLET_IP: string;
    DROPLET_PASSWORD: string;
}

export const SendPythonScriptToDroplet = (requiredVars: RequiredVars) => {
    const { DROPLET_IP, DROPLET_PASSWORD } = requiredVars;

    // Define the droplet connection details
    const dropletConnection = {
        host: DROPLET_IP,
        user: "root",
        password: DROPLET_PASSWORD,
    };

    const localScriptPath = path.join(
        __dirname,
        "..",
        "droplet-files",
        "blockchain_data_handler.py"
    );
    const remoteScriptPath = "/root/blockchain_data_handler.py";


    const localDatabaseCredentialsPath = path.join(
        __dirname,
        "..",
        "droplet-files",
        "database_credentials.json"
    );
    const remoteDatabaseCredentialsPath = "/root/database_credentials.json";

    // Copy requirements.txt to the remote droplet
    const copyDatabaseCredentials = new command.remote.CopyToRemote(
        "copyDatabaseCredentials",
        {
            connection: dropletConnection,
            source: new pulumi.asset.FileAsset(localDatabaseCredentialsPath),
            remotePath: remoteDatabaseCredentialsPath,
        },
    );

    // Copy requirements.txt to the remote droplet
    const copyScript = new command.remote.CopyToRemote(
        "copyScript",
        {
            connection: dropletConnection,
            source: new pulumi.asset.FileAsset(localScriptPath),
            remotePath: remoteScriptPath,
        },
    );

    return {
        copyDatabaseCredentials,
        copyScript,
    };
};
