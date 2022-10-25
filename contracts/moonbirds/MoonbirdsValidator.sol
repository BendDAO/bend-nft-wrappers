// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IWrapperValidator, IERC721Metadata} from "../interfaces/IWrapperValidator.sol";

import {IMoonbirds} from "./IMoonbirds.sol";

contract MoonbirdsValidator is IWrapperValidator, Ownable {
    IERC721Metadata public immutable override underlyingToken;
    IMoonbirds public immutable moonbirds;

    constructor(address underlyingToken_, uint256[] memory data_) {
        data_;

        underlyingToken = IERC721Metadata(underlyingToken_);
        moonbirds = IMoonbirds(address(underlyingToken_));
    }

    function isValid(address collection, uint256 tokenId) external view returns (bool) {
        require(collection == address(underlyingToken), "MoonbirdsValidator: collection mismatch");
        (bool nesting, , ) = moonbirds.nestingPeriod(tokenId);
        return nesting;
    }
}
