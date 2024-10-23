from typing import List, Dict
from datetime import datetime, timezone
from mempool_manager import MempoolManager, MempoolTransaction


class BlockAuditor:
    def __init__(self, mempool_manager: MempoolManager):
        self.mempool_manager = mempool_manager

    def audit_block(self, actual_block: List[str], predicted_block: List[MempoolTransaction]) -> Dict:
        actual_set = set(actual_block)
        predicted_set = set(tx.txid for tx in predicted_block)

        matches = actual_set.intersection(predicted_set)
        added = actual_set - predicted_set
        missing = predicted_set - actual_set

        return {
            "matches": list(matches),
            "added": list(added),
            "missing": list(missing),
            "accuracy": len(matches) / len(actual_block) if actual_block else 0
        }

    def save_audit_results(self, block_height: int, audit_results: Dict):
        if not self.mempool_manager.db_connection:
            self.mempool_manager.connect_to_db()

        if not self.mempool_manager.db_connection:
            return

        cursor = self.mempool_manager.db_connection.cursor()
        audit_time = datetime.now(timezone.utc)

        cursor.execute("""
            INSERT INTO block_audits (block_height, audit_time, matches, added, missing, accuracy)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (block_height, audit_time, len(audit_results['matches']), len(audit_results['added']),
              len(audit_results['missing']), audit_results['accuracy']))

        self.mempool_manager.db_connection.commit()
