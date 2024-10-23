import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import * as generatedDns from "../generated_dns";

import { k8sProvider } from "./kubernetes/data-cluster";
import { digitalOceanProvider } from "./providers/digitalocean";

const extractDomain = (resourceId: string) => generatedDns?.existingDomain ?? digitalocean.Domain.get("existingDomain", resourceId, undefined, { provider: digitalOceanProvider })


export async function setupDNSAndCertificate(
    domainName: string,
    grafanaLbIp: string,
    resourceId?: string
) {
    // Create or get the domain

    const domain = resourceId
        ? extractDomain(resourceId)
        : new digitalocean.Domain("newDomain", { name: domainName }, { provider: digitalOceanProvider });

    // Create an A record for the Grafana dashboard
    const dashboardRecord = new digitalocean.DnsRecord("grafanaDashboardRecord", {
        domain: domain.name,
        type: "A",
        name: "dashboard",
        value: grafanaLbIp,
    }, { provider: digitalOceanProvider });

    // Create a Let's Encrypt certificate
    const certificateName = `grafana-cert-${domainName.replace('.', '-')}`;
    const certificate = new digitalocean.Certificate(certificateName, {
        name: certificateName,
        type: "lets_encrypt",
        domains: [`dashboard.${domainName}`],
    }, { provider: digitalOceanProvider });

    // Update Grafana service to use HTTPS and automatic SSL certificate
    const grafanaService = new k8s.core.v1.Service("grafana-service", {
        metadata: {
            name: "grafana",
            namespace: "grafana",
            annotations: {
                "service.beta.kubernetes.io/do-loadbalancer-protocol": "http",
                "service.beta.kubernetes.io/do-loadbalancer-tls-ports": "443",
                "service.beta.kubernetes.io/do-loadbalancer-certificate-name": certificate.name,
                "service.beta.kubernetes.io/do-loadbalancer-redirect-http-to-https": "true",
                "service.beta.kubernetes.io/do-loadbalancer-hostname": `dashboard.${domainName}`,
            },
        },
        spec: {
            type: "LoadBalancer",
            ports: [
                { name: "http", port: 80, targetPort: 3000 },
                { name: "https", port: 443, targetPort: 3000 },
            ],
            selector: {
                "app.kubernetes.io/name": "grafana",
                "app.kubernetes.io/instance": "grafana-helm",
            },
        },
    }, { provider: k8sProvider });

    return { domain, dashboardRecord, certificate, grafanaService };
}
