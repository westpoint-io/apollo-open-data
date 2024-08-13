/* ---------- External ---------- */
import { config } from 'dotenv';
import axios from 'axios';
import { _Record, TimestreamWriteClient, WriteRecordsCommand, WriteRecordsCommandInput } from "@aws-sdk/client-timestream-write";

config();


export const handler = async () => {
    try {
        const timestreamClient = new TimestreamWriteClient({ region: process.env.REGION });
        const environment = process.env.ENVIRONMENT || ''
        // Fetch data from Blockchair API
        const response = await axios.get('https://api.blockchair.com/bitcoin/stats');
        const marketData = response.data.data;

        // Prepare records for Timestream
        const currentTime = Date.now().toString();
        const records: _Record[] = Object.entries(marketData).map(([key, value]) => ({
            MeasureName: key,
            MeasureValue: JSON.stringify(value),
            MeasureValueType: 'VARCHAR',
            Time: currentTime,
            Dimensions: [
                {
                    Name: 'metric',
                    Value: key
                }
            ]
        }));

        console.log(records)

        // Write to Timestream
        const params: WriteRecordsCommandInput = {
            DatabaseName: `apollo-${environment.toLowerCase()}-timestream-db`,
            TableName: `apollo-${environment.toLowerCase()}-timestream-table`,
            Records: records
        }

        await timestreamClient.send(new WriteRecordsCommand(params));

        console.log('Data successfully written to Timestream');
        return { message: 'Data ingestion successful' };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
