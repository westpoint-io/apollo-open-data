import json
import psycopg2
from typing import Dict, List, Union
from datetime import datetime, timezone


class MempoolTransaction:
    def __init__(self, txid: str, fee: int, weight: int, sigops: int):
        self.txid = txid
        self.fee = fee
        self.weight = weight
        self.sigops = sigops
        self.first_seen = datetime.now(timezone.utc)
        self.ancestors: List[str] = []
        self.descendants: List[str] = []


class MempoolManager:
    def __init__(self):
        self.mempool: Dict[str, MempoolTransaction] = {}
        self.db_connection = None

    def get_db_credentials(self):
        with open('/root/database_credentials.json', 'r') as f:
            return json.load(f)

    def connect_to_db(self):
        credentials = self.get_db_credentials()
        self.db_connection = psycopg2.connect(
            host=credentials['PG_HOST'],
            port='5432',
            dbname='postgres',
            user='postgres',
            password=credentials['PG_PASSWORD']
        )

    def add_transaction(self, tx: MempoolTransaction):
        self.mempool[tx.txid] = tx

    def remove_transaction(self, txid: str):
        if txid in self.mempool:
            del self.mempool[txid]

    def get_transaction(self, txid: str) -> Union[MempoolTransaction, None]:
        return self.mempool.get(txid)

    def get_all_transactions(self) -> List[MempoolTransaction]:
        return list(self.mempool.values())

    def update_mempool_from_node(self):
        # TODO: Implement method to fetch mempool data from Bitcoin node
        pass

    def save_mempool_state(self):
        if self.db_connection is None:
            self.connect_to_db()

        if self.db_connection is None:
            raise ValueError("Database connection not established")

        cursor = self.db_connection.cursor()
        for tx in self.mempool.values():
            cursor.execute("""
                INSERT INTO mempool_state (txid, fee, weight, sigops, first_seen)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (txid) DO UPDATE SET
                fee = EXCLUDED.fee,
                weight = EXCLUDED.weight,
                sigops = EXCLUDED.sigops,
                first_seen = EXCLUDED.first_seen
            """, (tx.txid, tx.fee, tx.weight, tx.sigops, tx.first_seen))

        self.db_connection.commit()

    def load_mempool_state(self):
        if self.db_connection is None:
            self.connect_to_db()

        if self.db_connection is None:
            raise ValueError("Database connection not established")

        cursor = self.db_connection.cursor()
        cursor.execute(
            "SELECT txid, fee, weight, sigops, first_seen FROM mempool_state")
        for row in cursor.fetchall():
            tx = MempoolTransaction(row[0], row[1], row[2], row[3])
            tx.first_seen = row[4]
            self.mempool[tx.txid] = tx

    def close_db_connection(self):
        if self.db_connection:
            self.db_connection.close()
            self.db_connection = None
