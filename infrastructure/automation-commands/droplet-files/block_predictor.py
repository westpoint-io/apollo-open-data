from typing import List, Dict
from mempool_manager import MempoolManager, MempoolTransaction
from datetime import datetime, timezone
import subprocess
import json
import logging

BLOCK_WEIGHT_LIMIT = 4_000_000
BLOCK_SIGOPS_LIMIT = 80_000
BLOCK_DIR = "/mnt/bitcoin_automation_volume/bitcoin"

logger = logging.getLogger(__name__)


def run_bitcoin_cli(command: List[str], is_json=True):
    full_command = ['bitcoin-cli', f'-datadir={BLOCK_DIR}'] + command
    result = subprocess.run(
        full_command, capture_output=True, text=True, check=True)
    if is_json:
        return json.loads(result.stdout)
    return result.stdout.strip()


class BlockPredictor:
    def __init__(self, mempool_manager: MempoolManager):
        self.mempool_manager = mempool_manager

    def update_mempool(self):
        try:
            raw_mempool = run_bitcoin_cli(['getrawmempool', 'true'])
            for txid, tx_info in raw_mempool.items():
                tx = MempoolTransaction(
                    txid=txid,
                    # Convert BTC to satoshis
                    fee=int(tx_info['fee'] * 100000000),
                    weight=tx_info['weight'],
                    sigops=tx_info.get('sigops', 0)
                )
                self.mempool_manager.add_transaction(tx)

            logger.info(
                f"Updated mempool with {len(raw_mempool)} transactions")
        except Exception as e:
            logger.error(f"Error updating mempool: {str(e)}")

    def predict_next_block(self) -> List[MempoolTransaction]:
        self.update_mempool()
        transactions = self.mempool_manager.get_all_transactions()
        transactions.sort(key=lambda tx: tx.fee / tx.weight, reverse=True)

        block_transactions: List[MempoolTransaction] = []
        total_weight = 0
        total_sigops = 0

        for tx in transactions:
            if total_weight + tx.weight <= BLOCK_WEIGHT_LIMIT and total_sigops + tx.sigops <= BLOCK_SIGOPS_LIMIT:
                block_transactions.append(tx)
                total_weight += tx.weight
                total_sigops += tx.sigops
            else:
                break

        return block_transactions

    def save_prediction(self, predicted_block: List[MempoolTransaction]):
        if not self.mempool_manager.db_connection:
            self.mempool_manager.connect_to_db()

        if not self.mempool_manager.db_connection:
            logger.error("Failed to connect to the database")
            return

        cursor = self.mempool_manager.db_connection.cursor()
        prediction_time = datetime.now(timezone.utc)

        try:
            for i, tx in enumerate(predicted_block):
                cursor.execute("""
                    INSERT INTO predicted_blocks (prediction_time, txid, position, fee, weight)
                    VALUES (%s, %s, %s, %s, %s)
                """, (prediction_time, tx.txid, i, tx.fee, tx.weight))

            self.mempool_manager.db_connection.commit()
            logger.info(
                f"Saved prediction with {len(predicted_block)} transactions")
        except Exception as e:
            logger.error(f"Error saving prediction: {str(e)}")
            self.mempool_manager.db_connection.rollback()

    def get_actual_block(self, block_height: int) -> List[str]:
        try:
            block_hash = run_bitcoin_cli(
                ['getblockhash', str(block_height)], is_json=False)
            block = run_bitcoin_cli(['getblock', block_hash, '1'])
            return block['tx']
        except Exception as e:
            logger.error(f"Error getting actual block: {str(e)}")
            return []
