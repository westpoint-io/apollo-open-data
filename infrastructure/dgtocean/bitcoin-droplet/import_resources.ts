import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as util from 'util';
import { getEnvVar } from './utils/getEnvVar';

const execAsync = util.promisify(exec);

dotenv.config();

const resources = [
    { env: 'EXISTING_VOLUME_ID', type: 'digitalocean:index/volume:Volume', staticName: 'existingVolume' },
    { env: 'EXISTING_DROPLET_ID', type: 'digitalocean:index/droplet:Droplet', staticName: 'existingDroplet' },
];

async function importResource(resource: { env: string; type: string; staticName: string }) {
    const resourceId = await getEnvVar(resource.env);
    if (!resourceId) {
        console.log(`Skipping ${resource.env} as it's not set in .env`);
        return;
    }

    const command = `pulumi import ${resource.type} ${resourceId} ${resourceId} --yes`;
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
            fs.appendFileSync('generated_resources.ts', exportedCode);
            console.log(`Appended generated code for ${resourceId} as ${resource.staticName} to generated_resources.ts`);
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
                fs.appendFileSync('generated_resources.ts', exportedCode);
                console.log(`Appended generated code for ${resourceId} as ${resource.staticName} to generated_resources.ts (from error output)`);
            }
        }
    }
}

async function main() {
    const importStatements = `import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

`;

    let existingContent = '';
    if (fs.existsSync('generated_resources.ts')) {
        existingContent = fs.readFileSync('generated_resources.ts', 'utf8');
    }

    if (!existingContent.includes(importStatements.trim())) {
        fs.writeFileSync('generated_resources.ts', importStatements + existingContent);
        console.log('Added import statements to generated_resources.ts');
    } else {
        console.log('Import statements already exist in generated_resources.ts');
    }

    for (const resource of resources) {
        await importResource(resource);
    }

    console.log('Import process completed.');
}

main();
