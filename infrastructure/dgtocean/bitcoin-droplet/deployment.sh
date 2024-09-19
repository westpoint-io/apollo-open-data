#!/bin/bash

# Load and export variables from .env file
set -a
source .env
set +a

# Run import script
npm run pulumi:import

# Run Pulumi deployment
npm run pulumi:deploy
