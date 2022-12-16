// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IWrapperValidator, IERC721Metadata} from "../interfaces/IWrapperValidator.sol";

import {IMoonbirds} from "./IMoonbirds.sol";

contract MoonbirdsValidator is IWrapperValidator, Ownable {
    IERC721Metadata public immutable override underlyingToken;

    constructor(address underlyingToken_) {
        underlyingToken = IERC721Metadata(underlyingToken_);
    }

    function isValid(address collection, uint256 tokenId) external view returns (bool) {
        require(collection == address(underlyingToken), "MoonbirdsValidator: collection mismatch");
        (bool nesting, , ) = IMoonbirds(address(underlyingToken)).nestingPeriod(tokenId);
        return nesting;
    }
}
