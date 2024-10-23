import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as util from 'util';
import { getEnvVar } from './src/utils/getEnvVar';
import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

const execAsync = util.promisify(exec);

dotenv.config();

const dnsResource = {
    env: 'EXISTING_DNS_DOMAIN',
    type: 'digitalocean:index/domain:Domain',
    staticName: 'existingDomain'
};

async function importDNS(resource: { env: string; type: string; staticName: string }) {
    const resourceId = await getEnvVar(resource.env);
    if (!resourceId) {
        console.log(`Skipping ${resource.env} as it's not set in .env`);
        return;
    }

    const command = `pulumi import ${resource.type} ${resource.staticName} ${resourceId} --yes`;
    console.log(`Running: ${command}`);

    try {
        const { stdout, stderr } = await execAsync(command);
        console.log('stdout:', stdout);
        console.error('stderr:', stderr);

        const constMatch = (stdout + stderr).match(/const\s+\w+\s*=\s*new[\s\S]*?\}\);/);
        if (constMatch) {
            let constCode = constMatch[0];
            constCode = constCode.replace(/const\s+\w+/, `const ${resource.staticName}`);
            const exportedCode = `export ${constCode}\n\n`;
            fs.appendFileSync('generated_dns.ts', exportedCode);
            console.log(`Appended generated code for ${resourceId} as ${resource.staticName} to generated_dns.ts`);
        } else {
            console.log(`No const statement found in the output for ${resourceId}`);
        }
    } catch (error: any) {
        console.error(`Error importing ${resourceId}:`, error);
        if (error.stdout) {
            const constMatch = error.stdout.match(/const\s+\w+\s*=\s*new[\s\S]*?\}\);/);
            if (constMatch) {
                let constCode = constMatch[0];
                constCode = constCode.replace(/const\s+\w+/, `const ${resource.staticName}`);
                const exportedCode = `export ${constCode}\n\n`;
                fs.appendFileSync('generated_dns.ts', exportedCode);
                console.log(`Appended generated code for ${resourceId} as ${resource.staticName} to generated_dns.ts (from error output)`);
            }
        }
    }
}

async function importOrCreateDashboardRecord(domain: string) {
    const grafanaLbIp = await getEnvVar("GRAFANA_LB_IP");
    if (!grafanaLbIp) {
        console.error("GRAFANA_LB_IP is not set in .env file");
        return;
    }

    const recordName = "dashboard";
    const command = `pulumi import digitalocean:index/dnsRecord:DnsRecord grafanaDashboardRecord dashboard.${domain} --yes`;

    try {
        await execAsync(command);
        console.log(`Imported existing A record for ${recordName}.${domain}`);
    } catch (error) {
        console.log(`A record for ${recordName}.${domain} not found. Creating a new one.`);
        const dashboardRecord = new digitalocean.DnsRecord("grafanaDashboardRecord", {
            domain: domain,
            type: "A",
            name: recordName,
            value: grafanaLbIp,
        });
        console.log(`Created new A record for ${recordName}.${domain} pointing to ${grafanaLbIp}`);
    }
}

async function main() {
    const existingDomain = await getEnvVar('EXISTING_DNS_DOMAIN');

    if (!existingDomain) {
        console.log('No existing DNS domain found. Please run "npm run setup-dns" first.');
        return;
    }

    const importStatements = `import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

`;

    let existingContent = '';
    if (fs.existsSync('generated_dns.ts')) {
        existingContent = fs.readFileSync('generated_dns.ts', 'utf8');
    }

    if (!existingContent.includes(importStatements.trim())) {
        fs.writeFileSync('generated_dns.ts', importStatements + existingContent);
        console.log('Added import statements to generated_dns.ts');
    } else {
        console.log('Import statements already exist in generated_dns.ts');
    }

    await importDNS(dnsResource);
    await importOrCreateDashboardRecord(existingDomain);

    console.log('DNS import process completed.');
}

main();
