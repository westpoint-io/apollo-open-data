import * as pulumi from "@pulumi/pulumi";

import { MountVolumeMethod } from "./commands/mount_volume";
import { BitcoinCoreMethod } from "./commands/bitcoin_core";
import { SparkInstallingMethod } from "./commands/spark_installing";
import { PythonInstallingMethod } from "./commands/python_installing";
import { SendPythonScriptToDroplet } from "./commands/python_scripts";
const requiredVars = {
  DROPLET_PASSWORD: process.env.DROPLET_PASSWORD as string,
  DROPLET_IP: process.env.DROPLET_IP as string,
  VOLUME_NAME: process.env.VOLUME_NAME as string,
  RPC_USER: process.env.RPC_USER as string,
  RPC_PASSWORD: process.env.RPC_PASSWORD as string,
};

const mountVolumeMethod = MountVolumeMethod(requiredVars);
const pythonInstallingMethod = PythonInstallingMethod(requiredVars);
const sparkInstallingMethod = SparkInstallingMethod(
  requiredVars,
  Object.values(pythonInstallingMethod)
);
const pythonScriptsMethod = SendPythonScriptToDroplet(requiredVars);
const bitcoinCoreMethod = BitcoinCoreMethod(requiredVars, [
  ...Object.values(pythonScriptsMethod),
  ...Object.values(sparkInstallingMethod),
  ...Object.values(pythonInstallingMethod),
  ...Object.values(mountVolumeMethod),
]);

export {
  mountVolumeMethod,
  bitcoinCoreMethod,
  sparkInstallingMethod,
  pythonInstallingMethod,
  pythonScriptsMethod,
};
