#! /bin/bash

install_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        echo "sshpass could not be found, installing..."
        if [ "$(uname)" == "Darwin" ]; then
            # MacOS
            brew install hudochenkov/sshpass/sshpass
        elif [ "$(uname)" == "Linux" ]; then
            # Linux
            sudo apt-get update
            sudo apt-get install -y sshpass
        else
            echo "Unsupported OS. Please install sshpass manually."
            exit 1
        fi
    fi
}

install_sshpass

echo "Enter the host:"
read host
echo "Enter the password:"
read -s password

echo "Connecting to SSH. You may be prompted to change your password."
echo "Follow the prompts and complete any required actions."
echo "------------------------------------------------------------"

sshpass -p "$password" ssh -o StrictHostKeyChecking=no root@$host

echo "------------------------------------------------------------"
echo "SSH session completed. If you changed your password, please make note of it."

