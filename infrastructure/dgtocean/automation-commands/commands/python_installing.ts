import { generateRemoteCommand } from "../utils/generateRemoteCommand";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";

interface RequiredVars {
  DROPLET_IP: string;
  DROPLET_PASSWORD: string;
}

export const PythonInstallingMethod = (requiredVars: RequiredVars) => {
  const { DROPLET_IP, DROPLET_PASSWORD } = requiredVars;

  const localPathRequirements = path.join(
    __dirname,
    "..",
    "droplet-files",
    "requirements.txt"
  );
  const remotePathRequirements = "/root/requirements.txt";

  // Define the droplet connection details
  const dropletConnection = {
    host: DROPLET_IP,
    user: "root",
    password: DROPLET_PASSWORD,
  };

  const executeRemoteCommand = generateRemoteCommand(dropletConnection);

  // Update system packages
  const updatePackages = executeRemoteCommand({
    command: "sudo apt-get update",
    description: "Update system packages",
    commandId: "updatePackagesPython",
  });

  // Install software-properties-common
  const installSoftwarePropertiesCommon = executeRemoteCommand(
    {
      command: "sudo apt-get install -y software-properties-common",
      description: "Install software-properties-common",
      commandId: "installSoftwarePropertiesCommon",
    },
    { dependsOn: updatePackages }
  );

  // Add deadsnakes PPA
  const addDeadsnakesPPA = executeRemoteCommand(
    {
      command: "sudo add-apt-repository -y ppa:deadsnakes/ppa",
      description: "Add deadsnakes PPA",
      commandId: "addDeadsnakesPPA",
    },
    { dependsOn: installSoftwarePropertiesCommon }
  );

  // Install Python 3.10.12 and associated packages
  const installPython310 = executeRemoteCommand(
    {
      command:
        "sudo apt-get install -y python3.10 python3.10-venv python3.10-dev",
      description: "Install Python 3.10.12 and associated packages",
      commandId: "installPython310",
    },
    { dependsOn: addDeadsnakesPPA }
  );

  // Install PIP for Python 3.10
  const installPip = executeRemoteCommand(
    {
      command: "curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10",
      description: "Install PIP for Python 3.10",
      commandId: "installPip",
    },
    { dependsOn: installPython310 }
  );

  // Copy requirements.txt to the remote droplet
  const copyRequirements = new command.remote.CopyToRemote(
    "copyRequirements",
    {
      connection: dropletConnection,
      source: new pulumi.asset.FileAsset(localPathRequirements),
      remotePath: remotePathRequirements,
    },
    { dependsOn: installPip }
  );

  // Install requirements from requirements.txt
  const installRequirements = executeRemoteCommand(
    {
      command: `python3.10 -m pip install -r ${remotePathRequirements}`,
      description: "Install requirements from requirements.txt",
      commandId: "installRequirements",
    },
    { dependsOn: copyRequirements }
  );

  return {
    updatePackages,
    installSoftwarePropertiesCommon,
    addDeadsnakesPPA,
    installPython310,
    installPip,
    copyRequirements,
    installRequirements,
  };
};
