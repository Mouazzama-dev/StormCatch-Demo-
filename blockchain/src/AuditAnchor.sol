// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StormCatch Audit Anchor
/// @notice Anchors authorization audit hashes and IPFS CIDs.
contract AuditAnchor {
    struct Anchor {
        bytes32 auditHash;
        string ipfsCid;
        address submitter;
        uint64 anchoredAt;
        bool exists;
    }

    address public immutable anchorer;

    mapping(bytes32 eventKey => Anchor anchor) private anchors;

    error InvalidAnchorer();
    error Unauthorized(address caller);
    error EmptyEventKey();
    error EmptyAuditHash();
    error EmptyIpfsCid();
    error AlreadyAnchored(bytes32 eventKey);

    event AuditAnchored(
        bytes32 indexed eventKey,
        bytes32 indexed auditHash,
        string ipfsCid,
        address indexed submitter,
        uint64 anchoredAt
    );

    modifier onlyAnchorer() {
        if (msg.sender != anchorer) {
            revert Unauthorized(msg.sender);
        }

        _;
    }

    constructor(address initialAnchorer) {
        if (initialAnchorer == address(0)) {
            revert InvalidAnchorer();
        }

        anchorer = initialAnchorer;
    }

    function anchorAudit(bytes32 eventKey, bytes32 auditHash, string calldata ipfsCid) external onlyAnchorer {
        if (eventKey == bytes32(0)) {
            revert EmptyEventKey();
        }

        if (auditHash == bytes32(0)) {
            revert EmptyAuditHash();
        }

        if (bytes(ipfsCid).length == 0) {
            revert EmptyIpfsCid();
        }

        if (anchors[eventKey].exists) {
            revert AlreadyAnchored(eventKey);
        }

        uint64 anchoredAt = uint64(block.timestamp);

        anchors[eventKey] = Anchor({
            auditHash: auditHash, ipfsCid: ipfsCid, submitter: msg.sender, anchoredAt: anchoredAt, exists: true
        });

        emit AuditAnchored(eventKey, auditHash, ipfsCid, msg.sender, anchoredAt);
    }

    function getAnchor(bytes32 eventKey) external view returns (Anchor memory) {
        return anchors[eventKey];
    }

    function isAnchored(bytes32 eventKey) external view returns (bool) {
        return anchors[eventKey].exists;
    }
}
