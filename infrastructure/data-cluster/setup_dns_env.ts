import { getEnvVar, setEnvVar } from "./src/utils/getEnvVar";

const setupDNSEnvVars = async () => {
    const hasDomain = await getEnvVar("HAS_DOMAIN");
    await setEnvVar("HAS_DOMAIN", hasDomain);

    if (hasDomain.toLowerCase() === "yes") {
        const resourceId = await getEnvVar("Enter the resource ID of your DigitalOcean domain:");
        let domainName = await getEnvVar("Enter your domain name:");
        await setEnvVar("DOMAIN_RESOURCE_ID", resourceId);
        await setEnvVar("DOMAIN_NAME", domainName);
        return;
    } else {
        const createDomain = await getEnvVar("Do you want to create a new domain? (yes/no)");
        if (createDomain.toLowerCase() === "yes") {
            const domainName = await getEnvVar("Enter the domain name you want to create:");
            await setEnvVar("DOMAIN_NAME", domainName);
            return;
        }
    }
}

setupDNSEnvVars();
