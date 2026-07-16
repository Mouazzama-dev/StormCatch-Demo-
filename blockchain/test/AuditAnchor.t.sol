// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AuditAnchor} from "../src/AuditAnchor.sol";

contract AuditAnchorTest is Test {
    AuditAnchor internal auditAnchor;

    address internal anchorer;
    address internal unauthorizedUser;

    bytes32 internal eventKey;
    bytes32 internal auditHash;

    string internal constant IPFS_CID = "bafkreiciiv4en6wuw2aelaladldlltblrgssdijmzdfxro7ubw5pthtmve";

    function setUp() public {
        anchorer = makeAddr("anchorer");
        unauthorizedUser = makeAddr("unauthorized-user");

        eventKey = keccak256(bytes("event-001"));

        auditHash = sha256(bytes("canonical-audit-json"));

        auditAnchor = new AuditAnchor(anchorer);
    }

    function test_AnchorAuditStoresProof() public {
        vm.prank(anchorer);

        auditAnchor.anchorAudit(eventKey, auditHash, IPFS_CID);

        AuditAnchor.Anchor memory storedAnchor = auditAnchor.getAnchor(eventKey);

        assertEq(storedAnchor.auditHash, auditHash);

        assertEq(storedAnchor.ipfsCid, IPFS_CID);

        assertEq(storedAnchor.submitter, anchorer);

        assertEq(uint256(storedAnchor.anchoredAt), block.timestamp);

        assertTrue(storedAnchor.exists);

        assertTrue(auditAnchor.isAnchored(eventKey));
    }

    function test_RevertWhenCallerIsUnauthorized() public {
        vm.expectRevert(abi.encodeWithSelector(AuditAnchor.Unauthorized.selector, unauthorizedUser));

        vm.prank(unauthorizedUser);

        auditAnchor.anchorAudit(eventKey, auditHash, IPFS_CID);
    }

    function test_RevertWhenEventAlreadyAnchored() public {
        vm.prank(anchorer);

        auditAnchor.anchorAudit(eventKey, auditHash, IPFS_CID);

        vm.expectRevert(abi.encodeWithSelector(AuditAnchor.AlreadyAnchored.selector, eventKey));

        vm.prank(anchorer);

        auditAnchor.anchorAudit(eventKey, auditHash, IPFS_CID);
    }
}
