import * as command from "@pulumi/command";
import { CustomResourceOptions } from "@pulumi/pulumi";

interface ExecuteRemoteCommandProps {
    command: string;
    description: string;
    commandId: string;
}

interface CommandConnection {
    host: string;
    user: string;
    password: string;
}

export function generateRemoteCommand(connection: CommandConnection) {
    const remoteConnection = connection;

    return (props: ExecuteRemoteCommandProps, opts?: CustomResourceOptions) => {
        console.log(`**** ${props.description} ****`);

        return new command.remote.Command(props.commandId, {
            connection: remoteConnection,
            create: props.command,
        }, opts);
    }
}
