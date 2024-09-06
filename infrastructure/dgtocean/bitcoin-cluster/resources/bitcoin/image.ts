import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";

const stack = pulumi.getStack()

export const bitcoinImage = new docker.Image("bitcoin-image", {
    build: {
        context: path.join(__dirname, "../../docker/bitcoin"),
        dockerfile: path.join(__dirname, "../../docker/bitcoin/Dockerfile"),
        platform: "linux/amd64", // Specify the platform explicitly
    },
    imageName: `docker.io/jhonas8/custom-bitcoin:${stack}`,
    registry: {
        server: "docker.io",
        username: pulumi.secret(process.env.DOCKER_USERNAME as string),
        password: pulumi.secret(process.env.DOCKER_PASSWORD as string),
    },
});
