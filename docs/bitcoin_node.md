# Bitcoin Node ₿

We have a Linux 22.04 droplet deployed in Digital ocean that serves to synch the bitcoin blockchain. This droplet also contains a volume of 750gb attached to it,
at the moment the complete synch uses around 650Gb.

## Volume mount

If you want to deploy on your own using the same structure consider this step, otherwise you may go to the next session.

Since we attach an external volume to the droplet we need to mount, so first you run `lsblk` to see the volumes available, the output would be something like this:

```bash
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0     7:0    0 63.9M  1 loop /snap/core20/2318
loop1     7:1    0   87M  1 loop /snap/lxd/28373
loop2     7:2    0 38.8M  1 loop /snap/snapd/21759
sda       8:0    0  750G  0 disk /mnt/volume_nyc1_02
vda     252:0    0   80G  0 disk
├─vda1  252:1    0 79.9G  0 part /
├─vda14 252:14   0    4M  0 part
└─vda15 252:15   0  106M  0 part /boot/efi
vdb     252:16   0  474K  1 disk
```

Next you'll need to create a new partition, I've used fdisk for this:

```bash
sudo fdisk /dev/sda
```

Format the partition

```bash
sudo mkfs.ext4 /dev/sda1
```

We need to create a mount point (folder) and mount the partition

```bash
sudo mkdir -p /mnt/bitcoin_data
sudo mount /dev/sda1 /mnt/bitcoin_data
```

As a last step we need to update fstab, to ensure it mounts automatically on boot

```bash
echo '/dev/sda1 /mnt/bitcoin_data ext4 defaults 0 2' | sudo tee -a /etc/fstab
```

# Bitcoin core

Assuming you already have a mount point with enough space, we need to download and start bitcoin core now, to download and extract do the following:

```bash
wget https://bitcoin.org/bin/bitcoin-core-25.0/bitcoin-25.0-x86_64-linux-gnu.tar.gz
```

```bash
tar -xzvf bitcoin-25.0-x86_64-linux-gnu.tar.gz
```

You need to copy binaries for your user local bin, making the cli available on the terminal:

```bash
sudo cp bitcoin-25.0/bin/* /usr/local/bin/
```

Next I create a folder to keep the bitcoin conf and the binaries data, and configure the rpc server

```bash
mkdir -p /mnt/bitcoin_data/bitcoin
sudo nano /mnt/bitcoin_data/bitcoin/bitcoin.conf

datadir=/mnt/bitcoin_data/bitcoin
rpcuser=yourrpcuser
rpcpassword=yourrpcpassword
rpcport=8332
rpcallowip=127.0.0.1
server=1
```

This is it, now you can run bitcoind to start the synch: `bitcoind -datadir=/mnt/bitcoin_data/bitcoin -daemon`

And follow the progress with `bitcoin-cli -datadir=/mnt/bitcoin_data/bitcoin getblockchaininfo`
