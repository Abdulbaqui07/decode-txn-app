import Web3 from 'web3';
import { readFile } from 'fs/promises';

// Define a type for the contract ABI (adjust as needed)
type ContractABI = any; // Replace `any` with a more specific type if available

const contractABI: ContractABI = JSON.parse(
    await readFile(new URL('../lib/contractABI.json', import.meta.url), 'utf-8')
);

const web3 = new Web3(new Web3.providers.HttpProvider(
    "https://mainnet.infura.io/v3/585178b4d49e49c59162eee163ccade8"
));

/**
 * Retrieves and decodes transaction logs.
 * @param {string} txHash - Transaction hash.
 * @returns {Promise<any[]>} - Decoded transaction logs.
 */
async function getLogsOfTxn(txHash: string): Promise<any[]> {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        return filterTxn(receipt);
    } catch (error) {
        console.error("Error fetching transaction receipt:", error);
        return [];
    }
}

/**
 * Filters transaction logs and identifies their types.
 * @param {any} txnObj - Transaction receipt object.
 * @returns {any[]} - Filtered logs with decoded data.
 */
function filterTxn(txnObj: any): any[] {
    return txnObj.logs.map((log: any) => transactionType(log));
}

/**
 * Identifies the type of Ethereum event in the log.
 * @param {any} log - Transaction log object.
 * @returns {any} - Decoded log details.
 */
function transactionType(log: any): any {
    // Hash signatures of known event types
    const eventTypes: { [key: string]: string } = {
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer",
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval",
        "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c": "Deposit",
        "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65": "Withdrawal",
        "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822": "Swap",
        "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1": "Sync"
    };

    const eventType = eventTypes[log.topics[0].toLowerCase()];
    
    switch (eventType) {
        case "Transfer": return transferEventFn(log);
        case "Approval": return approvalEventFn(log);
        case "Deposit": return "Deposit Event";
        case "Withdrawal": return withdrawalEventFn(log);
        case "Swap": return swapEventFn(log);
        case "Sync": return syncEventFn(log);
        default: return "Unknown Event";
    }
}

/**
 * Decodes Transfer event logs.
 */
function transferEventFn(log: any): any {
    const decoded = web3.eth.abi.decodeLog(
        [
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: false, name: "value", type: "uint256" }
        ],
        log.data,
        log.topics.slice(1) // Skipping the first topic (event signature)
    );

    return {
        "contract-address": log.address,
        "transaction-type": "Transfer",
        "value": decoded
    };
}

/**
 * Decodes Approval event logs.
 */
function approvalEventFn(log: any): any {
    const decoded = web3.eth.abi.decodeLog(
        [
            { indexed: true, name: "owner", type: "address" },
            { indexed: true, name: "spender", type: "address" },
            { indexed: false, name: "value", type: "uint256" }
        ],
        log.data,
        log.topics.slice(1)
    );

    return {
        "contract-address": log.address,
        "transaction-type": "Approval",
        "value": decoded
    };
}

/**
 * Decodes Sync event logs.
 */
function syncEventFn(log: any): any {
    const decoded = web3.eth.abi.decodeLog(
        [
            { name: "reserve0", type: "uint112" },
            { name: "reserve1", type: "uint112" }
        ],
        log.data,
        []
    );

    return {
        "contract-address": log.address,
        "transaction-type": "Sync",
        "value": decoded
    };
}

/**
 * Decodes Withdrawal event logs.
 */
function withdrawalEventFn(log: any): any {
    const decoded = web3.eth.abi.decodeLog(
        [
            { indexed: true, name: "src", type: "address" },
            { name: "wad", type: "uint256" }
        ],
        log.data,
        log.topics.slice(1)
    );

    return {
        "contract-address": log.address,
        "transaction-type": "Withdrawal",
        "value": decoded
    };
}

/**
 * Decodes Swap event logs.
 */
function swapEventFn(log: any): any {
    const decoded = web3.eth.abi.decodeLog(
        [
            { indexed: true, name: "sender", type: "address" },
            { name: "amount0In", type: "uint256" },
            { name: "amount1In", type: "uint256" },
            { name: "amount0Out", type: "uint256" },
            { name: "amount1Out", type: "uint256" },
            { indexed: true, name: "to", type: "address" }
        ],
        log.data,
        log.topics.slice(1)
    );

    return {
        "contract-address": log.address,
        "transaction-type": "Swap",
        "value": decoded
    };
}

/**
 * Retrieves contract name and symbol from an Ethereum contract.
 * @param {string} contractAddress - The contract address.
 * @returns {Promise<{name: string, symbol: string}>} - Contract details.
 */
async function getContractNameAndSymbol(contractAddress: string): Promise<{ name: string, symbol: string }> {
    try {
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const name: string = await contract.methods.name().call();
        const symbol: string = await contract.methods.symbol().call();
        return { name, symbol };
    } catch (error) {
        console.error(`Error fetching contract name/symbol for ${contractAddress}:`, error);
        return { name: "Unknown", symbol: "Unknown" };
    }
}

/**
 * Processes a transaction hash and adds contract metadata.
 * @param {string} txHash - The transaction hash.
 * @returns {Promise<any[]>} - Processed transaction details.
 */
export async function setContractName(txHash: string): Promise<any[]> {
    const decodedData = await getLogsOfTxn(txHash);
    console.log("Decoded Logs:", decodedData);

    return Promise.all(
        decodedData.map(async (log) => {
            const contractData = await getContractNameAndSymbol(log["contract-address"]);
            return {
                "contract-address": log["contract-address"],
                "contract-name": contractData.name,
                "contract-symbol": contractData.symbol,
                "transaction-type": log["transaction-type"],
                "value": log.value
            };
        })
    );
}

// Example usage (Uncomment to test)
// setContractName('0x24c1b2b6a4d1bc7f41dbba71a584ac2a4f123b32686364b9fc111b9b207215e2')
//     .then(result => console.log(result))
//     .catch(error => console.error(error));