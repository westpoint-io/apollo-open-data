import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
import logging
import os
import json
import tempfile

load_dotenv()

# Create logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Bitcoin node's RPC details
rpc_user = os.getenv('RPC_USER')
rpc_password = os.getenv('RPC_PASSWORD')
rpc_host = os.getenv('RPC_HOST')
rpc_port = 8332
rpc_url = f"http://{rpc_host}:{rpc_port}"


class BitcoinRPC:
    def __init__(self):
        if not rpc_user or not rpc_password or not rpc_host:
            raise ValueError(
                "RPC_USER, RPC_PASSWORD, and RPC_HOST must be set")

        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(rpc_user, rpc_password)
        self.session.headers.update({'content-type': 'application/json'})

    def __call__(self, method, *params):
        payload = json.dumps({
            "method": method,
            "params": list(params),
            "jsonrpc": "2.0",
            "id": 0,
        })
        try:
            response = self.session.post(rpc_url, data=payload)
            response.raise_for_status()
            return response.json()['result']
        except requests.exceptions.RequestException as e:
            logger.error(f"RPC call failed: {str(e)}")
            raise

    def batch_(self, commands):
        payload = json.dumps([
            {"method": cmd[0], "params": cmd[1:], "jsonrpc": "2.0", "id": i}
            for i, cmd in enumerate(commands)
        ])
        try:
            response = self.session.post(rpc_url, data=payload)
            response.raise_for_status()

            return [r['result'] for r in response.json()]
        except requests.exceptions.RequestException as e:
            logger.error(f"RPC batch call failed: {str(e)}")
            raise

    def on_demand_batch_(self, commands):
        payload = json.dumps([
            {"method": cmd[0], "params": cmd[1:], "jsonrpc": "2.0", "id": i}
            for i, cmd in enumerate(commands)
        ])
        try:
            with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as temp_file:
                with requests.post(rpc_url, data=payload, auth=self.session.auth, headers=self.session.headers, stream=True) as response:
                    response.raise_for_status()
                    for chunk in response.iter_content(chunk_size=4096, decode_unicode=True):
                        temp_file.write(chunk)

                temp_file_path = temp_file.name

            with open(temp_file_path, 'r') as file:
                response_data = json.load(file)
                for item in response_data:
                    yield item['result']

        except requests.exceptions.RequestException as e:
            logger.error(f"RPC on-demand batch call failed: {str(e)}")
            raise
        finally:
            if 'temp_file_path' in locals():
                os.unlink(temp_file_path)


# Initial connection
rpc_connection = BitcoinRPC()


def recreate_rpc_connection():
    global rpc_connection
    logger.info("Recreating RPC connection....")
    rpc_connection = BitcoinRPC()
    logger.info("RPC connection recreated")
    return rpc_connection
