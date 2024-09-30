import { Command, CopyToRemote } from "@pulumi/command/remote";
import { generateRemoteCommand } from "../utils/generateRemoteCommand";

interface RequiredVars {
  DROPLET_IP: string;
  DROPLET_PASSWORD: string;
}

export const SparkInstallingMethod = (
  requiredVars: RequiredVars,
  dependsOn?: Array<Command | CopyToRemote>
) => {
  const { DROPLET_IP, DROPLET_PASSWORD } = requiredVars;

  // Define the droplet connection details
  const dropletConnection = {
    host: DROPLET_IP,
    user: "root",
    password: DROPLET_PASSWORD,
  };

  const executeRemoteCommand = generateRemoteCommand(dropletConnection);

  // Update system packages
  const updatePackages = executeRemoteCommand(
    {
      command: "sudo apt update",
      description: "Update system packages",
      commandId: "updatePackagesSpark",
    },
    {
      dependsOn,
    }
  );

  // Install Java
  const installJava = executeRemoteCommand(
    {
      command: "sudo apt install -y default-jdk",
      description: "Install Java",
      commandId: "installJava",
    },
    { dependsOn: [updatePackages] }
  );

  // Install required packages
  const installRequiredPackages = executeRemoteCommand(
    {
      command: "sudo apt install -y curl mlocate git scala",
      description: "Install required packages",
      commandId: "installRequiredPackages",
    },
    { dependsOn: installJava }
  );

  // Download Apache Spark
  const downloadSpark = executeRemoteCommand(
    {
      command: `
        if [ ! -f spark-3.2.0-bin-hadoop3.2.tgz ]; then
          curl -O https://archive.apache.org/dist/spark/spark-3.2.0/spark-3.2.0-bin-hadoop3.2.tgz
        else
          echo "Spark archive already exists. Skipping download."
        fi
      `,
      description: "Download Apache Spark if not already present",
      commandId: "downloadSpark",
    },
    { dependsOn: installRequiredPackages }
  );

  // Extract Spark tarball
  const extractSpark = executeRemoteCommand(
    {
      command: `
        if [ ! -d spark-3.2.0-bin-hadoop3.2 ]; then
          sudo tar xvf spark-3.2.0-bin-hadoop3.2.tgz
        else
          echo "Spark directory already exists. Skipping extraction."
        fi
      `,
      description: "Extract Spark tarball if not already extracted",
      commandId: "extractSpark",
    },
    { dependsOn: downloadSpark }
  );

  // Create installation directory and move files
  const createSparkDir = executeRemoteCommand(
    {
      command: `
        if [ ! -d /opt/spark ]; then
          sudo mkdir /opt/spark
        fi
        sudo cp -R spark-3.2.0-bin-hadoop3.2/* /opt/spark
        sudo chmod -R 777 /opt/spark
      `,
      description: "Create installation directory, copy files, and set permissions",
      commandId: "createSparkDir",
    },
    { dependsOn: extractSpark }
  );

  // Update .bashrc
  const updateBashrc = executeRemoteCommand(
    {
      command: `
        if ! grep -q "SPARK_HOME=/opt/spark" ~/.bashrc; then
          echo 'export SPARK_HOME=/opt/spark' | sudo tee -a ~/.bashrc
          echo 'export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin' | sudo tee -a ~/.bashrc
          source ~/.bashrc
        else
          echo "Spark environment variables already set in .bashrc. Skipping update."
        fi
      `,
      description: "Update .bashrc if Spark environment variables are not set",
      commandId: "updateBashrc",
    },
    { dependsOn: createSparkDir }
  );


  return {
    updatePackages,
    installJava,
    installRequiredPackages,
    downloadSpark,
    extractSpark,
    createSparkDir,
    updateBashrc,
  };
};
