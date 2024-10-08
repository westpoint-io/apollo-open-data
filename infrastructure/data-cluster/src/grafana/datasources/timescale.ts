import * as pulumi from "@pulumi/pulumi";
import { config } from "dotenv";
import { timescaleIp } from "../../timescale";

config();

export const timescaleDatasource = {
    name: "DS_TIMESCALEDB",
    type: "postgres",
    url: pulumi.interpolate`${timescaleIp}:5432`,
    user: "postgres",
    secureJsonData: {
        password: process.env.PG_PASSWORD,
    },
    database: "postgres",
    isDefault: true,
    jsonData: {
        sslmode: "disable",
        timescaledb: true,
        postgresVersion: 1500,
    },
};
