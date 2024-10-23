from mempool_manager import MempoolManager
from block_predictor import BlockPredictor, run_bitcoin_cli
from block_auditor import BlockAuditor
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    mempool_manager = MempoolManager()
    block_predictor = BlockPredictor(mempool_manager)
    block_auditor = BlockAuditor(mempool_manager)

    current_height = int(run_bitcoin_cli(['getblockcount'], is_json=False))

    while True:
        try:
            # Predict next block
            predicted_block = block_predictor.predict_next_block()
            block_predictor.save_prediction(predicted_block)

            # Wait for the next block to be mined
            new_height = current_height
            while new_height == current_height:
                time.sleep(10)
                new_height = int(run_bitcoin_cli(
                    ['getblockcount'], is_json=False))

            # Get the actual mined block
            actual_block = block_predictor.get_actual_block(new_height)

            # Audit the block
            audit_results = block_auditor.audit_block(
                actual_block, predicted_block)
            block_auditor.save_audit_results(new_height, audit_results)

            logger.info(
                f"Processed block {new_height}. Accuracy: {audit_results['accuracy']:.2f}")

            current_height = new_height

        except Exception as e:
            logger.error(f"Error in main loop: {str(e)}")
            time.sleep(60)


if __name__ == "__main__":
    main()
