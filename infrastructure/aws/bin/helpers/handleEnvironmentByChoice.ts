// eslint-disable-next-line no-shadow
enum Environment {
    development = 'DEV',
    production = 'PROD',
}

type Stack = {
    environment: Environment;
    stack_name: string;
};

export const handleEnvironmentByChoice = (choice?: string): Stack => {
    if (!choice) throw new Error('Stack choice not defined');

    switch (choice) {
        case 'KUBERNETES-DEV':
        case 'PANORAMIQ-DEV':
        case 'MOCK-DEV':
        case 'DNS-DEV':
        case 'RAREINTEGRATION-DEV':
            return { environment: Environment.development, stack_name: 'Development' };

        case 'KUBERNETES-PROD':
        case 'PANORAMIQ-PROD':
        case 'DNS-PROD':
        case 'PIPELINE':
        case 'GOVERNANCE':
        case 'MOCK':
        case 'RAREINTEGRATION':
        case 'DOCS':
            return { environment: Environment.production, stack_name: 'Production' };

        default:
            throw new Error(`Stack choice "${choice}" is not allowed`);
    }
};
