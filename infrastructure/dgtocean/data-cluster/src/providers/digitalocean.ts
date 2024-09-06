import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

const config = new pulumi.Config("digitalocean");
const token = config.requireSecret("token");

// Create a custom DigitalOcean provider
export const digitalOceanProvider = new digitalocean.Provider("do-provider", {
  token: token,
});
