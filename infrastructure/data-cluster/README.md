# Pulumi | Digital Ocean Setup

## Pulumi config

- First install the Pulumi CLI [here](https://www.pulumi.com/docs/install/)

- Start the stack by running `pulumi stack init <stack-name>`, for the example we can call it **dev**

## Digital Ocean API key

- Get your access token by accessing the API page from the digital ocean platform and generate a new token if you don't have one already, make sure to give the appropriate permissions.

- Insert this token as part of the stack env by running `pulumi config set --secret digitalocean:token <your-do-token>`

## Pulumi Stack

- Now to confirm everything is working run `pulumi up` and validate that it has a successful output.

## Kubernetes config

- After executing for the first time you can get the cluster config by running `pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml`. This should generate a new yaml file with the configuration.

- Run `export KUBECONFIG=$(pwd)/kubeconfig.yaml` and your `kubectl` commands will point to the digital ocean cluster.

## S3-based Bitcoin Cluster Setup

To set up the S3-based Bitcoin cluster:

1. Make sure you have the necessary AWS IAM role and permissions set up.

2. Set the AWS configuration in the Pulumi configuration:

   ```
   pulumi config set aws:region us-east-1
   pulumi config set aws:roleArn arn:aws:iam::891377248877:role/OrganizationAccountAccessRole
   pulumi config set s3BucketName <your-s3-bucket-name>
   ```

3. Run `pulumi up` to create the new S3-based Bitcoin cluster and deploy the necessary resources.

4. After deployment, you can access the new cluster using:

   ```
   pulumi stack output bitcoinClusterS3TestKubeconfig > kubeconfig-s3-test.yaml
   export KUBECONFIG=$(pwd)/kubeconfig-s3-test.yaml
   ```

5. Verify the deployment with `kubectl get pods` and `kubectl get pvc` to ensure the Bitcoin pod is running and the S3-backed volume is correctly mounted.

Note: Make sure the IAM role has the necessary permissions to access the S3 bucket and perform the required operations.
