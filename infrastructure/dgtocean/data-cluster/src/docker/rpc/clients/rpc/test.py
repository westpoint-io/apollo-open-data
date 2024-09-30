from dotenv import load_dotenv
from typing import List
import logging
import datetime
import sys
import time
import psycopg2
from psycopg2.extras import execute_values
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
sys.path.append('/Users/matheusanciloto/Documents/westpoint/apollo-bitcoin/infrastructure/dgtocean/data-cluster/src/docker/rpc/')

from clients.rpc.main import rpc_connection
from utils.send_message import send_message

db_host = os.getenv('PG_HOST')
db_port = 5432
db_user = os.getenv('PG_USER')
db_password = os.getenv('PG_PASSWORD')
db_schema = os.getenv('PG_DB')

def fetch_blocks_in_parallel(commands, batch_size):
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for i in range(0, len(commands), batch_size):
            batch_commands = commands[i:i+batch_size]
            futures.append(executor.submit(rpc_connection.batch_, batch_commands))

        results = []
        for future in as_completed(futures):
            try:
                results.extend(future.result())
            except Exception as e:
                print(f"Error fetching blocks: {str(e)}")
                continue
        return results

def get_transactions_from_block(block_count: int, block_height: int, batch_size=50, max_batch_requests=400000):
    counter = 0

    from utils.convert_decimal import convert_decimal

    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_password,
        database=db_schema,
        sslmode='prefer'
    )
    conn.set_session(autocommit=False)
    
    with conn.cursor() as cursor:
        # Create a temporary table that will persist for the entire session
        cursor.execute("""
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_hashes 
            (hash TEXT PRIMARY KEY) ON COMMIT PRESERVE ROWS
        """)
        conn.commit()  # Commit the creation of the temporary table

    def check_missing_transactions(hashes: List[str]) -> List[str]:
        with conn.cursor() as cursor:
            # Clear the temporary table
            cursor.execute("TRUNCATE TABLE temp_hashes")
            
            # Insert new batch of hashes
            execute_values(cursor, "INSERT INTO temp_hashes (hash) VALUES %s ON CONFLICT DO NOTHING", 
                            [(hash,) for hash in hashes])
            
            # Perform a left join to find missing hashes
            cursor.execute("""
                SELECT t.hash 
                FROM temp_hashes t 
                LEFT JOIN raw_bitcoin_transactions r ON t.hash = r.tx_hash 
                WHERE r.tx_hash IS NULL
            """)
            return [row[0] for row in cursor.fetchall()]

    for start_height in range(block_height, block_count + 1, max_batch_requests):
        end_height = min(start_height + max_batch_requests - 1, block_count)
        try:
            print("started the for loop over blocks")
            # Get block hashes in batch
            commands = [["getblockhash", height]
                        for height in range(start_height, end_height + 1)]
            
            print(f"started to fetch block hashes -> {time.time()}")
            block_hashes = rpc_connection.batch_(commands)
            print(f"fetched block hashes -> {time.time()}")
            
            fetch_commands = [["getblock", h, 2] for h in block_hashes]
            print(f"started to fetch blocks -> {time.time()}")
            blocks = fetch_blocks_in_parallel(fetch_commands, batch_size)
            print(f"fetched blocks -> {time.time()}")

            tx_data = {}
            hashes = []

            for block in blocks:
                counter += len(block['tx'])
                for tx in block['tx']:
                    hashes.append(tx['hash'])
                    data = {
                        'tx': {
                            **tx,
                            'hex': tx['hex'] if len(tx['hex']) < 256 else None,
                        },
                        'timestamp': block['time']
                    }
                    
                    tx_data[tx['hash']] = data
            print(f"looking for missing transactions -> {time.time()}")

            missing_hashes = check_missing_transactions(hashes)
            print(f"found missing {missing_hashes} -> {time.time()}")

            for hash in missing_hashes:
                tx_info = tx_data[hash]
                data = {
                    'type': 'transaction',
                    'data': tx_info['tx'],
                    'timestamp': tx_info['timestamp']
                }
                
                kafka_message = {
                    **convert_decimal(data),
                    'sent_at': datetime.datetime.utcnow().isoformat()
                }
                
                
                # print(kafka_message)
                try:
                    send_message("raw-btc-transactions-backfill", kafka_message)
                except Exception as e:
                    import json
                    with open('message_failed.json', 'w') as f:
                        json.dump(data, f)
                    
                    raise e
                        


            # Process blocks in smaller batches
            # for i in range(0, len(block_hashes), batch_size):
            #     batch_hashes = block_hashes[i:i+batch_size]

            #     # Get full blocks in batch
            #     commands = [["getblock", h, 2] for h in batch_hashes]

            #     print(f"started to fetch blocks -> {time.time()}")
            #     blocks = rpc_connection.batch_(commands)
            #     print(f"fetched blocks -> {time.time()}")

            #     tx_data = {}
            #     hashes = []

            #     for block in blocks:
            #         counter += len(block['tx'])

            #         for tx in block['tx']:
            #             hashes.append(tx['hash'])
            #             tx_data[tx['txid']] = {
            #                 'tx': tx,
            #                 'block': block
            #             }

            #     print(f"started to check missing transactions -> {time.time()}")
            #     missing_hashes = check_missing_transactions(hashes)
            #     print(f"found missing {missing_hashes} -> {time.time()}")
                
            #     for hash in missing_hashes:
            #         tx_info = tx_data[hash]
            #         data = {
            #             'type': 'transaction',
            #             'data': tx_info['tx'],
            #             'timestamp': tx_info['block']['time']
            #         }
            #         print(data)
                        
            #         kafka_message = {
            #             **convert_decimal(data),
            #             'sent_at': datetime.datetime.utcnow().isoformat()
            #         }
            #         send_message("raw-btc-transactions", kafka_message)

        except Exception as e:
            print(e)
            logging.error(
                f"Error processing blocks {start_height}-{end_height}: {str(e)}")
            continue

    return counter

def test_kafka_retention_policy():
    try:
        message = {
            'data': {
                'hash': 1,
            },
            'timestamp': datetime.datetime.now().timestamp(),
        }
        
        send_message("raw-btc-", message)

    except Exception as e:
        print(e)
        

def daily_total(day: str):
    import requests
    base_url = "https://api.blockchair.com/bitcoin/blocks"
    
    first_request = requests.get(f"{base_url}?q=time({day})&s=time(asc)")
    
    first_block = first_request.json()['data'][0]['id']
    
    last_request = requests.get(f"{base_url}?q=time({day})&s=time(desc)")
    
    last_block = last_request.json()['data'][0]['id']

    transactions_total = get_transactions_from_block(last_block, first_block, 10, 400000)

    print("total transactions: ", transactions_total)

# daily_total("2012-11-06")

# test_kafka_retention_policy()

def rebalance_all_days():
    dates = ["2013-03-06", "2013-03-13", "2013-03-14", "2013-03-16", "2013-03-17", "2013-03-23", "2013-03-24", "2013-03-25", "2013-03-26", "2013-03-27", "2013-03-28", "2013-03-29", "2013-03-30", "2013-03-31", "2013-04-02", "2013-04-04", "2013-04-05", "2013-04-06", "2013-04-08", "2013-04-10", "2013-04-11", "2013-04-15", "2013-04-16", "2013-04-17", "2013-04-21", "2013-04-22", "2013-04-29",]     
    for date in dates:
        time.sleep(2)
        daily_total(date)

rebalance_all_days()
