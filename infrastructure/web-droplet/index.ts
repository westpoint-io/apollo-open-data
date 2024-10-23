import * as digitalocean from "@pulumi/digitalocean";
import * as path from "path";
import * as std from "@pulumi/std";
import * as os from "os";

const appName = "web-deployment";
const homeDir = os.homedir();
const sshKeyDir = path.join(homeDir, ".ssh", "web", "id_rsa.pub");

const _default = new digitalocean.SshKey("default", {
  name: `${appName}-ssh-key`,
  publicKey: std
    .file({
      input: sshKeyDir,
    })
    .then((invoke) => invoke.result),
});

new digitalocean.Droplet(appName, {
  name: appName,
  image: "ubuntu-22-04-x64",
  region: "nyc1",
  size: "s-1vcpu-2gb",
  sshKeys: [_default.fingerprint],
});
