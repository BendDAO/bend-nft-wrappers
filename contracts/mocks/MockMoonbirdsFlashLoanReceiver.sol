// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "../interfaces/IFlashLoanReceiver.sol";
import "../moonbirds/IMoonbirds.sol";

contract MockMoonbirdsFlashLoanReceiver is ERC721Holder, IFlashLoanReceiver {
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
        initiator;
        params;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (testFlag != 1) {
                IMoonbirds(asset).safeTransferWhileNesting(address(this), operator, tokenIds[i]);
            }
        }
        return true;
    }
}
