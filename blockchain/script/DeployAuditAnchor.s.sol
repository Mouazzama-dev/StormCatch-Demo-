// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AuditAnchor} from "../src/AuditAnchor.sol";

contract DeployAuditAnchor is Script {
    function run() external returns (AuditAnchor auditAnchor) {
        address anchorer = vm.envAddress("AUDIT_ANCHORER_ADDRESS");

        vm.startBroadcast();

        auditAnchor = new AuditAnchor(anchorer);

        vm.stopBroadcast();
    }
}
