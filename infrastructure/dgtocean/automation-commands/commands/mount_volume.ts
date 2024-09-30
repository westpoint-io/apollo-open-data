import { generateRemoteCommand } from "../utils/generateRemoteCommand";

interface RequiredVars {
    DROPLET_IP: string;
    DROPLET_PASSWORD: string;
    VOLUME_NAME: string;
}

export const MountVolumeMethod = (requiredVars: RequiredVars) => {
    const { DROPLET_IP, DROPLET_PASSWORD, VOLUME_NAME } = requiredVars;

    // Define the droplet connection details
    const dropletConnection = {
        host: DROPLET_IP,
        user: "root",
        password: DROPLET_PASSWORD,
    };

    const executeRemoteCommand = generateRemoteCommand(dropletConnection);

    const checkMounted = executeRemoteCommand({
        command: `mountpoint -q /mnt/bitcoin_automation_volume || echo "not_mounted"`,
        description: "Check if the volume is already mounted",
        commandId: "checkMounted",
    });

    // Format the volume (first time only, if not mounted)
    const formatVolume = executeRemoteCommand({
        command: `if [ "$(cat /tmp/check_mounted)" = "not_mounted" ]; then sudo mkfs.ext4 /dev/disk/by-id/scsi-0DO_Volume_${VOLUME_NAME}; else echo "Volume already mounted, skipping format"; fi`,
        description: "Format the volume if not mounted",
        commandId: "formatVolume",
    }, { dependsOn: checkMounted });

    // Create a mount point for the volume
    const createMountPoint = executeRemoteCommand({
        command: "mkdir -p /mnt/bitcoin_automation_volume",
        description: "Create a mount point for the volume",
        commandId: "createMountPoint",
    }, { dependsOn: formatVolume });

    // Mount the volume at the newly-created mount point if not already mounted
    const mountVolume = executeRemoteCommand({
        command: `if [ "$(cat /tmp/check_mounted)" = "not_mounted" ]; then mount -o discard,defaults,noatime /dev/disk/by-id/scsi-0DO_Volume_${VOLUME_NAME} /mnt/bitcoin_automation_volume; else echo "Volume already mounted, skipping mount"; fi`,
        description: "Mount the volume at the newly-created mount point if not already mounted",
        commandId: "mountVolume",
    }, { dependsOn: createMountPoint });

    // Update fstab to mount the volume after a reboot
    const updateFstab = executeRemoteCommand({
        command: `echo '/dev/disk/by-id/scsi-0DO_Volume_${VOLUME_NAME} /mnt/bitcoin_automation_volume ext4 defaults,nofail,discard 0 0' | sudo tee -a /etc/fstab`,
        description: "Update fstab to mount the volume after a reboot",
        commandId: "updateFstab",
    }, { dependsOn: mountVolume });

    return {
        formatVolume,
        createMountPoint,
        mountVolume,
        updateFstab,
    }
}

