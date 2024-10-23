import * as pulumi from "@pulumi/pulumi";

export const generateResourceId = (resourceName: string) => {
  const stack = pulumi.getStack();
  return `${stack}-${resourceName}`;
};
