import os
import logging

from dotenv import load_dotenv
from typing import Union

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

url = os.getenv('SLACK_NOTIFICATION_WEBHOOK_ENDPOINT')

BLOCK_TYPE = Union[str, int]


def send_slack_message(message_content):
    from requests import post

    headers = {
        "Content-Type": "application/json"
    }

    if not url:
        logger.info(f"url: {url}")
        logger.error("SLACK_NOTIFICATION_WEBHOOK_ENDPOINT is not set")
        return

    post(url, headers=headers, data=message_content)


def send_error_message_to_slack(error_message: str, blocks_interval: tuple[BLOCK_TYPE, BLOCK_TYPE],):
    from json import dumps

    blocks_interval_str = f"Blocks {blocks_interval[0]} to {blocks_interval[1]}"

    custom_message = {
        "attachments": [
            {
                "color": "#FF0000",
                "title": f":rotating_light: RPC messaging failed. {blocks_interval_str}.\n",
                "text": f"\n{error_message}",
                "footer": "Triggered by RPC service",
            }
        ]
    }
    message_json = dumps(custom_message)

    send_slack_message(message_json)
