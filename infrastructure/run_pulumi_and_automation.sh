#!/bin/bash


# Function to create or select a Pulumi stack and set the DigitalOcean token
write_db_credentials_to_json() {
    local path=$1

    echo "{" > $path
    echo "    \"PG_HOST\": \"$PG_HOST\"," >> $path
    echo "    \"PG_PASSWORD\": \"$PG_PASSWORD\"," >> $path
    echo "    \"PG_USER\": \"$PG_USER\"" >> $path
    echo "}" >> $path
}

create_or_select_stack() {
    local dir=$1
    local stack_name=$2
    
    cd $dir
    
    # Check if the stack already exists
    if pulumi stack ls | grep -q "$stack_name"; then
        echo "Stack $stack_name already exists. Selecting it."
        pulumi stack select $stack_name
    else
        echo "Creating new stack: $stack_name"
        pulumi stack init $stack_name
        pulumi stack select $stack_name
    fi

    # Check if the DigitalOcean token is set
    if ! pulumi config get digitalocean:token &> /dev/null; then
        echo "Setting DigitalOcean token."
        pulumi config set digitalocean:token $DIGITALOCEAN_TOKEN --secret
    else
        echo "DigitalOcean token is already set."
    fi
}

source .env

# Ensure DIGITALOCEAN_TOKEN is set
if [ -z "$DIGITALOCEAN_TOKEN" ]; then
    echo "Error: DIGITALOCEAN_TOKEN is not set."
    exit 1
fi

yarn
cd automation-commands && yarn

cd ../bitcoin-droplet && yarn && cd ../data-cluster && yarn & cd ..

# Deploy data-cluster
npx ts-node index.ts
source ./data-cluster/.env


sleep 5s

# Create or select stack for bitcoin-droplet
create_or_select_stack "bitcoin-droplet" "automated-bitcoin-droplet"

# Run pulumi up and capture the outputs
pulumi up --yes
bitcoin_outputs=$(pulumi stack output --json)

# Extract individual outputs from the JSON
DROPLET_IP=$(echo $bitcoin_outputs | jq -r '.dropletIp')
DROPLET_PASSWORD=$(echo $bitcoin_outputs | jq -r '.DROPLET_PASSWORD')
VOLUME_NAME=$(echo $bitcoin_outputs | jq -r '.volumeName')
RPC_USER=$(echo $bitcoin_outputs | jq -r '.RPC_USER')
RPC_PASSWORD=$(echo $bitcoin_outputs | jq -r '.RPC_PASSWORD')

echo $bitcoin_outputs

sleep 5s

# Create or select stack for automation-commands
create_or_select_stack "../automation-commands" "automated-automation-commands" # This function performs a CD into the directory

write_db_credentials_to_json "./droplet-files/database_credentials.json"

# Run the main_terminal_commands.ts script with the extracted environment variables
DROPLET_IP=$DROPLET_IP \
VOLUME_NAME=$VOLUME_NAME \
npx tsx ./cli.ts
