// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "../interfaces/IFlashLoanReceiver.sol";

contract MockFlashLoanReceiver is ERC721Holder, IFlashLoanReceiver {
    uint256 public testFlag;

    // 1: don't return token
    function setTestFlag(uint256 flag) public {
        testFlag = flag;
    }

    function executeOperation(
        address asset,
        uint256[] calldata tokenIds,
        address initiator,
        address operator,
        bytes calldata params
    ) public returns (bool) {
        tokenIds;
        initiator;
        params;

        if (testFlag != 1) {
            IERC721Metadata(asset).setApprovalForAll(operator, true);
        }
        return true;
    }
}
