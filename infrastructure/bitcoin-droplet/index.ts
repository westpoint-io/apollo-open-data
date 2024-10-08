import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

// Import generated resources if they exist
let generatedResources: any = {};
if (fs.existsSync("./generated_resources.ts")) {
  generatedResources = require("./generated_resources");
}

const existingVolumeId = process.env.EXISTING_VOLUME_ID;
const existingDropletId = process.env.EXISTING_DROPLET_ID;

// Create or import volume
const bitcoinVolume =
  existingVolumeId && generatedResources.existingVolume
    ? generatedResources.existingVolume
    : new digitalocean.Volume(
        "bitcoin-volume",
        {
          region: "nyc1",
          size: 700,
          name: "bitcoin-automation-volume",
        },
        existingVolumeId ? { import: existingVolumeId } : undefined
      );

// Create or import droplet
const bitcoinDroplet =
  existingDropletId && generatedResources.existingDroplet
    ? generatedResources.existingDroplet
    : new digitalocean.Droplet(
        "bitcoin-droplet",
        {
          image: "ubuntu-20-04-x64",
          region: "nyc1",
          size: "s-4vcpu-8gb",
          name: "bitcoin-automation-node",
        },
        existingDropletId ? { import: existingDropletId } : undefined
      );

// Attach volume to droplet
const volumeAttachment = new digitalocean.VolumeAttachment(
  "bitcoin-volume-attachment",
  {
    dropletId: bitcoinDroplet.id,
    volumeId: bitcoinVolume.id,
  }
);

/*** Exports ***/
const volumeId = bitcoinVolume.id;
const volumeName = bitcoinVolume.name;

const dropletIp = bitcoinDroplet.ipv4Address;
const dropletId = bitcoinDroplet.id;

export { volumeId, volumeName, dropletIp, dropletId };
