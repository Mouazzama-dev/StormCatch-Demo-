EADME.md


# StormCatch Chat-Based Authorization Demo

A warehouse robot authorization demo built with Veramo, Express, IPFS, Foundry, and the Sepolia test network.

The application presents the authorization process as an interactive conversation between a warehouse robot and the StormCatch Authorization Gateway. The robot proves its identity using a DID, presents an AI Identity Credential, responds to a fresh challenge, and receives a policy-based `APPROVE` or `REJECT` decision.

Every authorization decision is written to an audit log, hashed with SHA-256, uploaded to IPFS, and anchored on a Sepolia smart contract.

## Features

- Decentralized robot identities using `did:ethr:sepolia`
- AI Identity Credential issuance and verification
- Robot-signed Verifiable Presentations
- One-time authorization challenges
- Replay-attack protection
- Policy-based authorization decisions
- JWT-protected Express APIs
- Persistent JSONL audit logs
- Canonical JSON and SHA-256 audit hashing
- IPFS publishing through Pinata
- Sepolia smart-contract anchoring
- Interactive warehouse authorization story UI

## Project Structure

```text
.
├── backend/
│   └── src/
│       ├── config/        Authentication and backend configuration
│       ├── middleware/    Bearer-token authentication middleware
│       ├── routes/        Express API routes
│       └── services/      Audit, IPFS, blockchain, and token services
│
├── blockchain/
│   ├── src/               AuditAnchor smart contract
│   ├── test/              Foundry smart-contract tests
│   ├── script/            Sepolia deployment script
│   └── foundry.toml       Foundry configuration
│
├── frontend/
│   ├── index.html         Demo page structure
│   ├── styles.css         Demo styling
│   └── app.js             Interactive story and API calls
│
├── src/
│   ├── authorization/     Challenge, VP verification, and policy logic
│   ├── credentials/       AI Identity Credential logic
│   ├── scripts/           Identity and demo scripts
│   └── veramo/            Veramo agent, DID, KMS, and database setup
│
├── data/
│   └── veramo.sqlite      Local Veramo identity and credential database
│
├── .env.example           Environment variable template
├── package.json           Node.js scripts and dependencies
└── README.md
```

Runtime audit files are created inside:

```text
backend/data/
```

These JSONL files are excluded from Git:

```text
authorization-decisions.jsonl
authorization-audits.jsonl
ipfs-audit-proofs.jsonl
blockchain-audit-proofs.jsonl
```

## Requirements

- Node.js 22 or later
- npm
- Foundry
- A Sepolia RPC endpoint
- A Sepolia wallet with test ETH
- A Pinata account for IPFS uploads

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/Stormcatch/Chat-based-Demo.git
cd Chat-based-Demo
npm install
```

Create the local environment file:

```bash
cp .env.example .env
```

Fill in the required values inside `.env`.

Important environment variables include:

```env
KMS_SECRET_KEY=
SEPOLIA_RPC_URL=

JWT_SIGNING_SECRET=
JWT_TOKEN_TTL_SECONDS=600
DEMO_CLIENT_ID=robot-demo-client
DEMO_CLIENT_SECRET=

PINATA_JWT=
PINATA_GATEWAY_URL=

SEPOLIA_DEPLOYER_PRIVATE_KEY=
AUDIT_ANCHORER_ADDRESS=
AUDIT_ANCHOR_CONTRACT_ADDRESS=
AUDIT_ANCHOR_DEPLOYMENT_TX_HASH=
SEPOLIA_CHAIN_ID=11155111
```

Never commit the `.env` file or expose wallet private keys, API tokens, or client secrets.

## Run the Application

Check the TypeScript code:

```bash
npm run typecheck
```

Start the Express backend:

```bash
npm run backend
```

The API will run at:

```text
http://127.0.0.1:3000
```

Health check:

```text
http://127.0.0.1:3000/health
```

## Open the Demo UI

After starting the backend, open:

```text
http://127.0.0.1:3000/demo/
```

Enter the configured `DEMO_CLIENT_SECRET`, choose an action, and start the authorization story.

Available scenarios:

```text
scan-inventory  → expected APPROVE
move-container  → expected REJECT
```

The UI displays the robot DID, credential details, challenge, requested action, verification results, policy decision, audit hash, IPFS CID, and Sepolia transaction proof.

## Authorization Flow

```text
Client requests an access token
            ↓
Gateway loads the robot identity and credential
            ↓
Gateway asks the robot to prove its identity
            ↓
A fresh one-time challenge is issued
            ↓
Robot creates a signed Verifiable Presentation
            ↓
Gateway verifies the VP, VC, DID, and challenge
            ↓
Warehouse policy evaluates the requested action
            ↓
APPROVE or REJECT
            ↓
Decision is written to an append-only JSONL audit log
            ↓
Canonical JSON and SHA-256 hash are created
            ↓
Complete audit proof is uploaded to IPFS
            ↓
Audit hash and IPFS CID are anchored on Sepolia
```

A robot capability does not automatically mean the action is permitted. For example, a robot may technically support `move-container`, but the warehouse policy can still reject that action.

## Main API Endpoints

```http
GET  /health
POST /api/v1/auth/token
GET  /api/v1/demo/robot
POST /api/v1/authorization/challenges
POST /api/v1/demo/robot/presentations
POST /api/v1/authorization/requests
GET  /api/v1/authorization/requests/:requestId
GET  /api/v1/audits/:requestId
GET  /api/v1/audits/:requestId/verify
POST /api/v1/audits/:requestId/publish
POST /api/v1/audits/:requestId/anchor
```

Protected endpoints require:

```http
Authorization: Bearer <access-token>
```

## Smart Contract

The Foundry project is located inside:

```text
blockchain/
```

Compile the contract:

```bash
cd blockchain
forge build
```

Run the tests:

```bash
forge test
```

The `AuditAnchor` contract stores:

- Event key
- SHA-256 audit hash
- IPFS CID
- Submitter address
- Blockchain timestamp

The complete authorization record is stored on IPFS rather than directly onchain.

## Security Notes

- Access tokens control which backend APIs a client may call.
- The robot DID and Verifiable Presentation prove the robot identity.
- The Verifiable Credential contains trusted claims about the robot.
- A fresh challenge prevents replay attacks.
- Policy evaluation determines whether an action is permitted.
- JSONL records preserve authorization history.
- SHA-256 detects local record modification.
- IPFS stores the complete audit proof.
- Sepolia provides independent tamper evidence for the hash and CID